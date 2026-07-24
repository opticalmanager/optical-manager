import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const queryClient = postgres(databaseUrl, { prepare: false });

async function list() {
  const result = await queryClient`
    SELECT id, email, full_name, role, organization_id, shop_id 
    FROM profiles;
  `;
  console.log("All profiles in DB:", JSON.stringify(result, null, 2));

  const orgs = await queryClient`
    SELECT id, name, slug FROM organizations;
  `;
  console.log("All orgs in DB:", JSON.stringify(orgs, null, 2));

  const shops = await queryClient`
    SELECT id, organization_id, name, email FROM shops;
  `;
  console.log("All shops in DB:", JSON.stringify(shops, null, 2));

  await queryClient.end();
}

list().catch(console.error);
