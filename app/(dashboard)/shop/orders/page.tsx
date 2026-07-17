import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { getOrdersDashboardData, TimeframeType } from "@/services/order.service";
import { Card, CardContent } from "@/components/ui/card";
import { ReminderCardAction } from "./ReminderCardAction";
import { TimeframeDropdown } from "./TimeframeDropdown";
import { OrdersTableClient } from "./OrdersTableClient";
import { 
  SlidersHorizontal, 
  Download, 
  Search, 
  TrendingUp,
  AlertCircle,
  Bell,
  CreditCard,
  Truck,
  ShoppingBag,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";

export default async function OrdersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    tab?: string;
    page?: string;
    timeframe?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const tab = (params.tab || "ALL") as "ALL" | "PAID" | "PARTIALLY_PAID";
  const page = parseInt(params.page || "1", 10);
  const timeframe = params.timeframe || "30d";
  const filter = (params.filter || "ALL").toUpperCase() as "ALL" | "DELIVERED" | "PENDING" | "DELAYED";
  const limit = 8; // Display 8 rows per page for high-density SaaS viewing
 
  const user = await getCurrentUser();
  const shopId = user?.shopId;
 
  if (!shopId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-bold text-slate-500">
        No shop selected or session expired.
      </div>
    );
  }
 
  // Fetch KPI aggregates and paginated order list
  const { kpis, orders, reminders, totalCount } = await getOrdersDashboardData({
    shopId,
    tab,
    search,
    page,
    limit,
    timeframe: timeframe as TimeframeType,
    filter,
  });
 
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
 
  return (
    <div className="space-y-5 pb-12 select-none text-slate-800 max-w-[1400px] mx-auto">
      
      {/* 1. Header & Title Block */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Orders Management
        </h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">
          Oversee your clinical revenue stream, track fulfillment, and manage patient billing.
        </p>
      </div>
 
      {/* 2. Analytical Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
        
        {/* Metric 1: Total Orders */}
        <div className="relative h-full">
          <Card className={`relative h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            filter === "ALL"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <Link 
              href={`/shop/orders?filter=ALL&tab=${tab}&search=${search}&timeframe=${timeframe}`}
              className="absolute inset-0 z-0 rounded-xl font-bold"
            />
            <div className="relative z-10 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Orders
              </span>
              <div className="pointer-events-auto">
                <TimeframeDropdown currentTimeframe={timeframe} />
              </div>
            </div>
            <div className="relative z-10 mt-3 flex items-baseline gap-2 pointer-events-none">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpis.totalOrders.toLocaleString()}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <TrendingUp className="h-3 w-3" />
                {kpis.totalOrdersMoM}
              </span>
            </div>
          </Card>
        </div>
 
        {/* Metric 2: Delivered Orders */}
        <Link 
          href={`/shop/orders?filter=${filter === "DELIVERED" ? "ALL" : "DELIVERED"}&tab=${tab}&search=${search}&timeframe=${timeframe}`}
          className="block h-full"
        >
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            filter === "DELIVERED"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Delivered Orders
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {kpis.deliveredOrders.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {kpis.completionRate}% completion
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${kpis.completionRate}%` }}
                />
              </div>
            </div>
          </Card>
        </Link>
 
        {/* Metric 3: Pending Orders */}
        <Link 
          href={`/shop/orders?filter=${filter === "PENDING" ? "ALL" : "PENDING"}&tab=${tab}&search=${search}&timeframe=${timeframe}`}
          className="block h-full"
        >
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            filter === "PENDING"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Orders
              </span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] tracking-tight">
                {kpis.pendingOrders.toLocaleString()}
              </span>
              {kpis.criticalPending > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  ! {kpis.criticalPending} critical
                </span>
              )}
            </div>
          </Card>
        </Link>
 
        {/* Metric 4: Delayed Orders */}
        <Link 
          href={`/shop/orders?filter=${filter === "DELAYED" ? "ALL" : "DELAYED"}&tab=${tab}&search=${search}&timeframe=${timeframe}`}
          className="block h-full"
        >
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            filter === "DELAYED"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Delayed Orders
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpis.delayedOrders.toLocaleString()}
              </span>
              {kpis.criticalDelayed > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  <AlertCircle className="h-3 w-3" />
                  {kpis.criticalDelayed} critical
                </span>
              )}
            </div>
          </Card>
        </Link>
      </div>
 
      {/* 3. Controls & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Left: Tab selectors and search bar inline */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 max-w-4xl">
          {/* Status Tab buttons */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0">
            <Link
              href={`/shop/orders?tab=ALL&search=${search}&timeframe=${timeframe}&filter=${filter}`}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                tab === "ALL"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/10 font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Orders
            </Link>
            <Link
              href={`/shop/orders?tab=PAID&search=${search}&timeframe=${timeframe}&filter=${filter}`}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                tab === "PAID"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/10 font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paid
            </Link>
            <Link
              href={`/shop/orders?tab=PARTIALLY_PAID&search=${search}&timeframe=${timeframe}&filter=${filter}`}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                tab === "PARTIALLY_PAID"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/10 font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Partially Paid
            </Link>
          </div>
 
          {/* Search Filter Input (adjacent to tabs) */}
          <form method="GET" action="/shop/orders" className="relative flex-1">
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="timeframe" value={timeframe} />
            <input type="hidden" name="filter" value={filter} />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-600" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search order id, customers, or SKU..."
              className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0a52c3] text-slate-800 placeholder:text-slate-450"
            />
          </form>
        </div>
 
        {/* Right: Filters/CSV Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer bg-white flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-650" /> Filter
          </button>
          
          <Link
            href={`/api/orders/export?tab=${tab}&search=${encodeURIComponent(search)}&timeframe=${timeframe}&filter=${filter}`}
            className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer bg-white flex items-center gap-1.5"
          >
            <Download className="h-4 w-4 text-slate-655" /> Export CSV
          </Link>
        </div>
      </div>
 
      {/* 5. Invoices & Orders Main Table Card */}
      <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden">
        <OrdersTableClient
          orders={orders}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          tab={tab}
          search={search}
          timeframe={timeframe}
          filter={filter}
          limit={limit}
        />
      </Card>

      {/* 7. Priority Reminders Panel */}
      <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden mt-8">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900 uppercase">
              <Bell className="h-4 w-4 text-rose-500" />
              Priority Reminders
            </h3>
            <span className="text-xs font-black uppercase text-[#0a52c3] hover:text-[#004bb5] cursor-pointer">
              View All Notifications
            </span>
          </div>

          <div className="space-y-4">
            {reminders.length > 0 ? (
              reminders.map((rem, idx) => {
                const isPayment = rem.type === "payment";

                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${
                      isPayment 
                        ? "bg-rose-50/15 border-rose-100/50" 
                        : "bg-[#0a52c3]/5 border-[#0a52c3]/10"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rounded Icon badge */}
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        isPayment 
                          ? "bg-rose-100 text-rose-600" 
                          : "bg-[#0a52c3] text-white"
                      }`}>
                        {isPayment ? <CreditCard className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {rem.title}
                        </p>
                        <p className="text-xs text-slate-700 font-semibold mt-0.5">
                          {rem.subtext}
                        </p>
                      </div>
                    </div>

                    {/* Server-action triggers */}
                    <ReminderCardAction 
                      invoiceId={rem.id} 
                      type={rem.type} 
                    />
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-center font-bold text-slate-400 py-4">
                No priority reminders today. Nice work!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
