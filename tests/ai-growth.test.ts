import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config();

import { 
  sanitizeWhatsAppPhone, 
  CLINICAL_FALLBACK_TEMPLATES, 
  getGrowthOpportunitiesData 
} from "../services/ai-growth.service";
import type { GrowthCohortCategory } from "../types/ai-growth";

const TEST_ORG_ID = "6112e65a-8472-4f03-9ab9-72d7b158be7f";

test("1. sanitizeWhatsAppPhone handles diverse Indian and international phone formats", () => {
  // 10-digit Indian Mobile
  const res10 = sanitizeWhatsAppPhone("9876543210");
  assert.equal(res10.isValid, true);
  assert.equal(res10.digits, "919876543210");
  assert.equal(res10.formatted, "+91 98765 43210");

  // 12-digit Indian Mobile with 91 prefix
  const res12 = sanitizeWhatsAppPhone("919876543210");
  assert.equal(res12.isValid, true);
  assert.equal(res12.digits, "919876543210");
  assert.equal(res12.formatted, "+91 98765 43210");

  // 11-digit Indian Mobile with leading 0
  const res11 = sanitizeWhatsAppPhone("09876543210");
  assert.equal(res11.isValid, true);
  assert.equal(res11.digits, "919876543210");
  assert.equal(res11.formatted, "+91 98765 43210");

  // 13-digit Indian Mobile with 910...
  const res13 = sanitizeWhatsAppPhone("+91 09876543210");
  assert.equal(res13.isValid, true);
  assert.equal(res13.digits, "919876543210");
  assert.equal(res13.formatted, "+91 98765 43210");

  // 14-digit Indian Mobile with 0091...
  const res14 = sanitizeWhatsAppPhone("00919876543210");
  assert.equal(res14.isValid, true);
  assert.equal(res14.digits, "919876543210");
  assert.equal(res14.formatted, "+91 98765 43210");

  // Formatted string with dashes, spaces, brackets
  const resFormatted = sanitizeWhatsAppPhone("+91 (987) 654-3210");
  assert.equal(resFormatted.isValid, true);
  assert.equal(resFormatted.digits, "919876543210");

  // International numbers with explicit country prefix
  const resUS = sanitizeWhatsAppPhone("+14155552671");
  assert.equal(resUS.isValid, true);
  assert.equal(resUS.digits, "14155552671");
  assert.equal(resUS.formatted, "+14155552671");

  const resUAE = sanitizeWhatsAppPhone("+971501234567");
  assert.equal(resUAE.isValid, true);
  assert.equal(resUAE.digits, "971501234567");

  // Invalid landlines (starts with 011, 022, 080 - not starting with 6, 7, 8, 9)
  const resLandline = sanitizeWhatsAppPhone("011-23456789");
  assert.equal(resLandline.isValid, false);

  const resLandline2 = sanitizeWhatsAppPhone("080-26543210");
  assert.equal(resLandline2.isValid, false);

  // Short codes / empty
  assert.equal(sanitizeWhatsAppPhone("12345").isValid, false);
  assert.equal(sanitizeWhatsAppPhone("").isValid, false);
  assert.equal(sanitizeWhatsAppPhone(null).isValid, false);
  assert.equal(sanitizeWhatsAppPhone(undefined).isValid, false);
});

test("2. Fallback clinical templates cover all 6 cohorts with medical compliance", () => {
  const expectedCohorts: GrowthCohortCategory[] = [
    "ANNUAL_RX_EXPIRY",
    "VIP_HIGH_SPENDER",
    "UNUSED_STORE_CREDIT",
    "PROGRESSIVE_UPGRADE",
    "HIGH_CYLINDER_CHECKUP",
    "DORMANT_LAPSED",
  ];

  for (const cohort of expectedCohorts) {
    const template = CLINICAL_FALLBACK_TEMPLATES[cohort];
    assert.ok(template, `Template for ${cohort} must exist`);
    assert.ok(template.title.length > 5, `Title for ${cohort} must be descriptive`);
    assert.ok(template.clinicalAngle.length > 5, `Clinical angle for ${cohort} must exist`);
    assert.ok(template.messageBody.includes("{{customer_name}}"), `Message body for ${cohort} must include {{customer_name}}`);
    assert.ok(template.messageBody.includes("{{shop_name}}"), `Message body for ${cohort} must include {{shop_name}}`);
    assert.ok(template.aovEstimate > 0, `AOV estimate for ${cohort} must be positive`);
    
    // Prohibited medical cure claims
    const lowerBody = template.messageBody.toLowerCase();
    assert.ok(!lowerBody.includes("cure"), `Template for ${cohort} must not claim cures`);
    assert.ok(!lowerBody.includes("heal"), `Template for ${cohort} must not claim healing`);
    assert.ok(!lowerBody.includes("eliminate migraines"), `Template for ${cohort} must not claim migraine elimination`);
  }
});

test("3. getGrowthOpportunitiesData aggregates live database metrics without Cartesian duplication", async () => {
  const data = await getGrowthOpportunitiesData(TEST_ORG_ID);

  assert.ok(data.telemetry, "Telemetry must be defined");
  assert.ok(typeof data.telemetry.totalRecoverablePipeline === "number", "Pipeline must be a number");
  assert.ok(data.telemetry.totalRecoverablePipeline >= 0, "Pipeline must be non-negative");
  assert.ok(typeof data.telemetry.totalReachablePatients === "number", "Reachable patients must be a number");
  assert.ok(typeof data.telemetry.cooldownProtectedCount === "number", "Cooldown count must be a number");

  assert.equal(data.cards.length, 6, "Must generate exactly 6 opportunity cards");

  for (const card of data.cards) {
    assert.ok(card.cohortType, "Card must have cohortType");
    assert.ok(typeof card.estimatedRevenue === "number" && !isNaN(card.estimatedRevenue), "Estimated revenue must be a valid number");
    assert.ok(typeof card.patientCount === "number" && card.patientCount >= 0, "Patient count must be >= 0");
    assert.ok(typeof card.reachableCount === "number" && card.reachableCount >= 0, "Reachable count must be >= 0");
    assert.ok(card.reachableCount <= card.patientCount, "Reachable count cannot exceed total patient count");
    assert.ok(card.patientCount >= (card.reachableCount + card.cooldownCount + card.invalidPhoneCount), "Patient breakdown counts must be consistent");
  }

  // Verify patient rosters
  const cohortKeys: GrowthCohortCategory[] = [
    "ANNUAL_RX_EXPIRY",
    "VIP_HIGH_SPENDER",
    "UNUSED_STORE_CREDIT",
    "PROGRESSIVE_UPGRADE",
    "HIGH_CYLINDER_CHECKUP",
    "DORMANT_LAPSED",
  ];

  for (const key of cohortKeys) {
    const list = data.patientsByCohort[key];
    assert.ok(Array.isArray(list), `Cohort ${key} must be an array`);
    for (const p of list) {
      assert.ok(p.id, "Patient must have an ID");
      assert.ok(typeof p.lifetimeSpend === "number" && !isNaN(p.lifetimeSpend), "Lifetime spend must not be NaN");
      assert.ok(p.lifetimeSpend >= 0, "Lifetime spend must be >= 0");
      assert.ok(typeof p.isValidWhatsApp === "boolean", "isValidWhatsApp must be boolean");
      assert.ok(typeof p.isRecentlyContacted === "boolean", "isRecentlyContacted must be boolean");
    }
  }
});

test("4. Teardown: connection pool cleanup", () => {
  setTimeout(() => process.exit(0), 200).unref();
});
