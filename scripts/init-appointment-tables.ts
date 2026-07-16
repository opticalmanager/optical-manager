import { db } from "../lib/drizzle";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating appointment_configs and appointments tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS appointment_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      form_fields JSONB NOT NULL DEFAULT '[
        {"id": "full_name", "label": "Full Name", "type": "text", "enabled": true, "required": true, "icon": "user"},
        {"id": "phone_number", "label": "Phone Number", "type": "tel", "enabled": true, "required": true, "icon": "phone"},
        {"id": "time_to_visit", "label": "Time to Visit", "type": "datetime", "enabled": true, "required": true, "icon": "clock"},
        {"id": "select_branch", "label": "Select Branch", "type": "select", "enabled": true, "required": true, "icon": "map-pin"},
        {"id": "purpose_of_visit", "label": "Purpose of Visit", "type": "select", "enabled": true, "required": true, "icon": "message-square"},
        {"id": "additional_notes", "label": "Additional Notes", "type": "textarea", "enabled": false, "required": false, "icon": "file-text"}
      ]',
      visit_purposes JSONB NOT NULL DEFAULT '["Eye Test / Vision Check", "Contact Lens Consultation", "Frame Selection"]',
      page_title VARCHAR(255) NOT NULL DEFAULT 'Book Your Appointment',
      page_subtitle TEXT NOT NULL DEFAULT 'Schedule your visit with our experts. We''re here to help you see better.',
      primary_color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
      button_text VARCHAR(100) NOT NULL DEFAULT 'Book Appointment',
      is_published BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      visit_time TIMESTAMPTZ NOT NULL,
      purpose_of_visit VARCHAR(255) NOT NULL,
      additional_notes TEXT,
      status appointment_status NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS appointments_org_id_idx ON appointments (organization_id);
    CREATE INDEX IF NOT EXISTS appointments_shop_id_idx ON appointments (shop_id);
  `);

  console.log("Successfully created appointment tables!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
