"use server";

import { db } from "@/lib/drizzle";
import { organizations, shops, profiles } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getCurrentUser } from "./auth.service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server action to update organization details during onboarding Step 1.
 */
export async function updateOrganizationAction(data: {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Unauthorized. Only owners can complete onboarding." };
    }

    const orgId = user.organizationId;
    if (!orgId) {
      return { success: false, error: "No organization associated with your profile." };
    }

    // Check slug uniqueness across other onboarding completed orgs
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.slug, data.slug),
          ne(organizations.id, orgId),
          eq(organizations.onboardingCompleted, true)
        )
      )
      .limit(1);

    if (existingOrg) {
      return { success: false, error: "This web slug is already taken. Please choose another one." };
    }

    // Update organization details
    await db
      .update(organizations)
      .set({
        name: data.name,
        slug: data.slug,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    return { success: true };
  } catch (error: any) {
    console.error("updateOrganizationAction error:", error);
    return { success: false, error: error.message || "Failed to save organization details." };
  }
}

/**
 * Server action to insert the first shop and complete onboarding Step 2.
 * Also creates a Supabase Auth account + profile for the shop manager.
 */
export async function createFirstShopAction(data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string; // Optional — becomes the shop manager's login email
  managerPassword?: string; // Optional — shop manager's login password
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Unauthorized. Only owners can complete onboarding." };
    }

    const orgId = user.organizationId;
    if (!orgId) {
      return { success: false, error: "No organization associated with your profile." };
    }

    const hasCredentials = !!(data.email && data.managerPassword);

    if (hasCredentials) {
      if (!data.email || !data.email.includes("@")) {
        return { success: false, error: "A valid shop email is required for the shop manager login." };
      }

      if (!data.managerPassword || data.managerPassword.length < 8) {
        return { success: false, error: "Shop manager password must be at least 8 characters." };
      }
    }

    // 1. Insert the first shop
    const [newShop] = await db
      .insert(shops)
      .values({
        organizationId: orgId,
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        isActive: true,
      })
      .returning();

    if (hasCredentials && data.email && data.managerPassword) {
      // 2. Create shop manager auth account via Supabase Admin API
      const supabaseAdmin = createAdminClient();
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.managerPassword,
          email_confirm: true, // Pre-confirm — no verification email sent
          user_metadata: {
            full_name: `${data.name} Manager`,
          },
        });

      if (authError || !authData.user) {
        // Rollback: delete the shop we just created
        await db.delete(shops).where(eq(shops.id, newShop.id));
        console.error("Failed to create shop manager auth account:", authError);
        return {
          success: false,
          error: authError?.message || "Failed to create shop manager account. The email may already be in use.",
        };
      }

      // 3. Insert shop manager profile
      await db.insert(profiles).values({
        id: authData.user.id, // Links to auth.users.id
        organizationId: orgId,
        shopId: newShop.id,
        fullName: `${data.name} Manager`,
        email: data.email,
        role: "SHOP_MANAGER",
      });
    }


    // 4. Set the owner's default shopId in their profile
    await db
      .update(profiles)
      .set({
        shopId: newShop.id,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id));

    // 5. Mark organization onboarding as complete
    await db
      .update(organizations)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    return { success: true, shopId: newShop.id };
  } catch (error: any) {
    console.error("createFirstShopAction error:", error);
    return { success: false, error: error.message || "Failed to set up your first shop and finalize onboarding." };
  }
}

