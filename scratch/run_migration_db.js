const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load the .env file from the project root
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
    console.log("Reading SQL migration file...");
    const migrationSql = fs.readFileSync(
      path.join(__dirname, "../db/migrations/0010_polite_senator_kelly.sql"),
      "utf8"
    );
    
    // Split statements by --> statement-breakpoint
    const statements = migrationSql.split("--> statement-breakpoint");
    
    console.log(`Executing ${statements.length} migration statements...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`Executing statement ${i + 1}:\n${stmt.substring(0, 100)}...\n`);
      await sql.unsafe(stmt);
    }
    
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

run();
