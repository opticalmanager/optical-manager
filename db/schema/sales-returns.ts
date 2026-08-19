import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";
import { invoices } from "./invoices";
import { invoiceItems } from "./invoice-items";
import { customers } from "./customers";
import { inventory } from "./inventory";
import { profiles } from "./profiles";

export const returnTypeEnum = pgEnum("return_type", [
  "SELECTED_PRODUCTS",
  "ENTIRE_INVOICE",
]);

export const returnStatusEnum = pgEnum("return_status", [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
]);

export const inspectionReasonEnum = pgEnum("inspection_reason", [
  "LOOKS_NEW",
  "MINOR_WEAR",
  "DAMAGED",
  "WRONG_PRODUCT",
  "MANUFACTURING_DEFECT",
  "WARRANTY_CLAIM",
]);

export const finalActionEnum = pgEnum("final_action", [
  "RESTOCK_INVENTORY",
  "REPAIR_AT_STORE",
  "SEND_TO_VENDOR",
  "SCRAP_DAMAGE",
  "HOLD_FOR_INSPECTION",
]);

export const salesReturns = pgTable(
  "sales_returns",
  {
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
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    returnNumber: varchar("return_number", { length: 50 }).notNull(),
    returnType: returnTypeEnum("return_type").notNull().default("SELECTED_PRODUCTS"),
    status: returnStatusEnum("status").notNull().default("COMPLETED"),
    totalRefundAmount: decimal("total_refund_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    notes: text("notes"),
    processedBy: uuid("processed_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    shopIdIdx: index("sales_returns_shop_id_idx").on(table.shopId),
    orgIdIdx: index("sales_returns_org_id_idx").on(table.organizationId),
    invoiceIdIdx: index("sales_returns_invoice_id_idx").on(table.invoiceId),
    customerIdIdx: index("sales_returns_customer_id_idx").on(table.customerId),
    returnNumberIdx: index("sales_returns_return_num_idx").on(table.returnNumber),
  })
);

export const salesReturnItems = pgTable(
  "sales_return_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => salesReturns.id, { onDelete: "cascade" }),
    invoiceItemId: uuid("invoice_item_id")
      .notNull()
      .references(() => invoiceItems.id, { onDelete: "cascade" }),
    inventoryId: uuid("inventory_id").references(() => inventory.id, {
      onDelete: "set null",
    }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    quantityReturned: integer("quantity_returned").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
    inspectionReason: inspectionReasonEnum("inspection_reason")
      .notNull()
      .default("LOOKS_NEW"),
    finalAction: finalActionEnum("final_action")
      .notNull()
      .default("RESTOCK_INVENTORY"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    returnIdIdx: index("sales_return_items_return_id_idx").on(table.returnId),
    invoiceItemIdIdx: index("sales_return_items_inv_item_id_idx").on(table.invoiceItemId),
    inventoryIdIdx: index("sales_return_items_inv_id_idx").on(table.inventoryId),
  })
);
