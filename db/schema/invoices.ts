import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  pgEnum,
  uniqueIndex,
  index,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";
import { customers } from "./customers";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "PENDING",
  "PAID",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "PROCESSING",
  "READY",
  "DELIVERED",
  "ON_HOLD",
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  paymentMethod: paymentMethodEnum("payment_method"),
  fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("PROCESSING"),
  estimatedDelivery: date("estimated_delivery"),
  isRescheduled: boolean("is_rescheduled").notNull().default(false),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull().default("0.00"),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  orgInvoiceNumUnique: uniqueIndex("invoices_org_invoice_num_unique").on(table.organizationId, table.invoiceNumber),
  shopIdIdx: index("invoices_shop_id_idx").on(table.shopId),
  orgIdIdx: index("invoices_org_id_idx").on(table.organizationId),
  invoiceNumberIdx: index("invoices_invoice_number_idx").on(table.invoiceNumber),
}));
