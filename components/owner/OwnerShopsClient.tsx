"use client";

import React, { useState } from "react";
import {
  Store,
  Mail,
  CheckCircle,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Plus,
  User,
  Loader2,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { accessShopConsoleAction } from "@/actions/auth.actions";
import { OutletConfigurePanel } from "./OutletConfigurePanel";

interface ManagerInfo {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

interface ShopWithManager {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  manager: ManagerInfo | null;
}

interface OwnerShopsClientProps {
  initialShops: ShopWithManager[];
}

export function OwnerShopsClient({ initialShops }: OwnerShopsClientProps) {
  const [shopsList, setShopsList] = useState<ShopWithManager[]>(initialShops);
  const [selectedShop, setSelectedShop] = useState<ShopWithManager | null>(null);
  const [isViewOutletLoading, setIsViewOutletLoading] = useState<string | null>(null);

  // KPI Calculations
  const totalOutlets = shopsList.length;
  const activeStatusCount = shopsList.filter((s) => s.isActive).length;
  const configuredManagersCount = shopsList.filter((s) => s.manager !== null).length;
  const pendingCredentialsCount = shopsList.filter((s) => s.manager === null).length;

  const handleOpenConfigureOutlet = (shop: ShopWithManager) => {
    setSelectedShop(shop);
  };

  const handleViewOutlet = async (shopId: string) => {
    if (shopId.startsWith("mock-")) {
      toast.error("Demo branches cannot be opened. Create a real shop branch to test console navigation.");
      return;
    }

    setIsViewOutletLoading(shopId);
    try {
      toast.loading("Opening shop console...", { id: "view-outlet" });
      const res = await accessShopConsoleAction(shopId);
      if (res?.success) {
        toast.success("Redirecting to shop console...", { id: "view-outlet" });
        window.location.href = "/shop/dashboard";
      } else {
        toast.error("Failed to open shop console.", { id: "view-outlet" });
        setIsViewOutletLoading(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to open shop console.", { id: "view-outlet" });
      setIsViewOutletLoading(null);
    }
  };

  const handleShopUpdated = (updatedShop: ShopWithManager) => {
    setShopsList((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    );
    setSelectedShop(updatedShop);
  };

  return (
    <div className="space-y-6">
      {/* Header Section matching original dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Shops Management
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your physical optical retail branches, contact listings, manager credentials, and operational statuses.
          </p>
        </div>

        <button
          onClick={() => {
            if (shopsList.length > 0) {
              handleOpenConfigureOutlet(shopsList[0]);
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Configure Outlet</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outlets */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              TOTAL OUTLETS
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalOutlets}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Active Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              ACTIVE STATUS
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {activeStatusCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Configured Managers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              CONFIGURED MANAGERS
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {configuredManagersCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Pending Credentials */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              PENDING CREDENTIALS
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {pendingCredentialsCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Shop Cards Grid matching Screenshot */}
      {shopsList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Shop Branches Configured</h3>
          <p className="text-xs text-slate-400 mt-1">Add your physical optical store location to set up manager logins.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopsList.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Body */}
              <div className="p-6 space-y-5">
                {/* Shop Title & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {shop.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {shop.id.startsWith("mock-") ? "Demo Branch" : `ID: ${shop.id.substring(0, 8)}...`}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      shop.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {shop.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {/* Email Info */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="break-all">{shop.manager?.email || shop.email || "No email assigned"}</span>
                </div>

                {/* Outlet Manager Card Container */}
                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    OUTLET MANAGER
                  </span>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {shop.manager?.fullName || `${shop.name} Manager`}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {shop.manager?.email || shop.email || "Unassigned"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-3 text-xs font-bold">
                <button
                  onClick={() => handleOpenConfigureOutlet(shop)}
                  className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure Outlet</span>
                </button>

                <button
                  onClick={() => handleViewOutlet(shop.id)}
                  disabled={isViewOutletLoading === shop.id}
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  {isViewOutletLoading === shop.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  <span>Access Shop Console</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Workspace Panel when Configure Outlet is clicked */}
      {selectedShop && (
        <OutletConfigurePanel
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onShopUpdated={handleShopUpdated}
        />
      )}
    </div>
  );
}
