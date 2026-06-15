import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { organizations } from "./organizations";

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);
export const bloodGroupEnum = pgEnum("blood_group", [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
]);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  registrationId: varchar("registration_id", { length: 50 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 20 }),
  gender: genderEnum("gender"),
  bloodGroup: bloodGroupEnum("blood_group"),
  referredBy: varchar("referred_by", { length: 255 }),
  chiefComplaint: text("chief_complaint"),
  familyHistory: text("family_history"),
  systemicIllness: text("systemic_illness"),
  allergies: text("allergies"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  orgRegIdUnique: uniqueIndex("customers_org_reg_id_unique").on(table.organizationId, table.registrationId),
  shopIdIdx: index("customers_shop_id_idx").on(table.shopId),
  orgIdIdx: index("customers_org_id_idx").on(table.organizationId),
  phoneIdx: index("customers_phone_idx").on(table.phone),
}));

