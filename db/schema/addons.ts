import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";
import { profiles } from "./profiles";

/**
 * Tracks which add-on modules are enabled for each organization,
 * along with per-organization configuration and pricing overrides.
 */
export const organizationAddons = pgTable(
  "organization_addons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    addonKey: text("addon_key").notNull(), // 'GST_AUTOFETCH', 'WHATSAPP_AUTOMATION', 'SMS_GATEWAY'
    isEnabled: boolean("is_enabled").default(false).notNull(),
    config: jsonb("config").default({ costPerCall: "0.40" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgAddonIdx: uniqueIndex("org_addon_unique_idx").on(table.organizationId, table.addonKey),
  })
);

/**
 * Detailed log of every single add-on execution (e.g. GSTIN API queries).
 * Supports CA audit verification, usage analytics, and billing breakdown.
 */
export const addonUsageLogs = pgTable(
  "addon_usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    addonKey: text("addon_key").notNull(), // 'GST_AUTOFETCH'
    referenceIdentifier: text("reference_identifier"), // The 15-char GSTIN looked up
    isCached: boolean("is_cached").default(false).notNull(), // true = free DB cache hit, false = live Appyflow hit
    costInr: numeric("cost_inr", { precision: 10, scale: 2 }).default("0.40").notNull(),
    metadata: jsonb("metadata").default({}), // e.g. { tradeName, status, city, state }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgDateIdx: index("addon_usage_org_date_idx").on(table.organizationId, table.createdAt),
    addonKeyIdx: index("addon_usage_key_idx").on(table.addonKey),
  })
);

/**
 * High-speed, system-wide taxpayer cache so recurring patient visits,
 * B2B customers, or shared suppliers never incur repeated API costs.
 */
export const customerGstinCache = pgTable(
  "customer_gstin_cache",
  {
    gstin: text("gstin").primaryKey(), // 15 chars normalized uppercase
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    status: text("status").notNull(), // "Active", "Cancelled", "Suspended"
    taxpayerType: text("taxpayer_type"), // "Proprietorship", "Company", "Partnership"
    addressLine: text("address_line"),
    city: text("city"),
    state: text("state"),
    stateCode: text("state_code"),
    pincode: text("pincode"),
    rawResponse: jsonb("raw_response"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
