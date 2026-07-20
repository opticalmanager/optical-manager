import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData } from "@/services/dashboard.service";
import { getShopById } from "@/services/shop.service";
import { TimeframeType } from "@/services/order.service";
import StoreOverviewClient from "@/components/shop/StoreOverviewClient";

export const metadata = {
  title: "Store Overview | Optical Manager",
  description: "Store Overview dashboard showing appointments, orders, priority actions, and stock alerts.",
};

interface PageProps {
  searchParams: Promise<{
    timeframe?: string;
  }>;
}

export default async function ShopDashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId || !user || !user.organizationId) {
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
  const timeframe = (params.timeframe || "24h") as TimeframeType;

  const [data, shop] = await Promise.all([
    getDashboardData(shopId, timeframe),
    getShopById(shopId, user.organizationId),
  ]);

  return <StoreOverviewClient data={data} shopName={shop?.name || "Vision Plus Outlet"} />;
}
