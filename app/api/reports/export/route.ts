import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { exportReportToCSV, exportReportToExcel } from "@/services/report.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!user.shopId && !user.organizationId)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams, origin } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const startDate = searchParams.get("from") || searchParams.get("date") || undefined;
    const endDate = searchParams.get("to") || undefined;
    const requestedShopId = searchParams.get("shopId");

    // Resolve target shop ID
    let targetShopId = user.shopId || "all";
    if (user.role === "OWNER" || user.role === "SUPER_ADMIN") {
      targetShopId = requestedShopId || (user.shopId || "all");
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    let baseFilename = `${reportType}-report-${timestamp}`;

    if (reportType === "all" || reportType === "gst-all" || reportType === "invoices") {
      baseFilename = `All-Invoices-GST-Register-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "b2b") {
      baseFilename = `B2B-GST-Report-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "b2c") {
      baseFilename = `B2C-Retail-Report-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "gstr1" || reportType === "gstr1-portal") {
      baseFilename = `GSTR1-Portal-Format-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "hsn") {
      baseFilename = `HSN-Summary-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "creditnotes") {
      baseFilename = `Credit-Notes-${startDate || "all"}-to-${endDate || "all"}`;
    } else if (reportType === "docsummary") {
      baseFilename = `Document-Summary-${startDate || "all"}-to-${endDate || "all"}`;
    }

    if (format === "xlsx" || format === "excel") {
      const excelBuffer = await exportReportToExcel(
        targetShopId,
        reportType,
        startDate,
        endDate,
        user.organizationId || undefined,
        origin
      );

      return new Response(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    // Default to CSV
    const csvData = await exportReportToCSV(
      targetShopId,
      reportType,
      startDate,
      endDate,
      user.organizationId || undefined,
      origin
    );

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Error generating report export:", error);
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
}
