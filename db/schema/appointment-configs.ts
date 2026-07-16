import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export interface FormFieldConfig {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  required: boolean;
  icon?: string;
}

export const appointmentConfigs = pgTable("appointment_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  
  // Custom form fields configuration
  formFields: jsonb("form_fields").$type<FormFieldConfig[]>().notNull().default([
    { id: "full_name", label: "Full Name", type: "text", enabled: true, required: true, icon: "user" },
    { id: "phone_number", label: "Phone Number", type: "tel", enabled: true, required: true, icon: "phone" },
    { id: "time_to_visit", label: "Time to Visit", type: "datetime", enabled: true, required: true, icon: "clock" },
    { id: "select_branch", label: "Select Branch", type: "select", enabled: true, required: true, icon: "map-pin" },
    { id: "purpose_of_visit", label: "Purpose of Visit", type: "select", enabled: true, required: true, icon: "message-square" },
    { id: "additional_notes", label: "Additional Notes", type: "textarea", enabled: false, required: false, icon: "file-text" },
  ]),

  // Visit purpose choices list
  visitPurposes: jsonb("visit_purposes").$type<string[]>().notNull().default([
    "Eye Test / Vision Check",
    "Contact Lens Consultation",
    "Frame Selection",
  ]),

  // Custom visual page settings
  pageTitle: varchar("page_title", { length: 255 }).notNull().default("Book Your Appointment"),
  pageSubtitle: text("page_subtitle").notNull().default("Schedule your visit with our experts. We're here to help you see better."),
  primaryColor: varchar("primary_color", { length: 20 }).notNull().default("#2563EB"),
  buttonText: varchar("button_text", { length: 100 }).notNull().default("Book Appointment"),
  isPublished: boolean("is_published").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
