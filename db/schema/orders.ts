import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { receipts } from "./receipts";
import { customers } from "./customers";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  receiptId: uuid("receipt_id")
    .references(() => receipts.id, { onDelete: "set null" }), // attached receipt ID (can be null if no payment receipt generated)
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  shopIdIdx: index("orders_shop_id_idx").on(table.shopId),
  orgIdIdx: index("orders_org_id_idx").on(table.organizationId),
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  invoiceIdIdx: index("orders_invoice_id_idx").on(table.invoiceId),
  orderNumberIdx: index("orders_order_number_idx").on(table.orderNumber),
}));
