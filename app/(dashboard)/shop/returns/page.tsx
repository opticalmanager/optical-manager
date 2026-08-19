import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { getReturnsDashboardData } from "@/services/return.service";
import { Card } from "@/components/ui/card";
import { ReturnsTableClient } from "./ReturnsTableClient";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  CreditCard,
  Plus
} from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Product Returns | Optical Manager",
  description: "Manage sales returns, warranty claims, and inventory restocking.",
};

export default async function ReturnsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    tab?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const tab = (params.tab || "ALL") as "ALL" | "COMPLETED" | "DRAFT";
  const page = parseInt(params.page || "1", 10);
  const limit = 8;

  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId) {
    redirect("/login");
  }

  const { kpis, returns, totalCount } = await getReturnsDashboardData({
    shopId,
    tab,
    search,
    page,
    limit,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-5 pb-12 select-none text-slate-800 max-w-[1400px] mx-auto">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Product Returns Management
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Process item returns, warranty inspections, restock salable items, and adjust invoice totals.
          </p>
        </div>

        <Link
          href="/shop/returns/new"
          className="h-10 px-5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Return</span>
        </Link>
      </div>

      {/* 2. Analytical KPI Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
        
        {/* Metric 1: Total Returns */}
        <Link href={`/shop/returns?tab=ALL&search=${search}`} className="block h-full">
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            tab === "ALL"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Returns
              </span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpis.totalReturns.toLocaleString()}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <TrendingUp className="h-3 w-3" />
                {kpis.totalReturnsMoM}
              </span>
            </div>
          </Card>
        </Link>

        {/* Metric 2: Completed Returns */}
        <Link href={`/shop/returns?tab=COMPLETED&search=${search}`} className="block h-full">
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            tab === "COMPLETED"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Completed Returns
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                {kpis.completedReturns.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">Processed</span>
            </div>
          </Card>
        </Link>

        {/* Metric 3: Draft Returns */}
        <Link href={`/shop/returns?tab=DRAFT&search=${search}`} className="block h-full">
          <Card className={`h-full transition-all cursor-pointer rounded-xl p-4 flex flex-col justify-between ${
            tab === "DRAFT"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Drafts
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpis.draftReturns.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">Drafts</span>
            </div>
          </Card>
        </Link>

        {/* Metric 4: Total Refund Value */}
        <Card className="border border-slate-200/80 bg-white shadow-xs rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Refund Value
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-[#2563eb] tracking-tight">
              {kpis.totalRefundAmount}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        {/* Tab Buttons */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0">
          <Link
            href={`/shop/returns?tab=ALL&search=${search}`}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              tab === "ALL"
                ? "bg-white text-slate-900 shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Returns
          </Link>
          <Link
            href={`/shop/returns?tab=COMPLETED&search=${search}`}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              tab === "COMPLETED"
                ? "bg-white text-slate-900 shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Completed
          </Link>
          <Link
            href={`/shop/returns?tab=DRAFT&search=${search}`}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              tab === "DRAFT"
                ? "bg-white text-slate-900 shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Drafts
          </Link>
        </div>

        {/* Search Input */}
        <form method="GET" action="/shop/returns" className="relative flex-1 max-w-md">
          <input type="hidden" name="tab" value={tab} />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search return #, invoice #, or customer phone..."
            className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-slate-800 placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* 4. Main Table Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
        <ReturnsTableClient
          returns={returns}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          tab={tab}
          search={search}
          limit={limit}
        />
      </Card>

    </div>
  );
}
