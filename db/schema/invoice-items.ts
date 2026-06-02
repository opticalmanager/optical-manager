import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { inventory } from "./inventory";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  inventoryId: uuid("inventory_id")
    .references(() => inventory.id, { onDelete: "set null" }),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  cgstPercent: decimal("cgst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sgstPercent: decimal("sgst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  igstPercent: decimal("igst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  igstAmount: decimal("igst_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
