import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventory } from "./inventory";

export const contactLensDetails = pgTable("contact_lens_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .unique()
    .references(() => inventory.id, { onDelete: "cascade" }),
  
  modality: varchar("modality", { length: 100 }), // Daily, Weekly, Monthly, etc.
  boxQuantity: integer("box_quantity"),
  baseCurve: varchar("base_curve", { length: 50 }),
  diameter: varchar("diameter", { length: 50 }),
  color: varchar("color", { length: 100 }),
  sphere: varchar("sphere", { length: 50 }),
  cylinder: varchar("cylinder", { length: 50 }),
  axis: varchar("axis", { length: 50 }),
  addPower: varchar("add_power", { length: 50 }), // Low, Medium, High, N/A

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
