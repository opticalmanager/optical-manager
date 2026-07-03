import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getShopsWithManagers } from "@/services/shop-manager.service";
import { accessShopConsoleAction } from "@/actions/auth.actions";
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  ExternalLink, 
  Edit2, 
  User, 
  CheckCircle, 
  ShieldAlert, 
  KeyRound 
} from "lucide-react";
import Link from "next/link";

export default async function OwnerShopsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let dbShops: any[] = [];
  const shopsRes = await getShopsWithManagers();
  if (shopsRes.success) {
    dbShops = shopsRes.data || [];
  }

  const hasRealShops = dbShops.length > 0;

  // Mock data if actual shop database is empty (to maintain premium layout visual preview)
  const displayShops = hasRealShops ? dbShops : [
    {
      id: "mock-s1",
      name: "Vision Care Bandra",
      address: "Shop No. 5, Link Road, Bandra West, Mumbai",
      phone: "+91 98765 43210",
      email: "bandra@visioncare.com",
      isActive: true,
      manager: {
        id: "mock-m1",
        email: "bandra@visioncare.com",
        fullName: "Vision Care Bandra Manager",
        isActive: true,
      }
    },
    {
      id: "mock-s2",
      name: "Optical Precision Andheri",
      address: "GF, Star Plaza, SV Road, Andheri West, Mumbai",
      phone: "+91 98123 45678",
      email: "andheri@visioncare.com",
      isActive: true,
      manager: {
        id: "mock-m2",
        email: "andheri@visioncare.com",
        fullName: "Optical Precision Andheri Manager",
        isActive: true,
      }
    },
    {
      id: "mock-s3",
      name: "Colaba Eye Clinic & Optics",
      address: "12 Marine Drive, Opp. Brabourne Stadium, Colaba, Mumbai",
      phone: "+91 91234 56789",
      email: "colaba@visioncare.com",
      isActive: false,
      manager: null,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Shops Management
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage your physical optical retail branches, contact listings, manager credentials, and operational statuses.
          </p>
        </div>
        
        <Link 
          href="/owner/settings?tab=shops"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Configure Outlet</span>
        </Link>
      </div>

      {!hasRealShops && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Showing Demo Outlets (Database Empty)
        </div>
      )}

      {/* Quick Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shops Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Outlets</span>
            <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{displayShops.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Store className="w-5 h-5" />
          </div>
        </div>

        {/* Active Shops Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Status</span>
            <h3 className="text-2xl font-extrabold text-slate-900 leading-none">
              {displayShops.filter(s => s.isActive).length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Configured Managers Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Configured Managers</span>
            <h3 className="text-2xl font-extrabold text-slate-900 leading-none">
              {displayShops.filter(s => s.manager).length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        {/* Unconfigured Managers Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Credentials</span>
            <h3 className="text-2xl font-extrabold text-slate-900 leading-none">
              {displayShops.filter(s => !s.manager).length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayShops.map((shop) => (
          <div 
            key={shop.id} 
            className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden
              ${!shop.isActive ? "opacity-80" : ""}
            `}
          >
            {/* Upper Content */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0
                    ${shop.isActive 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600" 
                      : "bg-slate-100 border-slate-200 text-slate-500"
                    }
                  `}>
                    <Store className="w-4 h-4 shrink-0" />
                  </div>
                  <h3 className="font-bold text-slate-900 truncate leading-tight">
                    {shop.name}
                  </h3>
                </div>

                {/* Active Badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shrink-0
                  ${shop.isActive
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                  }
                `}>
                  {shop.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Contact Listing details */}
              <div className="space-y-2 text-xs font-medium text-slate-500">
                {shop.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-normal">{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{shop.phone}</span>
                  </div>
                )}
                {shop.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{shop.email}</span>
                  </div>
                )}
              </div>

              {/* Manager credentials box */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Outlet Manager</span>
                {shop.manager ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-800">{shop.manager.fullName}</span>
                      <span className="block truncate text-[10px] text-slate-400 font-mono mt-0.5">{shop.manager.email}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-semibold leading-tight">No login credentials configured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <Link 
                href="/owner/settings?tab=shops"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Configure Outlet</span>
              </Link>
              
              {!hasRealShops ? (
                <button
                  disabled
                  title="Demo branches cannot be viewed. Create a real shop branch to access the shop console."
                  className="flex items-center gap-1 text-xs font-bold text-slate-450 cursor-not-allowed opacity-50 bg-transparent border-none"
                >
                  <span>Access Shop Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              ) : (
                <form action={accessShopConsoleAction.bind(null, shop.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs font-bold text-indigo-650 hover:text-indigo-700 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <span>Access Shop Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
