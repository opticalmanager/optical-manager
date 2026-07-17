import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData } from "@/services/dashboard.service";
import { TimeframeType } from "@/services/order.service";
import AnalyticsClient from "@/components/shop/AnalyticsClient";

export const metadata = {
  title: "Analytics & Telemetry | Optical Manager",
  description: "View store sales analytics, revenue graphs, and performance metrics.",
};

interface PageProps {
  searchParams: Promise<{
    timeframe?: string;
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
  const timeframe = (params.timeframe || "7d") as TimeframeType;

  const data = await getDashboardData(shopId, timeframe);

  return <AnalyticsClient data={data} currentTimeframe={timeframe} />;
}
