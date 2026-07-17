import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { exportReportToCSV } from "@/services/report.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "sales";
    const startDate = searchParams.get("from") || undefined;
    const endDate = searchParams.get("to") || undefined;

    const csvData = await exportReportToCSV(user.shopId, reportType, startDate, endDate);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${reportType}-report-${timestamp}.csv`;

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
