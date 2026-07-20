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
