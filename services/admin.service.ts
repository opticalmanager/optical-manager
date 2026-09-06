"use server";

import { db } from "@/lib/drizzle";
import { 
  organizations, 
  shops, 
  profiles, 
  subscriptions, 
  demoRequests, 
  invoices
} from "@/db/schema";
import { eq, count, sql, desc, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";


// ── Security Check Helper ──
export async function verifySuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/admin/login");
  }
  return user;
}

// ── 1. Platform Overview Telemetry ──
export async function getPlatformStats() {
  await verifySuperAdmin();

  const [orgCount] = await db.select({ value: count() }).from(organizations);
  const [shopCount] = await db.select({ value: count() }).from(shops);
  const [activeSubCount] = await db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  const [pendingLeadsCount] = await db.select({ value: count() }).from(demoRequests).where(eq(demoRequests.status, "PENDING"));
  const [approvedLeadsCount] = await db.select({ value: count() }).from(demoRequests).where(eq(demoRequests.status, "APPROVED"));
  const [totalInvoiceSum] = await db.select({ total: sql<string>`COALESCE(SUM(total), 0)` }).from(invoices);

  return {
    totalOrganizations: orgCount.value,
    totalShops: shopCount.value,
    activeSubscriptions: activeSubCount.value,
    pendingLeads: pendingLeadsCount.value,
    approvedLeads: approvedLeadsCount.value,
    totalPlatformRevenue: parseFloat(totalInvoiceSum.total || "0"),
  };
}

// ── 2. Tenant Organizations List ──
export async function getAllOrganizations() {
  await verifySuperAdmin();

  const orgsList = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      notes: subscriptions.notes,
      maxShops: subscriptions.maxShops,
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
    .orderBy(desc(organizations.createdAt));

  // Enrich each org with shops count and owner details
  const enriched = await Promise.all(
    orgsList.map(async (org) => {
      const [shopC] = await db
        .select({ value: count() })
        .from(shops)
        .where(eq(shops.organizationId, org.id));

      const [ownerProfile] = await db
        .select({ fullName: profiles.fullName, email: profiles.email })
        .from(profiles)
        .where(and(eq(profiles.organizationId, org.id), eq(profiles.role, "OWNER")))
        .limit(1);

      return {
        ...org,
        shopsCount: shopC.value,
        ownerName: ownerProfile?.fullName || "Unassigned",
        ownerEmail: ownerProfile?.email || "N/A",
      };
    })
  );

  return enriched;
}

// ── 3. Single Tenant Organization Details ──
export async function getOrganizationDetailsById(orgId: string) {
  await verifySuperAdmin();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return null;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  const [ownerProfile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.organizationId, orgId), eq(profiles.role, "OWNER")))
    .limit(1);

  const orgShops = await db
    .select()
    .from(shops)
    .where(eq(shops.organizationId, orgId))
    .orderBy(desc(shops.createdAt));

  const managersList = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.organizationId, orgId), eq(profiles.role, "SHOP_MANAGER")));

  // Map managers to shops
  const shopsWithManagers = orgShops.map((shop) => {
    const manager = managersList.find((m) => m.shopId === shop.id);
    return {
      ...shop,
      managerName: manager?.fullName || "Unassigned",
      managerEmail: manager?.email || shop.email || "N/A",
    };
  });

  return {
    organization: org,
    subscription: sub || {
      plan: "TRIAL",
      status: "ACTIVE",
      currentPeriodStart: org.createdAt,
      currentPeriodEnd: new Date(new Date(org.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000),
      maxShops: 5,
      maxUsers: 10,
      notes: null,
    },
    owner: ownerProfile || {
      fullName: "Primary Owner",
      email: "N/A",
      createdAt: org.createdAt,
    },
    shops: shopsWithManagers,
  };
}

// ── 4. Subscription Extensions & Suspension ──
export async function extendSubscription(
  organizationId: string, 
  additionalMonths: number, 
  adminNotes?: string
) {
  await verifySuperAdmin();

  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  const now = new Date();
  let baseDate = existingSub?.currentPeriodEnd && new Date(existingSub.currentPeriodEnd) > now
    ? new Date(existingSub.currentPeriodEnd)
    : now;

  const newPeriodEnd = new Date(baseDate);
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + additionalMonths);

  const updatedNotes = adminNotes 
    ? `${existingSub?.notes ? existingSub.notes + "\n" : ""}[${new Date().toISOString().split("T")[0]}] Added +${additionalMonths}m: ${adminNotes}`
    : existingSub?.notes;

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        status: "ACTIVE",
        currentPeriodEnd: newPeriodEnd,
        notes: updatedNotes,
        updatedAt: now,
      })
      .where(eq(subscriptions.organizationId, organizationId));
  } else {
    await db.insert(subscriptions).values({
      organizationId,
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      notes: updatedNotes,
    });
  }

  return { success: true, newPeriodEnd };
}

