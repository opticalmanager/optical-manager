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
import { getShopById } from "@/services/shop.service";
import ReportsClient from "@/components/shop/ReportsClient";

export const metadata = {
  title: "Analytics & Reports | Optical Manager",
  description: "Explore store performance reports, day-wise ledgers, GST filings, inventory valuation, and outstanding dues.",
};

interface PageProps {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ShopReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const shopId = user?.shopId;

  if (!shopId || !user || !user.organizationId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">No shop assigned</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Please contact system administrator to assign a shop.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
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

  // Fetch shop config for auto report schedule
  const shop = await getShopById(shopId, user.organizationId);
  const autoReportSchedule = shop?.settings?.autoReportSchedule;

  // Parallel data fetching for all report views
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
    getSalesSummaryReport(shopId, from, to),
    getItemWiseReport(shopId, from, to),
    getGSTReport(shopId, from, to),
    getInventoryReport(shopId),
    getPaymentCollectionReport(shopId, from, to),
    getAppointmentReport(shopId, from, to),
    getDayWiseCollectionReport(shopId, from, to),
    getOutstandingDuesReport(shopId),
    getDeadStockReport(shopId),
  ]);

  return (
    <ReportsClient
      shopId={shopId}
      salesData={salesData}
      itemData={itemData}
      gstData={gstData}
      inventoryData={inventoryData}
      paymentData={paymentData}
      appointmentData={appointmentData}
      dayWiseData={dayWiseData}
      duesData={duesData}
      deadStockData={deadStockData}
      autoReportSchedule={autoReportSchedule}
      initialFrom={from}
      initialTo={to}
    />
  );
}
