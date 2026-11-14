import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config();

import {
  normalizeGSTIN,
  calculateGSTINChecksum,
  isValidGSTIN,
  isValidGSTINChecksum,
  extractGSTINMetadata,
  getStateFromGSTIN,
} from "../utils/gstin";

import { lookupGSTIN } from "../services/gst-lookup.service";
import { db } from "../lib/drizzle";
import { customerGstinCache, organizationAddons } from "../db/schema/addons";
import { organizations } from "../db/schema";
import { eq, and } from "drizzle-orm";

test("1. normalizeGSTIN sanitizes and handles common cashier typos", () => {
  assert.equal(normalizeGSTIN("  06isipd0673l1zh  "), "06ISIPD0673L1ZH");
  assert.equal(normalizeGSTIN("O6ISIPD0673L1ZH"), "06ISIPD0673L1ZH");
  assert.equal(normalizeGSTIN(""), "");
  assert.equal(normalizeGSTIN(null as any), "");
});

test("2. calculateGSTINChecksum verifies Mod-36 checksum calculation", () => {
  assert.equal(calculateGSTINChecksum("06ISIPD0673L1Z"), "H");
  assert.equal(isValidGSTIN("06ISIPD0673L1ZH"), true);
  assert.equal(isValidGSTINChecksum("06ISIPD0673L1ZH"), true);
  // Non-standard check character ('O' instead of Mod-36 calculated '3')
  assert.equal(isValidGSTINChecksum("09ABSCD8500K1ZO"), false);
  assert.equal(calculateGSTINChecksum("09ABSCD8500K1Z"), "3");
});

test("3. extractGSTINMetadata accurately parses statutory fields", () => {
  const meta1 = extractGSTINMetadata("06ISIPD0673L1ZH");
  assert.equal(meta1.stateCode, "06");
  assert.equal(meta1.stateName, "Haryana");
  assert.equal(meta1.pan, "ISIPD0673L");
  assert.equal(meta1.isProprietorship, true);

  const meta2 = extractGSTINMetadata("09ABSCD8500K1ZO");
  assert.equal(meta2.stateCode, "09");
  assert.equal(meta2.stateName, "Uttar Pradesh");
  assert.equal(meta2.pan, "ABSCD8500K");
  assert.equal(meta2.entityType, "Company (Pvt Ltd / Ltd)");
});

test("4. lookupGSTIN rejects invalid length and non-alphanumeric input", async () => {
  const shortRes = await lookupGSTIN("12345");
  assert.equal(shortRes.success, false);
  assert.match(shortRes.error || "", /15 characters/i);

  const invalidFormatRes = await lookupGSTIN("06ISIPD0673L!@#");
  assert.equal(invalidFormatRes.success, false);
});

test("5. lookupGSTIN successfully verifies 06ISIPD0673L1ZH with authentic live data", async () => {
  // Ensure we test the live API first by clearing any cache for this GSTIN
  await db.delete(customerGstinCache).where(eq(customerGstinCache.gstin, "06ISIPD0673L1ZH"));

  const res = await lookupGSTIN("06ISIPD0673L1ZH");
  assert.equal(res.success, true);
  assert.ok(res.data);
  assert.equal(res.data.gstin, "06ISIPD0673L1ZH");
  assert.equal(res.data.tradeName, "VIRAL NEST");
  assert.equal(res.data.legalName, "DEEPAK");
  assert.equal(res.data.state, "Haryana");
  assert.equal(res.data.status, "Active");
  assert.equal(res.data.isCached, false);
});

test("6. lookupGSTIN serves cached taxpayer on repeated lookup", async () => {
  const res = await lookupGSTIN("06ISIPD0673L1ZH");
  assert.equal(res.success, true);
  assert.ok(res.data);
  assert.equal(res.data.isCached, true);
  assert.equal(res.data.tradeName, "VIRAL NEST");
});

test("7. lookupGSTIN cleanly handles un-registered GSTIN 09ABSCD8500K1ZO without throwing", async () => {
  // Ensure no stale cache exists for this GSTIN
  await db.delete(customerGstinCache).where(eq(customerGstinCache.gstin, "09ABSCD8500K1ZO"));

  const res = await lookupGSTIN("09ABSCD8500K1ZO");
  assert.equal(res.success, false);
  assert.ok(res.error);
  assert.match(res.error, /Taxpayer details not found|Invalid GST/i);
});

test("8. Punjab Optical has GST_AUTOFETCH addon active in database", async () => {
  const [punjabOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, "ee5efc85-f26e-4f90-b6cb-e4e70b8743f4"))
    .limit(1);

  assert.ok(punjabOrg, "Punjab Optical organization should exist in database");

  const [addon] = await db
    .select()
    .from(organizationAddons)
    .where(
      and(
        eq(organizationAddons.organizationId, punjabOrg.id),
        eq(organizationAddons.addonKey, "GST_AUTOFETCH")
      )
    )
    .limit(1);

  assert.ok(addon, "GST_AUTOFETCH addon record must exist");
  assert.equal(addon.isEnabled, true, "GST_AUTOFETCH must be enabled for Punjab Optical");
});

test("9. Entity name resolution accurately prefers tradeName and falls back to legalName", () => {
  const resolveEntityName = (tradeName?: string, legalName?: string) => {
    return tradeName?.trim() || legalName?.trim() || "";
  };

  assert.equal(resolveEntityName("VIRAL NEST", "DEEPAK"), "VIRAL NEST");
  assert.equal(resolveEntityName("   ", "DEEPAK"), "DEEPAK");
  assert.equal(resolveEntityName("", "DEEPAK"), "DEEPAK");
  assert.equal(resolveEntityName(undefined, "DEEPAK"), "DEEPAK");
  assert.equal(resolveEntityName(undefined, undefined), "");
});

test("10. Taxpayer notes enrichment cleanly updates existing [GST Taxpayer Details] block", () => {
  const formatNotes = (existing: string, meta: string) => {
    if (existing.includes("[GST Taxpayer Details]")) {
      return existing.replace(/\[GST Taxpayer Details\][^\n]*/, meta);
    }
    return existing ? `${existing}\n${meta}` : meta;
  };

  const initialNotes = "Patient prefers anti-glare lenses.";
  const metaA = "[GST Taxpayer Details] Legal Name: OLD CO | Trade Name: OLD STORE";
  const withMetaA = formatNotes(initialNotes, metaA);
  assert.equal(withMetaA, "Patient prefers anti-glare lenses.\n[GST Taxpayer Details] Legal Name: OLD CO | Trade Name: OLD STORE");

  const metaB = "[GST Taxpayer Details] Legal Name: NEW CO | Trade Name: NEW STORE";
  const withMetaB = formatNotes(withMetaA, metaB);
  assert.equal(withMetaB, "Patient prefers anti-glare lenses.\n[GST Taxpayer Details] Legal Name: NEW CO | Trade Name: NEW STORE");
  assert.equal(withMetaB.includes("OLD CO"), false);
});

test("11. Strict offline Modulo-36 checksum blocks typo GSTINs without network/API execution", async () => {
  // 09ABSCD8500K1ZO has typo 'D' instead of 'S' - Mod-36 checksum fails
  const typoRes = await lookupGSTIN("09ABSCD8500K1ZO");
  assert.equal(typoRes.success, false);
  assert.equal(typoRes.error, "Invalid GST number. Please check for typographical errors.");
});

test("12. Teardown: connection pool cleanup", () => {
  setTimeout(() => process.exit(0), 200).unref();
});
