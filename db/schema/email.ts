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
export const emailProviderEnum = pgEnum("email_provider", [
  "GMAIL",
  "CUSTOM_SMTP",
]);

export const emailConfigStatusEnum = pgEnum("email_config_status", [
  "ACTIVE",
  "INACTIVE",
  "ERROR",
]);

export const emailCategoryEnum = pgEnum("email_category", [
  "INVOICE",
  "RECEIPT",
  "REMINDER",
  "WELCOME",
  "APPOINTMENT",
  "CUSTOM",
]);

export const emailTriggerEventEnum = pgEnum("email_trigger_event", [
  "CUSTOMER_CREATED",
  "INVOICE_CREATED",
  "PAYMENT_RECEIVED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_REMINDER",
]);

export const emailPriorityEnum = pgEnum("email_priority", [
  "CRITICAL",
  "STANDARD",
  "LOW",
]);

export const emailLogStatusEnum = pgEnum("email_log_status", [
  "SENT",
  "FAILED",
  "RATE_LIMITED",
  "QUEUED",
]);

// 1. Email Configs (SMTP Credentials & Rate Limits)
export const emailConfigs = pgTable(
  "email_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: emailProviderEnum("provider").notNull().default("GMAIL"),
    smtpHost: varchar("smtp_host", { length: 255 }).notNull().default("smtp.gmail.com"),
    smtpPort: integer("smtp_port").notNull().default(587),
    emailAddress: varchar("email_address", { length: 255 }).notNull(),
    appName: varchar("app_name", { length: 255 }),
    encryptedPassword: text("encrypted_password").notNull(),
    senderName: varchar("sender_name", { length: 255 }),
    isVerified: boolean("is_verified").notNull().default(false),
    status: emailConfigStatusEnum("status").notNull().default("INACTIVE"),
    lastError: text("last_error"),
    
    // Rate Limiting Counters (Flexible generous defaults)
    dailySentCount: integer("daily_sent_count").notNull().default(0),
    dailyLimit: integer("daily_limit").notNull().default(490),
    hourlySentCount: integer("hourly_sent_count").notNull().default(0),
    hourlyLimit: integer("hourly_limit").notNull().default(250),
    minuteSentCount: integer("minute_sent_count").notNull().default(0),
    minuteLimit: integer("minute_limit").notNull().default(30),
    
    lastMinuteResetAt: timestamp("last_minute_reset_at", { withTimezone: true }),
    lastHourResetAt: timestamp("last_hour_reset_at", { withTimezone: true }),
    lastDailyResetAt: timestamp("last_daily_reset_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("email_configs_org_id_idx").on(table.organizationId),
  })
);

// 2. Email Templates
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),
    category: emailCategoryEnum("category").notNull().default("CUSTOM"),
    variables: jsonb("variables").default([]),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("email_templates_org_id_idx").on(table.organizationId),
    categoryIdx: index("email_templates_category_idx").on(table.organizationId, table.category),
  })
);

// 3. Automated Email Triggers
export const emailTriggers = pgTable(
  "email_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    event: emailTriggerEventEnum("event").notNull(),
    templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
    templateName: varchar("template_name", { length: 255 }),
    priority: emailPriorityEnum("priority").notNull().default("STANDARD"),
    isActive: boolean("is_active").notNull().default(false),
    description: text("description"),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    triggerCount: integer("trigger_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("email_triggers_org_id_idx").on(table.organizationId),
    eventIdx: index("email_triggers_event_idx").on(table.organizationId, table.event),
  })
);

// 4. Email Activity Logs
export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
    triggerId: uuid("trigger_id").references(() => emailTriggers.id, { onDelete: "set null" }),
    templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    recipientName: varchar("recipient_name", { length: 255 }),
    subject: varchar("subject", { length: 500 }).notNull(),
    status: emailLogStatusEnum("status").notNull().default("QUEUED"),
    errorMessage: text("error_message"),
    triggerEvent: varchar("trigger_event", { length: 50 }),
    shopName: varchar("shop_name", { length: 255 }),
    messageId: varchar("message_id", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("email_logs_org_id_idx").on(table.organizationId),
    sentAtIdx: index("email_logs_sent_at_idx").on(table.organizationId, table.sentAt),
    shopIdIdx: index("email_logs_shop_id_idx").on(table.shopId),
    statusIdx: index("email_logs_status_idx").on(table.organizationId, table.status),
  })
);
