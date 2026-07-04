import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("DIRECT_DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

async function run() {
  console.log("Running migration queries...");
  try {
    // 1. Add gstin
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "gstin" varchar(50);`;
    console.log("✔ Added column gstin");

    // 2. Add cin
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "cin" varchar(50);`;
    console.log("✔ Added column cin");

    // 3. Add msme_udyam
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "msme_udyam" varchar(100);`;
    console.log("✔ Added column msme_udyam");

    // 4. Add bank_name
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_name" varchar(255);`;
    console.log("✔ Added column bank_name");

    // 5. Add bank_branch
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_branch" varchar(255);`;
    console.log("✔ Added column bank_branch");

    // 6. Add bank_account_number
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_account_number" varchar(50);`;
    console.log("✔ Added column bank_account_number");

    // 7. Add bank_ifsc
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_ifsc" varchar(20);`;
    console.log("✔ Added column bank_ifsc");

    // 8. Add settings jsonb
    await sql`ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;`;
    console.log("✔ Added column settings");

    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

run();
