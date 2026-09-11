import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData, type DashboardData } from "@/services/dashboard.service";
import { getShopById, getShopsByOrganization } from "@/services/shop.service";
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
  let shopId = user?.shopId;

  if (!shopId && user?.role === "OWNER" && user?.organizationId) {
    try {
      const orgShops = await getShopsByOrganization(user.organizationId);
      if (orgShops.length > 0) {
        shopId = orgShops[0].id;
      }
    } catch {}
  }

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

  let data: DashboardData = {
    kpis: {
      revenue: 0,
      collections: 0,
      pendingOrders: 0,
      readyForPickupOrders: 0,
      delayedOrders: 0,
      appointmentsToday: 0,
      lowStockAlerts: 0,
      pendingPayments: 0,
      totalOrdersCount: 0,
      avgOrderValue: 0,
      paidInvoicesCount: 0,
      patientVisitsCount: 0,
    },
    revenueChart: [],
    priorityActions: [],
    deliveryPerformance: { onTime: 0, delayed: 0, cancelled: 0 },
    recentOrders: [],
    stockAlerts: [],
    topSKUs: [],
    topCustomers: [],
    categorySales: [],
    appointments: [],
  };
  let shop: any = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Dashboard DB query timeout")), 1200)
    );
    const results = await Promise.race([
      Promise.all([
        getDashboardData(shopId, timeframe),
        getShopById(shopId, user.organizationId),
      ]),
      timeoutPromise,
    ]);
    data = results[0];
    shop = results[1];
  } catch (err) {
    console.warn("[ShopDashboardPage] Failed to fetch dashboard data (offline/timeout fallback):", err);
  }

  return <StoreOverviewClient data={data} shopName={shop?.name || "Vision Plus Outlet"} />;
}
