import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";

export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "OWNER", "SHOP_MANAGER"]);

export interface ModulePermissions {
  dashboard: boolean;
  inventory: boolean;
  sales: boolean;
  returns: boolean;
  customers: boolean;
  appointments: boolean;
  analytics: boolean;
  reports: boolean;
  settings: boolean;
  support: boolean;
}

export const defaultFullPermissions: ModulePermissions = {
  dashboard: true,
  inventory: true,
  sales: true,
  returns: true,
  customers: true,
  appointments: true,
  analytics: true,
  reports: true,
  settings: true,
  support: true,
};

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
  customRoleName: varchar("custom_role_name", { length: 100 }),
  permissions: jsonb("permissions").$type<ModulePermissions>().default(defaultFullPermissions),
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

