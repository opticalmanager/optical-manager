import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventory } from "./inventory";

export const lensDetails = pgTable("lens_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .unique()
    .references(() => inventory.id, { onDelete: "cascade" }),
  
  design: varchar("design", { length: 100 }),
  refractiveIndex: varchar("refractive_index", { length: 50 }),
  material: varchar("material", { length: 100 }),
  blankDiameter: integer("blank_diameter"),
  stockPower: varchar("stock_power", { length: 100 }),
  
  // Coatings & Enhancements (Checkboxes)
  isUncoated: boolean("is_uncoated").notNull().default(false),
  isAntiReflective: boolean("is_anti_reflective").notNull().default(false),
  isBlueControl: boolean("is_blue_control").notNull().default(false),
  isTinted: boolean("is_tinted").notNull().default(false),
  isPolarized: boolean("is_polarized").notNull().default(false),
  isHardCoat: boolean("is_hard_coat").notNull().default(false),
  isPhotochromic: boolean("is_photochromic").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
