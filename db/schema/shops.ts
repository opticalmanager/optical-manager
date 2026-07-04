import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  
  // Compliance identifiers
  gstin: varchar("gstin", { length: 50 }),
  cin: varchar("cin", { length: 50 }),
  msmeUdyam: varchar("msme_udyam", { length: 100 }),
  
  // Banking details
  bankName: varchar("bank_name", { length: 255 }),
  bankBranch: varchar("bank_branch", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankIfsc: varchar("bank_ifsc", { length: 20 }),
  
  // Flexible JSONB settings column for layouts, templates, business rules, loyalty, etc.
  settings: jsonb("settings").$type<{
    businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
    taxationLogic?: "inclusive" | "exclusive";
    defaultTaxRate?: number;
    gstRates?: number[];
    loyaltyEnabled?: boolean;
    loyaltyPointsRatio?: number;
    loyaltyRedeemValue?: number;
    whatsappTemplates?: Record<string, boolean>;
    emailTemplates?: Record<string, boolean>;
    smsAlerts?: Record<string, boolean>;
    expenseCategories?: string[];
    expenseVendors?: Array<{ name: string; contact?: string; phone?: string; email?: string; gstin?: string }>;
    pdfInvoiceTemplate?: "classic" | "elegant" | "compact";
    autoReportSchedule?: { type: "daily" | "weekly" | "off"; email?: string };
    customerGroups?: string[];
    secondaryContacts?: Array<{ name: string; role: string; phone: string; email?: string }>;
  }>().default({}),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