export async function toggleStoreSuspension(organizationId: string) {
  await verifySuperAdmin();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  const newStatus = sub?.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  if (sub) {
    await db
      .update(subscriptions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(subscriptions.organizationId, organizationId));
  } else {
    await db.insert(subscriptions).values({
      organizationId,
      plan: "PRO",
      status: "SUSPENDED",
    });
  }

  return { success: true, newStatus };
}

// ── 5. Demo Requests CRM ──
export async function getDemoRequests() {
  await verifySuperAdmin();

  return db
    .select()
    .from(demoRequests)
    .orderBy(desc(demoRequests.createdAt));
}

export async function updateDemoRequestStatus(
  id: string, 
  status: "PENDING" | "CONTACTED" | "DEMO_SCHEDULED" | "APPROVED" | "REJECTED",
  adminNotes?: string
) {
  await verifySuperAdmin();

  await db
    .update(demoRequests)
    .set({
      status,
      notes: adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(demoRequests.id, id));

  return { success: true };
}

// ── 6. Provision New Tenant Store (With Auth Account & Subscription) ──
export interface ProvisionTenantStorePayload {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  phone?: string;
  city?: string;
  address?: string;
  initialShopName?: string;
  plan?: "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
  validityMonths?: number;
  maxShops?: number;
  adminNotes?: string;
  leadId?: string;
}

export async function provisionNewTenantStore(payload: ProvisionTenantStorePayload) {
  await verifySuperAdmin();

  const {
    organizationName,
    ownerName,
    ownerEmail,
    ownerPassword,
    phone,
    city,
    address,
    initialShopName,
    plan = "PRO",
    validityMonths = 12,
    maxShops = 5,
    adminNotes,
    leadId,
  } = payload;

  if (!organizationName?.trim()) {
    return { success: false, error: "Store / Organization name is required." };
  }
  if (!ownerName?.trim()) {
    return { success: false, error: "Owner full name is required." };
  }
  if (!ownerEmail?.trim() || !ownerEmail.includes("@")) {
    return { success: false, error: "A valid owner login email is required." };
  }
  if (!ownerPassword || ownerPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const normalizedEmail = ownerEmail.trim().toLowerCase();

  // Check if email already exists in profiles
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1);

  if (existingProfile) {
    return { success: false, error: "An account with this email address already exists in Optical Manager." };
  }

  // 1. Create Auth User in Supabase Auth via Admin Client
  const supabaseAdmin = createAdminClient();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ownerName.trim(),
      role: "OWNER",
    },
  });

  if (authError || !authData.user) {
    console.error("Supabase Admin user creation error:", authError);
    return {
      success: false,
      error: authError?.message || "Failed to create user authentication account. The email may already be in use.",
    };
  }

  const authUserId = authData.user.id;

  try {
    // 2. Generate unique slug
    let slug = slugify(organizationName.trim());
    if (!slug) slug = `store-${Math.floor(1000 + Math.random() * 9000)}`;

    const [existingSlug] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Insert Organization
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: organizationName.trim(),
        slug,
        email: normalizedEmail,
        phone: phone?.trim() || null,
        address: address?.trim() || city?.trim() || null,
        onboardingCompleted: true,
      })
      .returning();

    // 4. Insert Initial Shop Branch
    const shopName = initialShopName?.trim() || `${organizationName.trim()} - Main Branch`;
    const [newShop] = await db
      .insert(shops)
      .values({
        organizationId: newOrg.id,
        name: shopName,
        phone: phone?.trim() || null,
        email: normalizedEmail,
        address: address?.trim() || city?.trim() || null,
        isActive: true,
      })
      .returning();

    // 5. Insert Owner Profile
    await db.insert(profiles).values({
      id: authUserId,
      organizationId: newOrg.id,
      shopId: newShop.id,
      fullName: ownerName.trim(),
      email: normalizedEmail,
      role: "OWNER",
      isActive: true,
    });

    // 6. Calculate Subscription Validity Period
    const now = new Date();
    const currentPeriodEnd = new Date(now);

    if (plan === "TRIAL") {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (validityMonths || 12));
    }

    const noteLog = adminNotes?.trim() 
      ? `Provisioned by Super Admin on ${now.toISOString().split("T")[0]}: ${adminNotes.trim()}`
      : `Provisioned by Super Admin on ${now.toISOString().split("T")[0]}`;

    await db.insert(subscriptions).values({
      organizationId: newOrg.id,
      plan: plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd,
      trialEndsAt: plan === "TRIAL" ? currentPeriodEnd : null,
      maxShops: maxShops || 5,
      maxUsers: (maxShops || 5) * 3,
      billingCycle: (validityMonths || 12) >= 12 ? "YEARLY" : "MONTHLY",
      notes: noteLog,
    });

    // 7. If linked from a lead, mark lead as APPROVED
    if (leadId) {
      await db
        .update(demoRequests)
        .set({
          status: "APPROVED",
          notes: `Provisioned as store: ${organizationName.trim()} (${newOrg.id})`,
          updatedAt: now,
        })
        .where(eq(demoRequests.id, leadId));
    }

    return {
      success: true,
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        createdAt: newOrg.createdAt,
        plan,
        status: "ACTIVE",
        currentPeriodEnd,
        notes: noteLog,
        maxShops: maxShops || 5,
        shopsCount: 1,
        ownerName: ownerName.trim(),
        ownerEmail: normalizedEmail,
      },
    };
  } catch (dbError: any) {
    console.error("Database error during tenant store provisioning, rolling back auth user:", dbError);
    // Rollback: delete created auth user to avoid orphan accounts
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((delErr) => {
      console.error("Failed to rollback auth user:", delErr);
    });

    return {
      success: false,
      error: dbError?.message || "Failed to provision tenant store in database. Please check all fields and try again.",
    };
  }
}

