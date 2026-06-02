import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventory } from "./inventory";

export const frameDetails = pgTable("frame_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .unique()
    .references(() => inventory.id, { onDelete: "cascade" }),
  modelNumber: varchar("model_number", { length: 100 }),
  colorCode: varchar("color_code", { length: 100 }),
  size: varchar("size", { length: 50 }),
  material: varchar("material", { length: 100 }),
  frameShape: varchar("frame_shape", { length: 100 }),
  targetDemographic: varchar("target_demographic", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
