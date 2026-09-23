import Link from "next/link";
import { Building2, ArrowLeft, PlusCircle, Users, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/services/auth.service";
import { hasModulePermission } from "@/utils/permissions";
import { AccessDenied } from "@/components/shop/AccessDenied";

export const metadata = {
  title: "Vendors & Suppliers | Optical Manager",
  description: "Manage optical product suppliers, contact books, payment terms, and vendor GSTINs.",
};

export default async function VendorsPage() {
  const user = await getCurrentUser();
  if (!hasModulePermission(user, "purchases")) {
    return (
      <AccessDenied
        moduleName="Vendors & Suppliers"
        userRole={user?.customRoleName || user?.role}
      />
    );
  }
  return (
    <div className="space-y-5 pb-12 select-none text-slate-800 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/purchases"
            className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs"
            title="Back to Purchases"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Vendors Management
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                Placeholder Ready
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Directory of frame manufacturers, lens laboratories, contact lens distributors, and accessories suppliers.
            </p>
          </div>
        </div>

        <Link
          href="/shop/purchases/new"
          className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Purchases Add</span>
        </Link>
      </div>

      {/* Scaffold / Coming Soon State */}
      <Card className="p-8 border border-slate-200/80 rounded-2xl bg-white shadow-xs text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Vendors Directory
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed">
          The navigation button <span className="font-bold text-slate-800">Vendors</span> is connected to this route (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-[#2563eb]">/shop/purchases/vendors</code>). Complete vendor directory tables, contact masters, and payment ledgers will be built here when you specify the detailed requirements.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/shop/purchases/new"
            className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Purchases Add</span>
          </Link>
          <Link
            href="/shop/dashboard"
            className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-2"
          >
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
