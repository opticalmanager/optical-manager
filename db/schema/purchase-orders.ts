import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";
import { vendors } from "./vendors";
import { profiles } from "./profiles";

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),
    vendorName: varchar("vendor_name", { length: 255 }),
    purchaseNumber: varchar("purchase_number", { length: 100 }).notNull(),
    purchaseDate: date("purchase_date").notNull(),
    status: purchaseStatusEnum("status").notNull().default("DRAFT"),
    taxRule: varchar("tax_rule", { length: 20 }).notNull().default("EXCLUDE"),
    taxType: varchar("tax_type", { length: 50 }).notNull().default("SGST_CGST"),

    totalQuantity: integer("total_quantity").notNull().default(0),
    totalUnitAmount: decimal("total_unit_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    totalBasePrice: decimal("total_base_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    totalGstAmount: decimal("total_gst_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    totalPurchase: decimal("total_purchase", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    roundOff: decimal("round_off", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalNetPurchase: decimal("total_net_purchase", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),

    notes: text("notes"),
    createdBy: uuid("created_by").references(() => profiles.id, {
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
    shopIdIdx: index("purchase_orders_shop_id_idx").on(table.shopId),
    orgIdIdx: index("purchase_orders_org_id_idx").on(table.organizationId),
    vendorIdIdx: index("purchase_orders_vendor_id_idx").on(table.vendorId),
    statusIdx: index("purchase_orders_status_idx").on(table.shopId, table.status),
    dateIdx: index("purchase_orders_date_idx").on(table.shopId, table.purchaseDate),
    numberOrgIdx: index("purchase_orders_number_idx").on(table.organizationId, table.purchaseNumber),
  })
);
