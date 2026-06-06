const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("🛑 Database connection string is missing in .env");
  process.exit(1);
}

console.log("🔗 Connecting to database...");
const sql = postgres(connectionString, { ssl: "require" });

const statements = [
  `CREATE INDEX IF NOT EXISTS "customers_shop_id_idx" ON "customers" USING btree ("shop_id");`,
  `CREATE INDEX IF NOT EXISTS "customers_org_id_idx" ON "customers" USING btree ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" USING btree ("phone");`,
  `CREATE INDEX IF NOT EXISTS "inventory_shop_id_idx" ON "inventory" USING btree ("shop_id");`,
  `CREATE INDEX IF NOT EXISTS "inventory_org_id_idx" ON "inventory" USING btree ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "inventory_category_idx" ON "inventory" USING btree ("category");`,
  `CREATE INDEX IF NOT EXISTS "inventory_sku_idx" ON "inventory" USING btree ("sku");`,
  `CREATE INDEX IF NOT EXISTS "inventory_shop_active_idx" ON "inventory" USING btree ("shop_id","is_active");`,
  `CREATE INDEX IF NOT EXISTS "invoices_shop_id_idx" ON "invoices" USING btree ("shop_id");`,
  `CREATE INDEX IF NOT EXISTS "invoices_org_id_idx" ON "invoices" USING btree ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");`,
  `CREATE INDEX IF NOT EXISTS "prescriptions_shop_id_idx" ON "prescriptions" USING btree ("shop_id");`,
  `CREATE INDEX IF NOT EXISTS "prescriptions_org_id_idx" ON "prescriptions" USING btree ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "prescriptions_customer_id_idx" ON "prescriptions" USING btree ("customer_id");`,
  `CREATE INDEX IF NOT EXISTS "profiles_shop_id_idx" ON "profiles" USING btree ("shop_id");`,
  `CREATE INDEX IF NOT EXISTS "profiles_org_id_idx" ON "profiles" USING btree ("organization_id");`
];

async function run() {
  try {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing [${i + 1}/${statements.length}]: ${statement.substring(0, 70)}...`);
      await sql.unsafe(statement);
    }
    console.log("✅ All indexes created successfully!");
  } catch (error) {
    console.error("❌ Error running SQL statements:", error);
  } finally {
    await sql.end();
  }
}

run();
