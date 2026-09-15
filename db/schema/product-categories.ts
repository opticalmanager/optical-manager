import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  decimal,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  hsnCode: varchar("hsn_code", { length: 20 }),
  cgstPercent: decimal("cgst_percent", { precision: 5, scale: 2 }).notNull().default("6.00"),
  sgstPercent: decimal("sgst_percent", { precision: 5, scale: 2 }).notNull().default("6.00"),
  igstPercent: decimal("igst_percent", { precision: 5, scale: 2 }).notNull().default("12.00"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  orgCodeIdx: uniqueIndex("product_categories_org_code_idx").on(table.organizationId, table.code),
  orgActiveIdx: index("product_categories_org_active_idx").on(table.organizationId, table.isActive),
}));
