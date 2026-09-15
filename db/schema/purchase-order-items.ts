import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { purchaseOrders } from "./purchase-orders";
import { inventory } from "./inventory";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    inventoryId: uuid("inventory_id").references(() => inventory.id, {
      onDelete: "set null",
    }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serialNumber: integer("serial_number").notNull(),

    // Product Identifiers (SS2 fields)
    productName: varchar("product_name", { length: 255 }).notNull(),
    productCode: varchar("product_code", { length: 100 }),
    category: varchar("category", { length: 50 }),
    details: text("details"),

    // Pricing & Tax Calibration
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    hsnCode: varchar("hsn_code", { length: 20 }),
    gstPercent: decimal("gst_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    cgstPercent: decimal("cgst_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    sgstPercent: decimal("sgst_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    igstPercent: decimal("igst_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    igstAmount: decimal("igst_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),

    purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    quantity: integer("quantity").notNull().default(0),
    totalPurchasePrice: decimal("total_purchase_price", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    retailPrice: decimal("retail_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    poIdIdx: index("purchase_order_items_po_id_idx").on(table.purchaseOrderId),
    inventoryIdIdx: index("purchase_order_items_inventory_id_idx").on(table.inventoryId),
    shopIdIdx: index("purchase_order_items_shop_id_idx").on(table.shopId),
  })
);
