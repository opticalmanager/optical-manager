import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { db } from "@/lib/drizzle";
import { demoRequests, subscriptions, organizations, profiles } from "@/db/schema";
import { eq, count, and, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin Control Panel | Optical Manager",
  description: "B2B SaaS Platform Control Panel for Optical Manager Super Administrators.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // If unauthenticated or non-Super Admin (e.g. on /admin/login), render full-screen standalone page without sidebar
  if (!isSuperAdmin) {
    return (
      <div data-admin-theme="dark" className="min-h-screen bg-[#0b0f17] text-slate-100 font-sans flex flex-col justify-center items-center p-4">
        {children}
      </div>
    );
  }

  let pendingLeadsCount = 0;
  let expiringCount = 0;
  let orgList: any[] = [];

  try {
    const fourteenDaysLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [[pendingRes], [expiringRes], orgsData] = await Promise.all([
      db.select({ value: count() }).from(demoRequests).where(eq(demoRequests.status, "PENDING")),
      db.select({ value: count() }).from(subscriptions).where(
        and(
          eq(subscriptions.status, "ACTIVE"),
          sql`${subscriptions.currentPeriodEnd} <= ${fourteenDaysLater}`
        )
      ),
      db.select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: subscriptions.plan,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(organizations.id, subscriptions.organizationId))
      .orderBy(desc(organizations.createdAt))
      .limit(30),
    ]);

    pendingLeadsCount = pendingRes?.value ?? 0;
    expiringCount = expiringRes?.value ?? 0;
    orgList = orgsData;
  } catch (err) {
    console.error("Failed to fetch admin sidebar telemetry:", err);
  }

  return (
    <div data-admin-theme="dark" className="flex h-screen overflow-hidden bg-[#0b0f17] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <AdminSidebar 
        adminName={user.fullName || "Super Admin"} 
        pendingLeadsCount={pendingLeadsCount}
        expiringCount={expiringCount}
        organizations={orgList}
      />
      <main className="flex-1 overflow-y-auto bg-[#0b0f17] p-4 sm:p-6 lg:p-7">
        {children}
      </main>
    </div>
  );
}
