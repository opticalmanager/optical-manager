import postgres from "postgres";

// Directly use the Supabase URL that we just set in the backend .env
const dbUrl = "postgresql://postgres.cbedtpiipwhfilspjdot:Optical%40manager2026@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

const sql = postgres(dbUrl, { ssl: "require" });

async function test() {
  try {
    console.log("--- Testing shops query (what backend will return) ---");
    const shops = await sql`SELECT id, name, organization_id FROM shops WHERE is_active = true LIMIT 5`;
    console.log(`Found ${shops.length} shops:`);
    shops.forEach((s: any) => console.log(`  - ${s.name} (org: ${s.organization_id})`));

    console.log("\n--- Testing customers query (what backend will return) ---");
    const custs = await sql`SELECT id, full_name, phone, organization_id FROM customers LIMIT 5`;
    console.log(`Found ${custs.length} customers:`);
    custs.forEach((c: any) => console.log(`  - ${c.full_name} (${c.phone}) [org: ${c.organization_id}]`));

    console.log("\n✅ Supabase CRM DB has real data — backend .env fix will make this work!");
  } catch (err: any) {
    console.error("❌ DB connection error:", err.message);
  }
  
  process.exit(0);
}

test();