// ── 7. Add Store Outlet to Existing Organization ──
export interface AddShopOutletPayload {
  organizationId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export async function addShopOutletToOrganization(payload: AddShopOutletPayload) {
  await verifySuperAdmin();

  const { organizationId, name, address, phone, email } = payload;

  if (!organizationId) {
    return { success: false, error: "Organization ID is required." };
  }
  if (!name?.trim()) {
    return { success: false, error: "Outlet / Branch name is required." };
  }

  // Check organization exists
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return { success: false, error: "Organization not found." };
  }

  // Insert shop
  const [newShop] = await db
    .insert(shops)
    .values({
      organizationId,
      name: name.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      isActive: true,
    })
    .returning();

  return {
    success: true,
    shop: {
      ...newShop,
      managerName: "Unassigned",
      managerEmail: newShop.email || "N/A",
    },
  };
}

// ── 8. Delete Single Shop Outlet (Cascade Shop Data Only) ──
export async function deleteShopOutlet(shopId: string, organizationId: string) {
  await verifySuperAdmin();

  if (!shopId || !organizationId) {
    return { success: false, error: "Shop ID and Organization ID are required." };
  }

  // 1. Verify target shop exists under the organization
  const [targetShop] = await db
    .select({ id: shops.id, name: shops.name })
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.organizationId, organizationId)))
    .limit(1);

  if (!targetShop) {
    return { success: false, error: "Shop outlet not found or does not belong to this organization." };
  }

  // 2. Clean up any shop manager auth accounts associated with this shop
  const linkedManagers = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.organizationId, organizationId),
        eq(profiles.shopId, shopId),
        eq(profiles.role, "SHOP_MANAGER")
      )
    );

  if (linkedManagers.length > 0) {
    const supabaseAdmin = createAdminClient();
    for (const manager of linkedManagers) {
      await supabaseAdmin.auth.admin.deleteUser(manager.id).catch((err) => {
        console.error(`Failed to delete auth account for manager ${manager.id}:`, err);
      });
    }
  }

  // 3. Delete the shop row
  // Database foreign keys with `onDelete: "cascade"` will automatically purge
  // inventory, invoices, invoice_items, prescriptions, appointments, orders, sales_returns, etc. for this shop ONLY.
  await db
    .delete(shops)
    .where(and(eq(shops.id, shopId), eq(shops.organizationId, organizationId)));

  return {
    success: true,
    deletedShopId: shopId,
    deletedShopName: targetShop.name,
  };
}


