require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function test() {
  try {
    console.log("Connecting to Supabase...");
    const res = await sql`
      SELECT id, status, amount_paid, balance_due 
      FROM invoices 
      LIMIT 5
    `;
    console.log("Success. Sample invoices:", res);
    
    console.log("Running original query syntax for partially paid: status = 'PENDING' AND amount_paid > 0");
    const test1 = await sql`
      SELECT count(*) 
      FROM invoices 
      WHERE status = 'PENDING' AND amount_paid::numeric > 0
    `;
    console.log("PostgreSQL query count:", test1);
  } catch (err) {
    console.error("Error running test query:", err);
  } finally {
    await sql.end();
  }
}

test();
