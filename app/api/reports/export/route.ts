import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { exportReportToCSV } from "@/services/report.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.shopId && !user.organizationId)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams, origin } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const startDate = searchParams.get("from") || searchParams.get("date") || undefined;
    const endDate = searchParams.get("to") || undefined;
    const requestedShopId = searchParams.get("shopId");

    // Resolve target shop ID
    let targetShopId = user.shopId || "all";
    if (user.role === "OWNER" || user.role === "SUPER_ADMIN") {
      targetShopId = requestedShopId || (user.shopId || "all");
    }

    const csvData = await exportReportToCSV(
      targetShopId,
      reportType,
      startDate,
      endDate,
      user.organizationId || undefined,
      origin
    );

    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `${reportType}-report-${timestamp}.csv`;

    if (reportType === "b2b") {
      filename = `B2B-GST-Report-${startDate || "all"}-to-${endDate || "all"}.csv`;
    } else if (reportType === "b2c") {
      filename = `B2C-Retail-Report-${startDate || "all"}-to-${endDate || "all"}.csv`;
    } else if (reportType === "gstr1" || reportType === "gstr1-portal") {
      filename = `GSTR1-Portal-Format-${startDate || "all"}-to-${endDate || "all"}.csv`;
    } else if (reportType === "hsn") {
      filename = `HSN-Summary-${startDate || "all"}-to-${endDate || "all"}.csv`;
    } else if (reportType === "creditnotes") {
      filename = `Credit-Notes-${startDate || "all"}-to-${endDate || "all"}.csv`;
    } else if (reportType === "docsummary") {
      filename = `Document-Summary-${startDate || "all"}-to-${endDate || "all"}.csv`;
    }

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Error generating report CSV:", error);
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
}
