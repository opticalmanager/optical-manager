import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { shops, customers, inventory, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StatCard } from "@/components/owner/StatCard";
import { RecentCustomers } from "@/components/owner/RecentCustomers";
import { LowStockAlert } from "@/components/owner/LowStockAlert";
import { QuickActions } from "@/components/owner/QuickActions";
import { Users, Store, Package, Calendar } from "lucide-react";

export default async function OwnerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const orgId = user.organizationId;

  // 1. Fetch data in parallel
  const [
    dbShops,
    dbCustomers,
    dbInventory,
    dbSubscription
  ] = await Promise.all([
    db.select().from(shops).where(eq(shops.organizationId, orgId)),
    db.select().from(customers).where(eq(customers.organizationId, orgId)),
    db.select().from(inventory).where(eq(inventory.organizationId, orgId)),
    db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).limit(1)
  ]);

  // 2. Process Statistics / Counts
  const totalCustomersCount = dbCustomers.length;
  const activeShopsCount = dbShops.filter(s => s.isActive).length;
  
  // Calculate total stock items
  const totalStockQuantity = dbInventory.reduce((acc, item) => acc + item.quantity, 0);

  // Calculate Trial days remaining
  let trialDaysLeft = 8; // Default fallback
  if (dbSubscription.length > 0 && dbSubscription[0].trialEndsAt) {
    const trialEnd = new Date(dbSubscription[0].trialEndsAt);
    const diffTime = trialEnd.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // 3. Low stock alerts (Actual check: quantity < minQuantity)
  const lowStockItems = dbInventory.filter(item => item.quantity < item.minQuantity);

  // 4. Sorted Recent Customers
  const sortedRecentCustomers = [...dbCustomers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      createdAt: c.createdAt,
      shopName: dbShops.find(s => s.id === c.shopId)?.name || "Main Shop",
    }));

  // ==========================================
  // 5. High-Quality Mock Data Fallback
  // (Triggered if database records are empty, satisfying user's comment "yes you can add some moc data")
  // ==========================================
  const useMockData = totalCustomersCount === 0 && dbInventory.length === 0;

  const displayCustomersCount = useMockData ? 128 : totalCustomersCount;
  const displayShopsCount = useMockData ? 3 : activeShopsCount;
  const displayStockCount = useMockData ? 542 : totalStockQuantity;

  const displayRecentCustomers = useMockData ? [
    {
      id: "mock-1",
      fullName: "Arjun Mehta",
      phone: "9876543210",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      shopName: "Vision Care Bandra",
    },
    {
      id: "mock-2",
      fullName: "Priya Sharma",
      phone: "9812345678",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      shopName: "Optical Precision Andheri",
    },
    {
      id: "mock-3",
      fullName: "Rajesh Patel",
      phone: "9123456789",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      shopName: "Vision Care Bandra",
    },
    {
      id: "mock-4",
      fullName: "Sneha Reddy",
      phone: "9988776655",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
      shopName: "Colaba Eye Clinic",
    },
    {
      id: "mock-5",
      fullName: "Amit Verma",
      phone: "9898989898",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
      shopName: "Optical Precision Andheri",
    }
  ] : sortedRecentCustomers;

  const displayLowStockAlerts = useMockData ? [
    {
      id: "mock-ls-1",
      name: "Ray-Ban Aviator Classic (Gold)",
      category: "FRAME",
      quantity: 2,
      minQuantity: 5,
    },
    {
      id: "mock-ls-2",
      name: "Crizal Prevencia Single Vision 1.56",
      category: "LENS",
      quantity: 1,
      minQuantity: 4,
    },
    {
      id: "mock-ls-3",
      name: "Acuvue Oasys 2-Week (6 lenses)",
      category: "CONTACT_LENS",
      quantity: 3,
      minQuantity: 8,
    },
    {
      id: "mock-ls-4",
      name: "Bausch & Lomb Biotrue Solution 300ml",
      category: "SOLUTION",
      quantity: 0,
      minQuantity: 5,
    }
  ] : lowStockItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    minQuantity: item.minQuantity
  }));

  return (
    <div className="space-y-8">
      {/* Top Banner Greeting */}
      <div className="space-y-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          Good morning, {user.fullName.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Here&apos;s what&apos;s happening in your optical store organization today.
        </p>
        
        {useMockData && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Showing Demo Analytics (Database Empty)
          </div>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={displayCustomersCount}
          icon={Users}
          trend={useMockData ? { value: "12%", isPositive: true } : undefined}
          color="indigo"
          description={useMockData ? "Registered shoppers" : "Across all stores"}
        />
        <StatCard
          title="Active Shops"
          value={displayShopsCount}
          icon={Store}
          color="emerald"
          description="Operational branches"
        />
        <StatCard
          title="Items in Stock"
          value={displayStockCount}
          icon={Package}
          color="amber"
          description="Frames, lenses & solution"
        />
        <StatCard
          title="Subscription Trial"
          value={`${trialDaysLeft} days`}
          icon={Calendar}
          color="blue"
          description="Premium access remaining"
        />
      </div>

      {/* Main Grid: Recent Customers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Customers widget */}
        <RecentCustomers customers={displayRecentCustomers} />

        {/* Low Stock Alerts widget */}
        <LowStockAlert items={displayLowStockAlerts} />
      </div>

      {/* Quick Actions Panel */}
      <QuickActions />
    </div>
  );
}
