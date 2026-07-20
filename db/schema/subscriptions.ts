import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  integer,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "TRIAL",
  "BASIC",
  "PRO",
  "ENTERPRISE",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull().default("TRIAL"),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  maxShops: integer("max_shops").notNull().default(1),
  maxUsers: integer("max_users").notNull().default(3),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("MONTHLY"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
