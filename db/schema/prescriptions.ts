import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  decimal,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const prescriptionTypeEnum = pgEnum("prescription_type", [
  "DISTANCE",
  "NEAR",
]);

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

  prescriptionType: prescriptionTypeEnum("prescription_type").notNull().default("DISTANCE"),

  // Right eye (OD)
  rightSphere: decimal("right_sphere", { precision: 5, scale: 2 }),
  rightCylinder: decimal("right_cylinder", { precision: 5, scale: 2 }),
  rightAxis: decimal("right_axis", { precision: 5, scale: 1 }),
  rightAdd: decimal("right_add", { precision: 4, scale: 2 }),
  rightNv: varchar("right_nv", { length: 50 }),
  caddRight: varchar("cadd_right", { length: 50 }),

  // Left eye (OS)
  leftSphere: decimal("left_sphere", { precision: 5, scale: 2 }),
  leftCylinder: decimal("left_cylinder", { precision: 5, scale: 2 }),
  leftAxis: decimal("left_axis", { precision: 5, scale: 1 }),
  leftAdd: decimal("left_add", { precision: 4, scale: 2 }),
  leftNv: varchar("left_nv", { length: 50 }),
  caddLeft: varchar("cadd_left", { length: 50 }),

  // Additional
  rxNumber: varchar("rx_number", { length: 50 }),
  rxCategory: varchar("rx_category", { length: 50 }).notNull().default("SPECTACLES"),
  lensType: varchar("lens_type", { length: 100 }),
  pd: decimal("pd", { precision: 4, scale: 1 }), // Pupillary distance (combined)
  pdRight: decimal("pd_right", { precision: 4, scale: 1 }),
  pdLeft: decimal("pd_left", { precision: 4, scale: 1 }),
  
  doctorName: varchar("doctor_name", { length: 255 }),
  partyName: varchar("party_name", { length: 255 }),
  frameName: varchar("frame_name", { length: 255 }),
  estimatedDelivery: date("estimated_delivery"),
  specialInstructions: text("special_instructions"),
  notes: text("notes"),
  
  prescribedBy: varchar("prescribed_by", { length: 255 }),
  prescribedAt: date("prescribed_at"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  shopIdIdx: index("prescriptions_shop_id_idx").on(table.shopId),
  orgIdIdx: index("prescriptions_org_id_idx").on(table.organizationId),
  customerIdIdx: index("prescriptions_customer_id_idx").on(table.customerId),
  rxNumberIdx: index("prescriptions_rx_number_idx").on(table.rxNumber),
}));

