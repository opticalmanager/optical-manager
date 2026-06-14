const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Error: DIRECT_DATABASE_URL or DATABASE_URL not found.");
  process.exit(1);
}

console.log("Connecting to database...");
const sql = postgres(dbUrl);

async function run() {
  try {
    console.log("Adding is_rescheduled column to invoices...");
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_rescheduled boolean NOT NULL DEFAULT false;`;
    console.log("Column added successfully!");
  } catch (error) {
    console.error("Failed to add column:", error);
  } finally {
    await sql.end();
  }
}

run();
