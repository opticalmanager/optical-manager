import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventory } from "./inventory";

export const sunglassDetails = pgTable("sunglass_details", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id")
    .notNull()
    .unique()
    .references(() => inventory.id, { onDelete: "cascade" }),
  modelNumber: varchar("model_number", { length: 100 }),
  frameShape: varchar("frame_shape", { length: 100 }),
  frameColor: varchar("frame_color", { length: 100 }),
  lensColor: varchar("lens_color", { length: 100 }),
  size: varchar("size", { length: 50 }),
  gender: varchar("gender", { length: 50 }),
  isPolarized: boolean("is_polarized").default(false),
  uvProtection: varchar("uv_protection", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
