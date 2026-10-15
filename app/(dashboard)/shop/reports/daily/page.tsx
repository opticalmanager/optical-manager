import { Metadata } from "next";
import { getCurrentUser } from "@/services/auth.service";
import { getSingleDayCollectionReport } from "@/services/report.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";
import DailyReportClient from "@/components/shop/DailyReportClient";

export const metadata: Metadata = {
  title: "Daily Collection & Cash Drawer Report | Optical Manager",
  description: "Comprehensive day-wise customer collection ledger, cash reconciliation, payment methods, and EOD register audit.",
};

interface PageProps {
  searchParams: Promise<{
    date?: string;
  }>;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!hasModulePermission(user, "reports")) {
    return (
      <AccessDenied
        moduleName="Reports & Financials"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }

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
  const todayStr = new Date().toISOString().split("T")[0];
  const dateStr = params.date || todayStr;

  const data = await getSingleDayCollectionReport(shopId, dateStr, user.organizationId);

  return <DailyReportClient data={data} shopId={shopId} />;
}
