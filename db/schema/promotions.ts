import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";

// Enums
export const whatsappConfigStatusEnum = pgEnum("whatsapp_config_status", [
  "CONNECTED",
  "DISCONNECTED",
  "PENDING",
]);

export const templateCategoryEnum = pgEnum("template_category", [
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
]);

export const templateStatusEnum = pgEnum("template_status", [
  "APPROVED",
  "PENDING",
  "REJECTED",
]);

export const triggerEventEnum = pgEnum("trigger_event", [
  "BIRTHDAY",
  "PURCHASE",
  "APPOINTMENT",
  "RE_ENGAGEMENT",
]);

export const triggerStatusEnum = pgEnum("trigger_status", [
  "ACTIVE",
  "PAUSED",
  "INACTIVE",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "SCHEDULED",
  "COMPLETED",
  "DRAFT",
  "CANCELLED",
]);

// 1. WhatsApp Connection Configs
export const whatsappConfigs = pgTable(
  "whatsapp_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 30 }),
    businessName: varchar("business_name", { length: 255 }),
    status: whatsappConfigStatusEnum("status").notNull().default("CONNECTED"),
    apiKey: text("api_key"),
    webhookSecret: text("webhook_secret"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("whatsapp_configs_org_id_idx").on(table.organizationId),
  })
);

// 2. WhatsApp Message Templates
export const whatsappTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: templateCategoryEnum("category").notNull().default("MARKETING"),
    language: varchar("language", { length: 10 }).notNull().default("en"),
    content: text("content").notNull(),
    variables: jsonb("variables").default([]), // array of { key: "{{1}}", description: "Customer Name" }
    status: templateStatusEnum("status").notNull().default("APPROVED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("whatsapp_templates_org_id_idx").on(table.organizationId),
  })
);

// 3. Automated Event Triggers
export const promotionTriggers = pgTable(
  "promotion_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    event: triggerEventEnum("event").notNull(),
    timingValue: integer("timing_value").notNull().default(1),
    timingUnit: varchar("timing_unit", { length: 20 }).notNull().default("Day"), // Day, Hour, Week
    timingDirection: varchar("timing_direction", { length: 20 }).notNull().default("Before"), // Before, After
    triggerTime: varchar("trigger_time", { length: 20 }).notNull().default("09:00 AM"),
    templateId: uuid("template_id").references(() => whatsappTemplates.id, { onDelete: "set null" }),
    templateName: varchar("template_name", { length: 255 }),
    status: triggerStatusEnum("status").notNull().default("ACTIVE"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("promotion_triggers_org_id_idx").on(table.organizationId),
  })
);

// 4. Promotional Campaigns
export const promotionCampaigns = pgTable(
  "promotion_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    offerDetails: text("offer_details"),
    audience: varchar("audience", { length: 255 }).notNull().default("All Customers"),
    audienceCount: integer("audience_count").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: campaignStatusEnum("status").notNull().default("SCHEDULED"),
    templateId: uuid("template_id").references(() => whatsappTemplates.id, { onDelete: "set null" }),
    totalSent: integer("total_sent").notNull().default(0),
    delivered: integer("delivered").notNull().default(0),
    read: integer("read").notNull().default(0),
    replied: integer("replied").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("promotion_campaigns_org_id_idx").on(table.organizationId),
  })
);
