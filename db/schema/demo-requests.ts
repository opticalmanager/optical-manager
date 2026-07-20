import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const demoRequestStatusEnum = pgEnum("demo_request_status", [
  "PENDING",
  "CONTACTED",
  "DEMO_SCHEDULED",
  "APPROVED",
  "REJECTED",
]);

export const demoRequests = pgTable(
  "demo_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeName: varchar("store_name", { length: 255 }).notNull(),
    ownerName: varchar("owner_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    city: varchar("city", { length: 100 }),
    status: demoRequestStatusEnum("status").notNull().default("PENDING"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("demo_requests_status_idx").on(table.status),
    emailIdx: index("demo_requests_email_idx").on(table.email),
    phoneIdx: index("demo_requests_phone_idx").on(table.phone),
  })
);
