import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false });

async function migrate() {
  console.log("⏳ Applying database migrations for Super Admin & Demo Requests...");

  try {
    // 1. Ensure user_role enum has 'SUPER_ADMIN'
    try {
      await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';`;
      console.log("✅ Checked/added 'SUPER_ADMIN' to user_role enum.");
    } catch (e: any) {
      console.log("ℹ️ user_role note:", e.message);
    }

    // 2. Ensure subscription_status enum has 'SUSPENDED'
    try {
      await sql`ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'SUSPENDED';`;
      console.log("✅ Checked/added 'SUSPENDED' to subscription_status enum.");
    } catch (e: any) {
      console.log("ℹ️ subscription_status note:", e.message);
    }

    // 3. Ensure demo_request_status enum exists
    try {
      await sql`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demo_request_status') THEN
            CREATE TYPE demo_request_status AS ENUM ('PENDING', 'CONTACTED', 'DEMO_SCHEDULED', 'APPROVED', 'REJECTED');
          END IF;
        END $$;
      `;
      console.log("✅ Created demo_request_status enum.");
    } catch (e: any) {
      console.log("ℹ️ demo_request_status note:", e.message);
    }

    // 4. Create demo_requests table
    await sql`
      CREATE TABLE IF NOT EXISTS demo_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        city VARCHAR(100),
        status demo_request_status NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✅ Created demo_requests table.");

    // 5. Create indexes on demo_requests table
    await sql`CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON demo_requests (status);`;
    await sql`CREATE INDEX IF NOT EXISTS demo_requests_email_idx ON demo_requests (email);`;
    await sql`CREATE INDEX IF NOT EXISTS demo_requests_phone_idx ON demo_requests (phone);`;
    console.log("✅ Created indexes on demo_requests.");

    // 6. Add new columns to subscriptions table
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_shops INTEGER NOT NULL DEFAULT 5;`;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 10;`;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'MONTHLY';`;
    await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes TEXT;`;
    console.log("✅ Updated subscriptions table columns.");

    console.log("\n🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

migrate();
