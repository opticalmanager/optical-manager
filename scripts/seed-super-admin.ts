import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "../db/schema";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error("❌ Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL).");
  process.exit(1);
}

// Initialize Supabase Admin Client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Initialize Drizzle ORM client
const queryClient = postgres(databaseUrl, { prepare: false });
const db = drizzle(queryClient, { schema });

async function seedSuperAdmin() {
  const args = process.argv.slice(2);
  let email = "";
  let password = "";
  let name = "Super Admin";

  args.forEach((arg) => {
    if (arg.startsWith("email=")) email = arg.split("=")[1];
    if (arg.startsWith("password=")) password = arg.split("=")[1];
    if (arg.startsWith("name=")) name = arg.split("=")[1];
  });

  if (!email || !password) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔐 OPTICAL MANAGER — SUPER ADMIN CREATION CLI (METHOD 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Usage:
  npx tsx scripts/seed-super-admin.ts email="admin@opticalmanager.in" password="YourSecurePassword123!" name="Gaurav Tiwari"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
    process.exit(1);
  }

  console.log(`\n⏳ Provisioning Super Admin account for [${email}]...`);

  try {
    // 0. Ensure PostgreSQL enum type has 'SUPER_ADMIN' value
    try {
      await queryClient`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`;
    } catch (e: any) {
      // Ignore if already exists or invalid in transaction block
    }
    // 1. Create or fetch user in Supabase Auth via Admin API
    let userId = "";
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list Supabase users: ${listError.message}`);
    }

    const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      console.log(`ℹ️ User [${email}] already exists in Supabase Auth (ID: ${existingUser.id}). Updating password & role...`);
      userId = existingUser.id;

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { role: "SUPER_ADMIN", full_name: name },
      });

      if (updateAuthError) {
        throw new Error(`Failed to update Auth password: ${updateAuthError.message}`);
      }
    } else {
      console.log(`✨ Creating new user in Supabase Auth...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: "SUPER_ADMIN", full_name: name },
      });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create Auth user: ${createError?.message}`);
      }
      userId = newUser.user.id;
    }

    // 2. Insert or update record in Drizzle 'profiles' table
    const [existingProfile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);

    if (existingProfile) {
      await db
        .update(schema.profiles)
        .set({
          role: "SUPER_ADMIN",
          fullName: name,
          email: email,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.id, userId));
      console.log(`✅ Updated existing profile ID ${userId} to SUPER_ADMIN role.`);
    } else {
      await db.insert(schema.profiles).values({
        id: userId,
        organizationId: null as any, // Platform super admin has no single shop org restriction
        shopId: null,
        fullName: name,
        email: email,
        role: "SUPER_ADMIN",
        isActive: true,
      });
      console.log(`✅ Inserted new SUPER_ADMIN profile ID ${userId}.`);
    }

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🎉 SUPER ADMIN CREATED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Email:    ${email}
 Role:     SUPER_ADMIN
 Status:   ACTIVE
 URL:      admin.opticalmanager.in / /admin/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  } catch (err: any) {
    console.error("❌ Error seeding Super Admin:", err?.message || err);
  } finally {
    await queryClient.end();
    process.exit(0);
  }
}

seedSuperAdmin();
