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

  // Fetch list of active organization shops
  const orgShops = await db
    .select({
      id: shops.id,
      name: shops.name,
      isActive: shops.isActive,
    })
    .from(shops)
    .where(and(eq(shops.organizationId, user.organizationId), eq(shops.isActive, true)));

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

  const data = await getDashboardData(currentShopId, opts, user.organizationId);

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
