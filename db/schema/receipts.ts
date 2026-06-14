import { pgTable, uuid, varchar, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { invoices, paymentMethodEnum } from "./invoices";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  transactionId: varchar("transaction_id", { length: 100 }), // TXN ID in receipt
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  shopIdIdx: index("receipts_shop_id_idx").on(table.shopId),
  orgIdIdx: index("receipts_org_id_idx").on(table.organizationId),
  invoiceIdIdx: index("receipts_invoice_id_idx").on(table.invoiceId),
  receiptNumberIdx: index("receipts_receipt_number_idx").on(table.receiptNumber),
}));
