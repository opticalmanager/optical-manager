import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  pgEnum,
  date,
  index,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const inventoryCategoryEnum = pgEnum("inventory_category", [
  "FRAME",
  "LENS",
  "CONTACT_LENS",
  "ACCESSORY",
  "SOLUTION",
]);

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: inventoryCategoryEnum("category").notNull(),
  brand: varchar("brand", { length: 255 }),
  model: varchar("model", { length: 255 }),
  sku: varchar("sku", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  
  // Shared expanded columns
  imageUrl: text("image_url"),
  hsnCode: varchar("hsn_code", { length: 20 }),
  cgstPercent: decimal("cgst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  sgstPercent: decimal("sgst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  igstPercent: decimal("igst_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  vendorName: varchar("vendor_name", { length: 255 }),
  rackLocation: varchar("rack_location", { length: 100 }),
  requiresExpiryTracking: boolean("requires_expiry_tracking").notNull().default(false),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: date("expiry_date"),
  
  // Purchase details additions
  purchaseInvoiceNo: varchar("purchase_invoice_no", { length: 100 }),
  inwardDate: date("inward_date"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  shopIdIdx: index("inventory_shop_id_idx").on(table.shopId),
  orgIdIdx: index("inventory_org_id_idx").on(table.organizationId),
  categoryIdx: index("inventory_category_idx").on(table.category),
  skuIdx: index("inventory_sku_idx").on(table.sku),
  shopActiveIdx: index("inventory_shop_active_idx").on(table.shopId, table.isActive),
}));
