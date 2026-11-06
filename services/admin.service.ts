"use server";

import { db } from "@/lib/drizzle";
import { 
  organizations, 
  shops, 
  profiles, 
  subscriptions, 
  demoRequests, 
  invoices,
  prescriptions,
  whatsappDispatchQueue,
  addonUsageLogs,
  customers,
  organizationAddons
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

// ── 1. Platform Overview Telemetry (High-Grade SaaS Intelligence) ──
export async function getPlatformStats() {
  await verifySuperAdmin();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [orgCount] = await db.select({ value: count() }).from(organizations);
  const [shopCount] = await db.select({ value: count() }).from(shops);
  const [activeSubCount] = await db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  const [pendingLeadsCount] = await db.select({ value: count() }).from(demoRequests).where(eq(demoRequests.status, "PENDING"));
  const [approvedLeadsCount] = await db.select({ value: count() }).from(demoRequests).where(eq(demoRequests.status, "APPROVED"));
  const [totalInvoiceSum] = await db.select({ total: sql<string>`COALESCE(SUM(total), 0)`, count: count() }).from(invoices);

  // Velocity metrics
  const [monthInvoiceStats] = await db
    .select({ total: sql<string>`COALESCE(SUM(total), 0)`, count: count() })
    .from(invoices)
    .where(sql`${invoices.createdAt} >= ${startOfMonth}`);

  const [todayInvoiceStats] = await db
    .select({ total: sql<string>`COALESCE(SUM(total), 0)`, count: count() })
    .from(invoices)
    .where(sql`${invoices.createdAt} >= ${startOfToday}`);

  // Operational metrics
  const [prescriptionCount] = await db.select({ value: count() }).from(prescriptions);
  const [whatsappCount] = await db.select({ value: count() }).from(whatsappDispatchQueue);
  const [addonStats] = await db
    .select({ count: count(), cost: sql<string>`COALESCE(SUM(cost_inr), 0)` })
    .from(addonUsageLogs);

  // Expiring in next 14 days
  const [expiringSubCount] = await db
    .select({ value: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "ACTIVE"),
        sql`${subscriptions.currentPeriodEnd} <= ${fourteenDaysLater}`
      )
    );

  // All active subscriptions to calculate MRR / ARR & Plan Distribution
  const activeSubs = await db
    .select({
      plan: subscriptions.plan,
      billingCycle: subscriptions.billingCycle,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "ACTIVE"));

  let calculatedMrr = 0;
  const planDistribution = {
    enterprise: 0,
    pro: 0,
    basic: 0,
    trial: 0,
  };

  const planMonthlyRates: Record<string, number> = {
    ENTERPRISE: 4999,
    PRO: 2499,
    BASIC: 999,
    TRIAL: 0,
  };

  activeSubs.forEach((sub) => {
    const p = (sub.plan || "PRO").toUpperCase();
    if (p === "ENTERPRISE") planDistribution.enterprise++;
    else if (p === "BASIC") planDistribution.basic++;
    else if (p === "TRIAL") planDistribution.trial++;
    else planDistribution.pro++;

    calculatedMrr += planMonthlyRates[p] ?? 2499;
  });

  return {
    totalOrganizations: orgCount.value,
    totalShops: shopCount.value,
    activeSubscriptions: activeSubCount.value,
    pendingLeads: pendingLeadsCount.value,
    approvedLeads: approvedLeadsCount.value,
    totalPlatformRevenue: parseFloat(totalInvoiceSum.total || "0"),
    totalInvoicesCount: totalInvoiceSum.count,
    monthGmv: parseFloat(monthInvoiceStats.total || "0"),
    monthInvoicesCount: monthInvoiceStats.count,
    todayGmv: parseFloat(todayInvoiceStats.total || "0"),
    todayInvoicesCount: todayInvoiceStats.count,
    totalPrescriptionsCount: prescriptionCount.value,
    whatsappMessagesCount: whatsappCount.value,
    gstinLookupsCount: addonStats.count,
    totalAddonCost: parseFloat(addonStats.cost || "0"),
    expiringSubscriptionsCount: expiringSubCount.value,
    mrr: calculatedMrr,
    arr: calculatedMrr * 12,
    planDistribution,
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
    billingStats: {
      totalRevenue: parseFloat(
        (await db.select({ total: sql<string>`COALESCE(SUM(total), 0)` }).from(invoices).where(eq(invoices.organizationId, orgId)))[0]?.total || "0"
      ),
      totalInvoicesCount: (
        await db.select({ value: count() }).from(invoices).where(eq(invoices.organizationId, orgId))
      )[0]?.value ?? 0,
      totalPrescriptions: (
        await db.select({ value: count() }).from(prescriptions).where(eq(prescriptions.organizationId, orgId))
      )[0]?.value ?? 0,
      totalCustomers: (
        await db.select({ value: count() }).from(customers).where(eq(customers.organizationId, orgId))
      )[0]?.value ?? 0,
      recentInvoices: await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          status: invoices.status,
          paymentMethod: invoices.paymentMethod,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(eq(invoices.organizationId, orgId))
        .orderBy(desc(invoices.createdAt))
        .limit(5),
    },
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




// ── 9. Expiring Subscriptions Radar (Churn Prevention) ──
export async function getExpiringSubscriptions() {
  await verifySuperAdmin();
  const now = new Date();
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const subs = await db
    .select({
      id: subscriptions.id,
      organizationId: subscriptions.organizationId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      billingCycle: subscriptions.billingCycle,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPhone: organizations.phone,
    })
    .from(subscriptions)
    .innerJoin(organizations, eq(subscriptions.organizationId, organizations.id))
    .where(
      and(
        eq(subscriptions.status, "ACTIVE"),
        sql`${subscriptions.currentPeriodEnd} <= ${fourteenDaysLater}`
      )
    )
    .orderBy(subscriptions.currentPeriodEnd);

  const enriched = await Promise.all(
    subs.map(async (sub) => {
      const [owner] = await db
        .select({ fullName: profiles.fullName, email: profiles.email })
        .from(profiles)
        .where(and(eq(profiles.organizationId, sub.organizationId), eq(profiles.role, "OWNER")))
        .limit(1);

      const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : now;
      const diffTime = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...sub,
        ownerName: owner?.fullName || "Store Owner",
        ownerEmail: owner?.email || "N/A",
        ownerPhone: sub.orgPhone || "",
        daysRemaining: Math.max(0, daysRemaining),
      };
    })
  );

  return enriched;
}

// ── 10. Platform Activity Pulse (Real-Time SaaS Event Timeline) ──
export interface PlatformActivityItem {
  id: string;
  type: "STORE_ONBOARDED" | "LEAD_RECEIVED" | "ADDON_QUERY";
  title: string;
  description: string;
  timestamp: string;
  badge: string;
  badgeColor: "emerald" | "blue" | "purple" | "amber";
}

export async function getPlatformActivityPulse(): Promise<PlatformActivityItem[]> {
  await verifySuperAdmin();

  // 1. Recent Organizations
  const recentOrgs = await db
    .select({ id: organizations.id, name: organizations.name, createdAt: organizations.createdAt })
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(4);

  // 2. Recent Demo Leads
  const recentLeads = await db
    .select({ id: demoRequests.id, storeName: demoRequests.storeName, city: demoRequests.city, createdAt: demoRequests.createdAt })
    .from(demoRequests)
    .orderBy(desc(demoRequests.createdAt))
    .limit(4);

  // 3. Recent Add-on Lookups
  const recentAddons = await db
    .select({ id: addonUsageLogs.id, identifier: addonUsageLogs.referenceIdentifier, createdAt: addonUsageLogs.createdAt })
    .from(addonUsageLogs)
    .orderBy(desc(addonUsageLogs.createdAt))
    .limit(3);

  const items: PlatformActivityItem[] = [];

  recentOrgs.forEach((o) => {
    items.push({
      id: `org-${o.id}`,
      type: "STORE_ONBOARDED",
      title: o.name,
      description: "New optical retail chain onboarded",
      timestamp: o.createdAt.toISOString(),
      badge: "Tenant Store",
      badgeColor: "emerald",
    });
  });

  recentLeads.forEach((l) => {
    items.push({
      id: `lead-${l.id}`,
      type: "LEAD_RECEIVED",
      title: l.storeName || "Inbound Demo Lead",
      description: `Demo requested from ${l.city || "Website"}`,
      timestamp: l.createdAt.toISOString(),
      badge: "Inbound Lead",
      badgeColor: "amber",
    });
  });

  recentAddons.forEach((a) => {
    items.push({
      id: `addon-${a.id}`,
      type: "ADDON_QUERY",
      title: `GSTIN Lookup: ${a.identifier || "Verified"}`,
      description: "Automated taxpayer verification API call",
      timestamp: a.createdAt.toISOString(),
      badge: "Add-on API",
      badgeColor: "purple",
    });
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
}

// ── 11. Export SaaS Telemetry (CSV) ──
export async function exportSaaSTelemetryAction() {
  await verifySuperAdmin();
  const orgs = await getAllOrganizations();

  const headers = [
    "Organization ID",
    "Store Chain Name",
    "Slug",
    "Owner Full Name",
    "Owner Email",
    "Plan",
    "Subscription Status",
    "Current Period End",
    "Outlets Count",
    "Onboarded Date",
  ];

  const rows = orgs.map((o) => [
    `"${o.id}"`,
    `"${(o.name || "").replace(/"/g, '""')}"`,
    `"${o.slug || ""}"`,
    `"${(o.ownerName || "").replace(/"/g, '""')}"`,
    `"${o.ownerEmail || ""}"`,
    `"${o.plan || "PRO"}"`,
    `"${o.status || "ACTIVE"}"`,
    `"${o.currentPeriodEnd ? new Date(o.currentPeriodEnd).toISOString().split("T")[0] : "N/A"}"`,
    `"${o.shopsCount || 1}"`,
    `"${o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "N/A"}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return { 
    success: true, 
    csv: csvContent, 
    filename: `optical_manager_saas_telemetry_${new Date().toISOString().split("T")[0]}.csv` 
  };
}


// ── 12. Platform Add-on Services Overview ──
export async function getPlatformAddonsOverview() {
  await verifySuperAdmin();

  const [totalStats] = await db
    .select({
      count: count(),
      totalCost: sql<string>`COALESCE(SUM(cost_inr), 0)`,
    })
    .from(addonUsageLogs);

  const [cachedStats] = await db
    .select({ count: count() })
    .from(addonUsageLogs)
    .where(eq(addonUsageLogs.isCached, true));

  const [whatsappTotal] = await db
    .select({ count: count() })
    .from(whatsappDispatchQueue);

  const totalQueries = totalStats?.count ?? 0;
  const cachedHits = cachedStats?.count ?? 0;
  const liveCalls = totalQueries - cachedHits;
  const cacheHitRatio = totalQueries > 0 ? Math.round((cachedHits / totalQueries) * 100) : 0;

  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      plan: subscriptions.plan,
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
    .orderBy(desc(organizations.createdAt));

  const tenantMatrix = await Promise.all(
    allOrgs.map(async (org) => {
      const [addonEntry] = await db
        .select()
        .from(organizationAddons)
        .where(
          and(
            eq(organizationAddons.organizationId, org.id),
            eq(organizationAddons.addonKey, "GST_AUTOFETCH")
          )
        )
        .limit(1);

      const [usage] = await db
        .select({
          count: count(),
          cost: sql<string>`COALESCE(SUM(cost_inr), 0)`,
        })
        .from(addonUsageLogs)
        .where(eq(addonUsageLogs.organizationId, org.id));

      const isEnabled = addonEntry?.isEnabled ?? false;
      const costPerCall = (addonEntry?.config as any)?.costPerCall ?? "0.40";

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || "PRO",
        gstAddonEnabled: isEnabled,
        costPerCall,
        totalCalls: usage?.count ?? 0,
        totalCostInr: parseFloat(usage?.cost || "0"),
        createdAt: org.createdAt.toISOString(),
      };
    })
  );

  return {
    telemetry: {
      totalQueries,
      cachedHits,
      liveCalls,
      cacheHitRatio,
      totalCostInr: parseFloat(totalStats?.totalCost || "0"),
      whatsappDispatches: whatsappTotal?.count ?? 0,
    },
    tenants: tenantMatrix,
  };
}
