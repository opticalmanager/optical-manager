import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData, DashboardOptions } from "@/services/dashboard.service";
import { TimeframeType } from "@/services/order.service";
import { OwnerAnalyticsClient } from "@/components/owner/OwnerAnalyticsClient";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const metadata = {
  title: "Organization Analytics | Optical Manager",
  description: "Executive cross-branch sales analytics, revenue insights, and performance metrics.",
};

interface PageProps {
  searchParams: Promise<{
    shopId?: string;
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

export default async function OwnerAnalyticsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const params = await searchParams;
  const currentShopId = params.shopId || "all";
  const timeframe = (params.timeframe || "7d") as TimeframeType | "custom";
  const compareMode = (params.compare || "none") as any;

  // Fetch list of active organization shops and analytics with offline timeout resilience
  let orgShops: any[] = [];
  let data: any = {
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
    categoryDistribution: [],
    recentOrders: [],
  };

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

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Analytics fetch timeout")), 8000)
    );

    const [shopsData, dashboardData] = await Promise.race([
      Promise.all([
        db
          .select({
            id: shops.id,
            name: shops.name,
            isActive: shops.isActive,
          })
          .from(shops)
          .where(and(eq(shops.organizationId, user.organizationId), eq(shops.isActive, true))),
        getDashboardData(currentShopId, opts, user.organizationId),
      ]),
      timeoutPromise,
    ]);

    orgShops = shopsData || [];
    data = dashboardData || data;
  } catch (err) {
    // Offline fallback
  }

  return (
    <OwnerAnalyticsClient
      data={data}
      shops={orgShops}
      currentShopId={currentShopId}
      currentTimeframe={timeframe}
      currentCompareMode={compareMode}
      currentGranularity={params.granularity}
      currentPeriodA={params.periodA}
      currentPeriodB={params.periodB}
    />
  );
}
