import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { 
  getSalesSummaryReport, 
  getItemWiseReport, 
  getGSTReport, 
  getInventoryReport, 
  getPaymentCollectionReport, 
  getAppointmentReport,
  getDayWiseCollectionReport,
  getOutstandingDuesReport,
  getDeadStockReport
} from "@/services/report.service";
import { OwnerReportsClient } from "@/components/owner/OwnerReportsClient";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const metadata = {
  title: "Organization Reports & Financial Audits | Optical Manager",
  description: "Executive cross-branch financial reports, GST filings, inventory valuation, and day-wise ledgers.",
};

interface PageProps {
  searchParams: Promise<{
    shopId?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function OwnerReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const params = await searchParams;
  const currentShopId = params.shopId || "all";

  let from = params.from;
  let to = params.to;

  const preset = params.preset || "30d";
  if (!from || !to) {
    const end = new Date();
    let days = 30;
    if (preset === "24h") days = 1;
    else if (preset === "7d") days = 7;
    else if (preset === "90d") days = 90;
    else if (preset === "ytd") days = 365;

    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    from = start.toISOString().split("T")[0];
    to = end.toISOString().split("T")[0];
  }

  // Fetch list of active organization shops
  const orgShops = await db
    .select({
      id: shops.id,
      name: shops.name,
      isActive: shops.isActive,
    })
    .from(shops)
    .where(and(eq(shops.organizationId, user.organizationId), eq(shops.isActive, true)));

  // Fetch all report data in parallel across all outlets or selected outlet
  const [
    salesData, 
    itemData, 
    gstData, 
    inventoryData, 
    paymentData, 
    appointmentData,
    dayWiseData,
    duesData,
    deadStockData
  ] = await Promise.all([
    getSalesSummaryReport(currentShopId, from, to, user.organizationId),
    getItemWiseReport(currentShopId, from, to, user.organizationId),
    getGSTReport(currentShopId, from, to, user.organizationId),
    getInventoryReport(currentShopId, user.organizationId),
    getPaymentCollectionReport(currentShopId, from, to, user.organizationId),
    getAppointmentReport(currentShopId, from, to, user.organizationId),
    getDayWiseCollectionReport(currentShopId, from, to, user.organizationId),
    getOutstandingDuesReport(currentShopId, user.organizationId),
    getDeadStockReport(currentShopId, user.organizationId),
  ]);

  return (
    <OwnerReportsClient
      shopId={currentShopId}
      shops={orgShops}
      salesData={salesData}
      itemData={itemData}
      gstData={gstData}
      inventoryData={inventoryData}
      paymentData={paymentData}
      appointmentData={appointmentData}
      dayWiseData={dayWiseData}
      duesData={duesData}
      deadStockData={deadStockData}
      initialFrom={from}
      initialTo={to}
    />
  );
}
