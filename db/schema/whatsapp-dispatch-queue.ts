import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { shops } from "./shops";

export const whatsappDispatchQueue = pgTable(
  "whatsapp_dispatch_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
    recipientName: varchar("recipient_name", { length: 255 }),
    messageText: text("message_text").notNull(),
    mediaUrl: text("media_url"),
    mediaType: varchar("media_type", { length: 50 }).notNull().default("TEXT"),
    templateKey: varchar("template_key", { length: 100 }),
    metadata: jsonb("metadata").default({}),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgStatusIdx: index("whatsapp_queue_org_status_idx").on(table.organizationId, table.status),
    shopStatusIdx: index("whatsapp_queue_shop_status_idx").on(table.shopId, table.status),
    createdIdx: index("whatsapp_queue_created_idx").on(table.createdAt),
  })
);
