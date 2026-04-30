import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Right eye (OD)
  rightSphere: decimal("right_sphere", { precision: 5, scale: 2 }),
  rightCylinder: decimal("right_cylinder", { precision: 5, scale: 2 }),
  rightAxis: decimal("right_axis", { precision: 5, scale: 1 }),
  rightAdd: decimal("right_add", { precision: 4, scale: 2 }),

  // Left eye (OS)
  leftSphere: decimal("left_sphere", { precision: 5, scale: 2 }),
  leftCylinder: decimal("left_cylinder", { precision: 5, scale: 2 }),
  leftAxis: decimal("left_axis", { precision: 5, scale: 1 }),
  leftAdd: decimal("left_add", { precision: 4, scale: 2 }),

  // Additional
  pd: decimal("pd", { precision: 4, scale: 1 }), // Pupillary distance
  notes: text("notes"),
  prescribedBy: varchar("prescribed_by", { length: 255 }),
  prescribedAt: date("prescribed_at"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
