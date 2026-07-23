"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Store, Layers, ChevronDown } from "lucide-react";

export interface ShopOption {
  id: string;
  name: string;
  isActive?: boolean;
}

interface OutletFilterSelectorProps {
  shops: ShopOption[];
  currentShopId: string; // "all" or specific shop UUID
  totalBranchCount?: number;
}

export function OutletFilterSelector({
  shops,
  currentShopId,
  totalBranchCount,
}: OutletFilterSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelectShop = (shopId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (shopId === "all") {
      params.delete("shopId");
    } else {
      params.set("shopId", shopId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedShopName =
    currentShopId === "all"
      ? "All Outlets (Combined)"
      : shops.find((s) => s.id === currentShopId)?.name || "Selected Outlet";

  const totalCount = totalBranchCount || shops.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
      {/* Left Title & Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-650 shrink-0 shadow-2xs">
          <Layers className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Outlet Context Filter
          </h3>
          <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>{selectedShopName}</span>
            {currentShopId === "all" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalCount} Branches Aggregated
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right Dropdown Filter */}
      <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
        <div className="relative w-full sm:w-64">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={currentShopId}
            onChange={(e) => handleSelectShop(e.target.value)}
            className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">🏢 All Outlets (Combined)</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                🏬 {shop.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
