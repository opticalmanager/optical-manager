import { getCurrentUser } from "@/services/auth.service";
import { 
  getSalesSummaryReport, 
  getItemWiseReport, 
  getGSTReport, 
  getInventoryReport, 
  getPaymentCollectionReport, 
  getAppointmentReport 
} from "@/services/report.service";
import ReportsClient from "@/components/shop/ReportsClient";

export const metadata = {
  title: "Analytics & Reports | Optical Manager",
  description: "Explore store performance reports, item-wise sales, GST filings, inventory valuation, and payment collections.",
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

  if (!shopId) {
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

  // Parallel data fetching for all report views
  const [salesData, itemData, gstData, inventoryData, paymentData, appointmentData] = await Promise.all([
    getSalesSummaryReport(shopId, from, to),
    getItemWiseReport(shopId, from, to),
    getGSTReport(shopId, from, to),
    getInventoryReport(shopId),
    getPaymentCollectionReport(shopId, from, to),
    getAppointmentReport(shopId, from, to),
  ]);

  return (
    <ReportsClient
      salesData={salesData}
      itemData={itemData}
      gstData={gstData}
      inventoryData={inventoryData}
      paymentData={paymentData}
      appointmentData={appointmentData}
      initialFrom={from}
      initialTo={to}
    />
  );
}
