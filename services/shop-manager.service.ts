"use server";

import { db } from "@/lib/drizzle";
import { shops, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "./auth.service";

import { defaultFullPermissions, type ModulePermissions } from "@/db/schema/profiles";

export interface StaffProfileInfo {
  id: string;
  email: string;
  fullName: string;
  customRoleName: string | null;
  permissions: ModulePermissions;
  isActive: boolean;
  createdAt: Date;
}

export interface ShopWithStaffData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  staffCount: number;
  manager: StaffProfileInfo | null;
  staffList: StaffProfileInfo[];
}

/**
 * Fetches all shops for the current owner's organization,
 * along with their linked staff profiles and permission assignments.
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

  // Fetch all staff profiles for this org
  const staffProfiles = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.organizationId, orgId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    )
    .orderBy(profiles.createdAt);

  // Merge shops with their staff profiles
  const shopsWithStaff: ShopWithStaffData[] = orgShops.map((shop) => {
    const shopStaff = staffProfiles.filter((p) => p.shopId === shop.id).map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.fullName,
      customRoleName: p.customRoleName || "Store Manager",
      permissions: (p.permissions as ModulePermissions) || defaultFullPermissions,
      isActive: p.isActive,
      createdAt: p.createdAt,
    }));

    const primaryManager = shopStaff[0] || null;

    return {
      id: shop.id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      isActive: shop.isActive,
      staffCount: shopStaff.length,
      manager: primaryManager,
      staffList: shopStaff,
    };
  });

  return { success: true as const, data: shopsWithStaff };
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

/**
 * Creates a new staff role account for a specific shop outlet with customized module permissions.
 */
export async function createShopStaffAccount(payload: {
  shopId: string;
  email: string;
  password: string;
  fullName: string;
  customRoleName?: string;
  permissions?: ModulePermissions;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { shopId, email, password, fullName, customRoleName = "Store Manager", permissions = defaultFullPermissions } = payload;

  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  if (!fullName || fullName.trim().length === 0) {
    return { success: false, error: "Full name is required." };
  }

  // 1. Verify shop belongs to owner's organization
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

  // 2. Create Auth user via Supabase Admin
  const supabaseAdmin = createAdminClient();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
    },
  });

  if (authError || !authData.user) {
    console.error("Failed to create staff auth user:", authError);
    return {
      success: false,
      error: authError?.message || "Failed to create user account. Email may already be registered.",
    };
  }

  // 3. Create profile with assigned permissions and role
  const [createdProfile] = await db
    .insert(profiles)
    .values({
      id: authData.user.id,
      organizationId: user.organizationId,
      shopId: shop.id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: "SHOP_MANAGER",
      customRoleName: customRoleName.trim(),
      permissions: permissions,
      isActive: true,
    })
    .returning();

  return {
    success: true,
    staff: {
      id: createdProfile.id,
      email: createdProfile.email,
      fullName: createdProfile.fullName,
      customRoleName: createdProfile.customRoleName,
      permissions: (createdProfile.permissions as ModulePermissions) || defaultFullPermissions,
      isActive: createdProfile.isActive,
      createdAt: createdProfile.createdAt,
    },
  };
}

/**
 * Updates staff member permissions and custom role name.
 */
export async function updateStaffPermissions(payload: {
  profileId: string;
  fullName?: string;
  customRoleName?: string;
  permissions: ModulePermissions;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { profileId, fullName, customRoleName, permissions } = payload;

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingProfile) {
    return { success: false, error: "Staff member not found or access denied." };
  }

  const updateFields: Record<string, unknown> = {
    permissions: permissions,
    updatedAt: new Date(),
  };

  if (fullName) updateFields.fullName = fullName.trim();
  if (customRoleName) updateFields.customRoleName = customRoleName.trim();

  const [updated] = await db
    .update(profiles)
    .set(updateFields)
    .where(eq(profiles.id, profileId))
    .returning();

  return {
    success: true,
    staff: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      customRoleName: updated.customRoleName,
      permissions: (updated.permissions as ModulePermissions) || defaultFullPermissions,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    },
  };
}

/**
 * Updates password for any specific staff profile by ID.
 */
export async function updateStaffPasswordById(payload: {
  profileId: string;
  newPassword: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { profileId, newPassword } = payload;

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!profile) {
    return { success: false, error: "Staff member not found or access denied." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
    password: newPassword,
  });

  if (error) {
    console.error("Error updating staff password:", error);
    return { success: false, error: error.message || "Failed to update password." };
  }

  return { success: true };
}

/**
 * Toggles staff member active/inactive status.
 */
export async function toggleStaffStatus(payload: {
  profileId: string;
  isActive: boolean;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { profileId, isActive } = payload;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!profile) {
    return { success: false, error: "Staff member not found." };
  }

  await db
    .update(profiles)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(profiles.id, profileId));

  return { success: true };
}

/**
 * Deletes a staff account from auth and database.
 */
export async function deleteStaffAccount(payload: { profileId: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, error: "Unauthorized access." };
  }

  const { profileId } = payload;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!profile) {
    return { success: false, error: "Staff member not found." };
  }

  // Delete from Supabase Auth
  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.auth.admin.deleteUser(profileId);

  // Delete from database
  await db.delete(profiles).where(eq(profiles.id, profileId));

  return { success: true };
}

