import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { invoices } from "./invoices";
import { receipts } from "./receipts";
import { customers } from "./customers";
import { shops } from "./shops";
import { organizations } from "./organizations";
import { profiles } from "./profiles";

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
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => profiles.id, { onDelete: "set null" }),
}, (table) => ({
  shopIdIdx: index("orders_shop_id_idx").on(table.shopId),
  orgIdIdx: index("orders_org_id_idx").on(table.organizationId),
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  invoiceIdIdx: index("orders_invoice_id_idx").on(table.invoiceId),
  orderNumberIdx: index("orders_order_number_idx").on(table.orderNumber),
  deletedAtIdx: index("orders_deleted_at_idx").on(table.deletedAt),
}));

export const orderEditHistory = pgTable("order_edit_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .references(() => profiles.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  summary: text("summary").notNull(),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  orderIdIdx: index("order_edit_history_order_id_idx").on(table.orderId),
  shopIdIdx: index("order_edit_history_shop_id_idx").on(table.shopId),
  orgIdIdx: index("order_edit_history_org_id_idx").on(table.organizationId),
  createdAtIdx: index("order_edit_history_created_at_idx").on(table.createdAt),
}));

