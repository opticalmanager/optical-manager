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

  // Fetch list of active organization shops and reports with offline timeout resilience
  let orgShops: any[] = [];
  let salesData: any = { metrics: { totalRevenue: 0, orderCount: 0, averageOrderValue: 0, totalDue: 0 }, rows: [] };
  let itemData: any = [];
  let gstData: any = { summary: { totalTaxable: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, grandTotalTax: 0 }, rows: [] };
  let inventoryData: any = { summary: { totalProducts: 0, totalStockQty: 0, totalCostValue: 0, totalRetailValue: 0 }, rows: [] };
  let paymentData: any = { breakdown: [], totalCollected: 0 };
  let appointmentData: any = { summary: { totalAppointments: 0, confirmed: 0, completed: 0, cancelled: 0 }, rows: [] };
  let dayWiseData: any = [];
  let duesData: any = { totalDues: 0, rows: [] };
  let deadStockData: any = { totalDeadStockQty: 0, totalDeadStockValue: 0, rows: [] };

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Reports fetch timeout")), 8000)
    );

    const [
      shopsData,
      [
        sData,
        iData,
        gData,
        invData,
        pData,
        aData,
        dData,
        dueData,
        deadData,
      ],
    ] = await Promise.race([
      Promise.all([
        db
          .select({
            id: shops.id,
            name: shops.name,
            isActive: shops.isActive,
          })
          .from(shops)
          .where(and(eq(shops.organizationId, user.organizationId), eq(shops.isActive, true))),
        Promise.all([
          getSalesSummaryReport(currentShopId, from, to, user.organizationId),
          getItemWiseReport(currentShopId, from, to, user.organizationId),
          getGSTReport(currentShopId, from, to, user.organizationId),
          getInventoryReport(currentShopId, user.organizationId),
          getPaymentCollectionReport(currentShopId, from, to, user.organizationId),
          getAppointmentReport(currentShopId, from, to, user.organizationId),
          getDayWiseCollectionReport(currentShopId, from, to, user.organizationId),
          getOutstandingDuesReport(currentShopId, user.organizationId),
          getDeadStockReport(currentShopId, user.organizationId),
        ]),
      ]),
      timeoutPromise,
    ]);

    orgShops = shopsData || [];
    salesData = sData || salesData;
    itemData = iData || [];
    gstData = gData || gstData;
    inventoryData = invData || inventoryData;
    paymentData = pData || paymentData;
    appointmentData = aData || appointmentData;
    dayWiseData = dData || [];
    duesData = dueData || duesData;
    deadStockData = deadData || deadStockData;
  } catch (err) {
    // Graceful offline fallback
  }

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
