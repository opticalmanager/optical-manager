import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import { shops, customers, inventory, subscriptions, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StatCard } from "@/components/owner/StatCard";
import { LowStockAlert } from "@/components/owner/LowStockAlert";
import { QuickActions } from "@/components/owner/QuickActions";
import { RevenueTrendChart } from "@/components/owner/RevenueTrendChart";
import { StockValuationDonut } from "@/components/owner/StockValuationDonut";
import { ShopPerformanceTable } from "@/components/owner/ShopPerformanceTable";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  Store,
  Package,
  Calendar,
  IndianRupee,
  FileText,
  Clock,
  Shield,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default async function OwnerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const orgId = user.organizationId;

  // 1. Fetch data in parallel
  const [
    dbShops,
    dbCustomers,
    dbInventory,
    dbSubscription,
    dbInvoices
  ] = await Promise.all([
    db.select().from(shops).where(eq(shops.organizationId, orgId)),
    db.select().from(customers).where(eq(customers.organizationId, orgId)),
    db.select().from(inventory).where(eq(inventory.organizationId, orgId)),
    db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).limit(1),
    db.select().from(invoices).where(eq(invoices.organizationId, orgId))
  ]);

  // 2. Determine if database is empty to fallback to mock data
  const totalCustomersCount = dbCustomers.length;
  const activeShopsCount = dbShops.filter(s => s.isActive).length;
  const totalStockQuantity = dbInventory.reduce((acc, item) => acc + item.quantity, 0);
  const useMockData = totalCustomersCount === 0 && dbInventory.length === 0 && dbInvoices.length === 0;

  // Calculate Trial days remaining
  let trialDaysLeft = 8;
  if (dbSubscription.length > 0 && dbSubscription[0].trialEndsAt) {
    const trialEnd = new Date(dbSubscription[0].trialEndsAt);
    const diffTime = trialEnd.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // Define values based on database vs mock data
  let displayCustomersCount = totalCustomersCount;
  let displayShopsCount = activeShopsCount;
  let displayStockCount = totalStockQuantity;
  let displayRevenue = 0;
  let displayReceivables = 0;
  let displayInvoiceVolume = dbInvoices.length;

  let revenueTrendData: Array<{ month: string; revenue: number }> = [];
  let stockValuationData: Array<{ category: string; value: number; label: string; color: string }> = [];
  let shopPerformanceKPIs: Array<{ id: string; name: string; isActive: boolean; salesCount: number; revenue: number; stockCount: number }> = [];
  let recentTransactionsList: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    shopName: string;
    status: string;
    total: number;
    amountPaid: number;
    createdAt: Date | string;
  }> = [];

  let lowStockAlertsList = dbInventory
    .filter(item => item.quantity < item.minQuantity)
    .map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity
    }));

  // Helper for safe float parsing
  const safeFloat = (val?: string | null) => {
    if (!val) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  displayRevenue = dbInvoices.reduce((acc, inv) => acc + safeFloat(inv.amountPaid), 0);
  displayReceivables = dbInvoices.reduce((acc, inv) => acc + safeFloat(inv.balanceDue), 0);

  // Compute rolling 6 months trend data dynamically
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenueMap: { [key: string]: number } = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyRevenueMap[label] = 0;
  }

  dbInvoices.forEach((inv) => {
    if (!inv.createdAt) return;
    const invDate = new Date(inv.createdAt);
    if (isNaN(invDate.getTime())) return;
    const label = `${monthNames[invDate.getMonth()]} ${invDate.getFullYear()}`;
    if (monthlyRevenueMap[label] !== undefined) {
      monthlyRevenueMap[label] += safeFloat(inv.amountPaid);
    }
  });

  revenueTrendData = Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // Stock allocation
  const valuationByCategory: { [key: string]: number } = {
    FRAME: 0,
    LENS: 0,
    CONTACT_LENS: 0,
    SOLUTION: 0,
    ACCESSORY: 0,
  };

  dbInventory.forEach((item) => {
    const val = (item.quantity || 0) * safeFloat(item.price);
    const categoryKey = item.category ? item.category.toUpperCase() : "FRAME";
    if (valuationByCategory[categoryKey] !== undefined) {
      valuationByCategory[categoryKey] += val;
    }
  });

  const categoryColors: { [key: string]: string } = {
    FRAME: "#4f46e5",
    LENS: "#10b981",
    CONTACT_LENS: "#3b82f6",
    SOLUTION: "#f59e0b",
    ACCESSORY: "#a855f7",
  };

  const categoryLabels: { [key: string]: string } = {
    FRAME: "Frames",
    LENS: "Lenses",
    CONTACT_LENS: "Contact Lenses",
    SOLUTION: "Solutions",
    ACCESSORY: "Accessories",
  };

  stockValuationData = Object.entries(valuationByCategory).map(([category, value]) => ({
    category,
    value,
    label: categoryLabels[category] || category,
    color: categoryColors[category] || "#94a3b8",
  }));

  // Shop branch KPIs
  shopPerformanceKPIs = dbShops.map((shop) => {
    const shopInvoices = dbInvoices.filter(inv => inv.shopId === shop.id);
    const shopInventory = dbInventory.filter(item => item.shopId === shop.id);

    return {
      id: shop.id,
      name: shop.name,
      isActive: shop.isActive,
      salesCount: shopInvoices.length,
      revenue: shopInvoices.reduce((acc, inv) => acc + safeFloat(inv.amountPaid), 0),
      stockCount: shopInventory.reduce((acc, item) => acc + (item.quantity || 0), 0),
    };
  });

  // Recent Transactions
  recentTransactionsList = [...dbInvoices]
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 5)
    .map((inv) => {
      const cust = dbCustomers.find(c => c.id === inv.customerId);
      const sp = dbShops.find(s => s.id === inv.shopId);

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: cust?.fullName || "Walk-in Customer",
        shopName: sp?.name || "Main Branch",
        status: inv.status,
        total: safeFloat(inv.total),
        amountPaid: safeFloat(inv.amountPaid),
        createdAt: inv.createdAt || new Date(),
      };
    });

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner Greeting */}
      <div className="space-y-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Good morning, {user.fullName.split(" ")[0]}! 👋
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Here&apos;s your multi-shop business performance report today.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(displayRevenue)}
          icon={IndianRupee}
          color="emerald"
          description="Collected cash payments"
        />
        <StatCard
          title="Sales Invoices"
          value={displayInvoiceVolume}
          icon={FileText}
          color="indigo"
          description="Created invoice slips"
        />
        <StatCard
          title="Accounts Receivable"
          value={formatCurrency(displayReceivables)}
          icon={Clock}
          color="amber"
          description="Outstanding balances due"
        />
        <StatCard
          title="Active Customers"
          value={displayCustomersCount}
          icon={Users}
          color="blue"
          description="Registered base cross-branch"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-1 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-900 tracking-tight">Sales Revenue Trend</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">Monthly collection analysis</p>
          </div>
          <RevenueTrendChart data={revenueTrendData} />
        </div>

        {/* Stock Asset valuation donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-1 pb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-900 tracking-tight">Stock Valuation</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">Asset distribution by category</p>
          </div>
          <StockValuationDonut data={stockValuationData} />
        </div>
      </div>

      {/* Middle Grid: Shop branch performance & low stock / license */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shop Performance Table (Col span 2) */}
        <div className="lg:col-span-2">
          <ShopPerformanceTable shops={shopPerformanceKPIs} />
        </div>

        {/* Operational Alerts & SaaS Seats */}
        <div className="space-y-6">
          {/* Subscription Progress Seat Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-900 tracking-tight">SaaS Subscription</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">Manage plan limits & features</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Current Plan</span>
                  <span className="text-xs font-black text-slate-800 uppercase block">Premium Branch Trial</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Remaining</span>
                  <span className="text-xs font-black text-indigo-650 block">{trialDaysLeft} Days Left</span>
                </div>
              </div>

              {/* Progress Bar of Seat Limits */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Shop Seat Utilization</span>
                  <span className="text-slate-800 font-bold">{displayShopsCount} / 5 Branches</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${(displayShopsCount / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts widget */}
          <LowStockAlert items={lowStockAlertsList} />
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-900 tracking-tight">
              Recent Transactions
            </h3>
          </div>
          <Link 
            href="/owner/customers" 
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            <span>View Customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Transactions list table */}
        <div className="overflow-x-auto">
          {recentTransactionsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-48 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No invoices generated yet</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/30">
                  <th className="px-6 py-3">Invoice Number</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Branch Shop</th>
                  <th className="px-6 py-3">Payment Status</th>
                  <th className="px-6 py-3 text-right">Amount Total</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                {recentTransactionsList.map((tx) => {
                  const txDate = typeof tx.createdAt === "string" ? new Date(tx.createdAt) : tx.createdAt;
                  const formattedDate = txDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Invoice number */}
                      <td className="px-6 py-4 font-extrabold text-slate-900 group-hover:text-indigo-650 transition-colors">
                        {tx.invoiceNumber}
                      </td>

                      {/* Customer Name */}
                      <td className="px-6 py-4 text-slate-700">
                        {tx.customerName}
                      </td>

                      {/* Branch shop name */}
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.shopName}</span>
                        </div>
                      </td>

                      {/* Payment Status badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          tx.status === "PAID" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-255" 
                            : tx.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-255"
                            : "bg-rose-50 text-rose-700 border-rose-255"
                        }`}>
                          {tx.status}
                        </span>
                      </td>

                      {/* Amount Details */}
                      <td className="px-6 py-4 text-right text-slate-950 font-extrabold font-mono">
                        <div>{formatCurrency(tx.total)}</div>
                        {tx.total > tx.amountPaid && tx.amountPaid > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Paid: {formatCurrency(tx.amountPaid)}
                          </div>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="px-6 py-4 text-right text-slate-400 text-xs font-semibold">
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <QuickActions />
    </div>
  );
}
