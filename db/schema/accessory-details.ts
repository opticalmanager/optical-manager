import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventory } from "./inventory";

export const accessoryDetails = pgTable("accessory_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .unique()
    .references(() => inventory.id, { onDelete: "cascade" }),
  
  type: varchar("type", { length: 100 }), // Solution, Case, Cleaner, Microfiber, Nose Pads, Other, etc.
  sizeVolume: varchar("size_volume", { length: 100 }),
  colorPattern: varchar("color_pattern", { length: 100 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
