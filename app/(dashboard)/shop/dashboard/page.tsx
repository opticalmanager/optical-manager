import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData, type DashboardData } from "@/services/dashboard.service";
import { getShopById, getShopsByOrganization } from "@/services/shop.service";
import { TimeframeType } from "@/services/order.service";
import OpticalDashboardClient from "@/components/shop/dashboard/OpticalDashboardClient";

export const metadata = {
  title: "Dashboard | Optical Manager",
  description: "Optical Store dashboard showing performance metrics, customer bifurcation, and transactions.",
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
  const timeframe = (params.timeframe || "90d") as TimeframeType;

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
    pendingOrders: [],
    pickupOrders: [],
    delayedOrders: [],
    stockAlerts: [],
    topSKUs: [],
    topCustomers: [],
    categorySales: [],
    appointments: [],
    todayAppointments: [],
    recentActivities: [],
  };
  let shop: any = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Dashboard DB query timeout")), 8000)
    );
    const results = await Promise.race([
      Promise.all([
        getDashboardData(shopId, timeframe, user.organizationId),
        getShopById(shopId, user.organizationId),
      ]),
      timeoutPromise,
    ]);
    data = results[0];
    shop = results[1];
  } catch (err) {
    console.warn("[ShopDashboardPage] Failed to fetch dashboard data (offline/timeout fallback):", err);
  }

  // Extract first name for friendly greeting
  const firstName = user.fullName
    ? user.fullName.trim().split(" ")[0]
    : user.email
    ? user.email.split("@")[0]
    : "User";

  return (
    <OpticalDashboardClient
      data={data}
      userName={firstName}
      shopName={shop?.name || "Vision Plus Outlet"}
      currentTimeframe={timeframe}
    />
  );
}

