import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { profiles } from "./profiles";

export const customerCreditLedger = pgTable(
  "customer_credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transactionType: varchar("transaction_type", { length: 50 }).notNull(), // CREDIT_ISSUED, CREDIT_REDEEMED, ADJUSTMENT
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    balanceBefore: decimal("balance_before", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    balanceAfter: decimal("balance_after", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    referenceType: varchar("reference_type", { length: 50 }), // SALES_RETURN, INVOICE, MANUAL
    referenceId: uuid("reference_id"),
    referenceNumber: varchar("reference_number", { length: 100 }),
    notes: text("notes"),
    performedBy: uuid("performed_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    customerIdIdx: index("customer_credit_ledger_cust_id_idx").on(table.customerId),
    shopIdIdx: index("customer_credit_ledger_shop_id_idx").on(table.shopId),
    orgIdIdx: index("customer_credit_ledger_org_id_idx").on(table.organizationId),
    createdAtIdx: index("customer_credit_ledger_created_at_idx").on(table.createdAt),
  })
);
