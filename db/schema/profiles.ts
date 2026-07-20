import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";

export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "OWNER", "SHOP_MANAGER"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users.id — set manually on insert
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }), // Nullable for system SUPER_ADMIN
  shopId: uuid("shop_id").references(() => shops.id, {
    onDelete: "set null",
  }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  shopIdIdx: index("profiles_shop_id_idx").on(table.shopId),
  orgIdIdx: index("profiles_org_id_idx").on(table.organizationId),
}));
