"use server";

import { db } from "@/lib/drizzle";
import { shops, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "./auth.service";

/**
 * Fetches all shops for the current owner's organization,
 * along with their linked shop manager profile (if any).
 */
export async function getShopsWithManagers() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false as const, error: "Unauthorized." };
  }

  const orgId = user.organizationId;

  // Fetch all shops for this org
  const orgShops = await db
    .select()
    .from(shops)
    .where(eq(shops.organizationId, orgId))
    .orderBy(shops.createdAt);

  // Fetch all shop manager profiles for this org
  const managerProfiles = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.organizationId, orgId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    );

  // Merge shops with their managers
  const shopsWithManagers = orgShops.map((shop) => {
    const manager = managerProfiles.find((p) => p.shopId === shop.id) ?? null;
    return {
      id: shop.id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      isActive: shop.isActive,
      manager: manager
        ? {
            id: manager.id,
            email: manager.email,
            fullName: manager.fullName,
            isActive: manager.isActive,
          }
        : null,
    };
  });

  return { success: true as const, data: shopsWithManagers };
}

/**
 * Updates the password for a shop manager account.
 * Uses Supabase Admin API (bypasses RLS).
 */
export async function updateShopManagerPassword(
  shopId: string,
  newPassword: string
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized." };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  // Find the shop manager profile linked to this shop
  const [managerProfile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.shopId, shopId),
        eq(profiles.organizationId, user.organizationId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    )
    .limit(1);

  if (!managerProfile) {
    return { success: false, error: "No shop manager found for this shop." };
  }

  // Update password via Supabase Admin API
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    managerProfile.id,
    { password: newPassword }
  );

  if (error) {
    console.error("Failed to update shop manager password:", error);
    return { success: false, error: error.message || "Failed to update password." };
  }

  return { success: true };
}

/**
 * Updates the login email for a shop manager account.
 * Updates both Supabase Auth and the profiles table.
 */
export async function updateShopManagerEmail(
  shopId: string,
  newEmail: string
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized." };
  }

  if (!newEmail || !newEmail.includes("@")) {
    return { success: false, error: "Invalid email address." };
  }

  // Find the shop manager profile linked to this shop
  const [managerProfile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.shopId, shopId),
        eq(profiles.organizationId, user.organizationId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    )
    .limit(1);

  if (!managerProfile) {
    return { success: false, error: "No shop manager found for this shop." };
  }

  // Update email via Supabase Admin API
  const supabaseAdmin = createAdminClient();
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    managerProfile.id,
    { email: newEmail, email_confirm: true }
  );

  if (authError) {
    console.error("Failed to update shop manager email in auth:", authError);
    return { success: false, error: authError.message || "Failed to update email." };
  }

  // Update email in profiles table
  await db
    .update(profiles)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(profiles.id, managerProfile.id));

  // Also update the shop email to stay in sync
  await db
    .update(shops)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(shops.id, shopId));

  return { success: true };
}

/**
 * Updates shop details (name, phone, address).
 * Scoped to the current owner's organization.
 */
export async function updateShopDetails(
  shopId: string,
  data: { name?: string; phone?: string; address?: string }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized." };
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.address !== undefined) updateData.address = data.address || null;

  await db
    .update(shops)
    .set(updateData)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.organizationId, user.organizationId)
      )
    );

  return { success: true };
}

/**
 * Creates shop manager login credentials (Supabase Auth account + profiles record)
 * for a shop that doesn't have a manager configured yet.
 */
export async function createShopManagerCredentials(
  shopId: string,
  email: string,
  password: string
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized." };
  }

  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid shop manager email is required." };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  // 1. Verify shop belongs to Owner's organization and doesn't already have a manager
  const [shop] = await db
    .select()
    .from(shops)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!shop) {
    return { success: false, error: "Shop not found or access denied." };
  }

  const [existingManager] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.shopId, shopId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    )
    .limit(1);

  if (existingManager) {
    return { success: false, error: "Shop manager credentials already exist for this shop." };
  }

  // 2. Create Auth User in Supabase Auth via Admin client
  const supabaseAdmin = createAdminClient();
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: `${shop.name} Manager`,
      },
    });

  if (authError || !authData.user) {
    console.error("Failed to create manager via Admin client:", authError);
    return {
      success: false,
      error: authError?.message || "Failed to create shop manager auth account. The email may already be in use.",
    };
  }

  // 3. Create profile in database
  await db.insert(profiles).values({
    id: authData.user.id,
    organizationId: user.organizationId,
    shopId: shop.id,
    fullName: `${shop.name} Manager`,
    email: email,
    role: "SHOP_MANAGER",
  });

  // 4. Update the shop's email to stay in sync
  await db
    .update(shops)
    .set({ email: email, updatedAt: new Date() })
    .where(eq(shops.id, shopId));

  return {
    success: true,
    manager: {
      id: authData.user.id,
      email: email,
      fullName: `${shop.name} Manager`,
      isActive: true,
    },
  };
}
