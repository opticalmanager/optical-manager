import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData, DashboardOptions } from "@/services/dashboard.service";
import { TimeframeType } from "@/services/order.service";
import AnalyticsClient from "@/components/shop/AnalyticsClient";

export const metadata = {
  title: "Analytics & Telemetry | Optical Manager",
  description: "View store sales analytics, revenue graphs, and performance metrics.",
};

interface PageProps {
  searchParams: Promise<{
    timeframe?: string;
    from?: string;
    to?: string;
    compare?: string;
    compFrom?: string;
    compTo?: string;
    granularity?: string;
    periodA?: string;
    periodB?: string;
  }>;
}

export default async function ShopAnalyticsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">No shop assigned</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Please contact your system administrator to assign a shop.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const timeframe = (params.timeframe || "7d") as TimeframeType | "custom";
  const compareMode = (params.compare || "none") as any;

  const opts: DashboardOptions = {
    timeframe,
    customStartDate: params.from ? new Date(params.from) : undefined,
    customEndDate: params.to ? new Date(params.to) : undefined,
    compareMode,
    compareStartDate: params.compFrom ? new Date(params.compFrom) : undefined,
    compareEndDate: params.compTo ? new Date(params.compTo) : undefined,
    granularity: params.granularity as any,
    periodA: params.periodA,
    periodB: params.periodB,
  };

  const data = await getDashboardData(shopId, opts);

  return (
    <AnalyticsClient 
      data={data} 
      currentTimeframe={timeframe} 
      currentCompareMode={compareMode}
      currentGranularity={params.granularity}
      currentPeriodA={params.periodA}
      currentPeriodB={params.periodB}
    />
  );
}
