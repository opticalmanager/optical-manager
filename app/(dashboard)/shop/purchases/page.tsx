import Link from "next/link";
import { Truck, PlusCircle, Building2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Purchases & Inward Supply | Optical Manager",
  description: "Manage purchase orders, vendor invoices, and inward stock inventory.",
};

export default function PurchasesPage() {
  return (
    <div className="space-y-5 pb-12 select-none text-slate-800 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Purchases & Inward Supply
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] border border-blue-100">
              Module Scaffolded
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Streamline inward supplier shipments, purchase bills, and vendor catalog relationships.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/shop/purchases/vendors"
            className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-2"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>Vendors Directory</span>
          </Link>
          <Link
            href="/shop/purchases/new"
            className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Purchases Add</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/shop/purchases/new" className="group block">
          <Card className="p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all rounded-2xl bg-white flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-[#2563eb] group-hover:scale-105 transition-transform">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">
                Purchases Add
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Record new inward stock, supplier purchase orders, tax invoices, and cost prices.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563eb]">
                <span>Create Purchase</span>
                <span>&rarr;</span>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/shop/purchases/vendors" className="group block">
          <Card className="p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all rounded-2xl bg-white flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Vendors Management
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Manage supplier profiles, contact details, GSTIN identification, payment terms, and vendor ledger.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                <span>View Vendors</span>
                <span>&rarr;</span>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Info Notice Card */}
      <Card className="p-4 border border-blue-100 bg-blue-50/40 rounded-2xl flex items-center gap-3">
        <Clock className="h-5 w-5 text-[#2563eb] shrink-0" />
        <div className="text-xs text-slate-600 font-medium">
          Navigation and architectural routing for <span className="font-bold text-slate-900">Purchases Add</span> and <span className="font-bold text-slate-900">Vendors</span> have been registered in the left navigation sidebar. Complete page layouts and database schemas will be populated upon request.
        </div>
      </Card>
    </div>
  );
}
