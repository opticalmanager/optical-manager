import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";
import { inventory } from "./inventory";
import { profiles } from "./profiles";

export const movementTypeEnum = pgEnum("movement_type", [
  "STOCK_IN",
  "SOLD",
  "ADJUSTMENT",
  "RETURN",
  "INITIAL",
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .references(() => inventory.id, { onDelete: "cascade" }),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceType: varchar("reference_type", { length: 50 }), // e.g. PURCHASE_INVOICE, SALE_INVOICE, MANUAL, INITIAL_STOCK
  referenceNumber: varchar("reference_number", { length: 100 }), // Invoice number or reference
  vendorParty: varchar("vendor_party", { length: 255 }), // Customer or vendor name
  costPriceAtTime: decimal("cost_price_at_time", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  performedBy: uuid("performed_by")
    .references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  inventoryIdIdx: index("stock_movements_inventory_id_idx").on(table.inventoryId),
  shopIdIdx: index("stock_movements_shop_id_idx").on(table.shopId),
  orgIdIdx: index("stock_movements_org_id_idx").on(table.organizationId),
  inventoryCreatedIdx: index("stock_movements_inv_created_idx").on(table.inventoryId, table.createdAt),
}));
