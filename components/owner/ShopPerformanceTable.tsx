import React from "react";
import { Store, TrendingUp, Package, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ShopKPI {
  id: string;
  name: string;
  isActive: boolean;
  salesCount: number;
  revenue: number;
  stockCount: number;
}

interface ShopPerformanceTableProps {
  shops: ShopKPI[];
}

export function ShopPerformanceTable({ shops }: ShopPerformanceTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-900 tracking-tight">
            Shop Branch Performance
          </h3>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-x-auto">
        {shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-48 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Store className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">No shops configured</p>
              <p className="text-xs text-slate-400 max-w-[200px]">Create shop branch listings to see performance data.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/30">
                <th className="px-6 py-3">Branch / Shop</th>
                <th className="px-6 py-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" /> Invoices
                  </span>
                </th>
                <th className="px-6 py-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Package className="w-3 h-3 text-slate-400" /> Stock Items
                  </span>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3 text-slate-400" /> Total Revenue
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Shop Name & Status Badge */}
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                      <Store className="w-4.5 h-4.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-indigo-650 transition-colors truncate">
                        {shop.name}
                      </p>
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold mt-1 border ${
                        shop.isActive 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                          : "bg-red-50 text-red-700 border-red-150"
                      }`}>
                        {shop.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </td>

                  {/* Invoice count */}
                  <td className="px-6 py-4 text-center text-slate-700 font-mono">
                    {shop.salesCount}
                  </td>

                  {/* Stock count */}
                  <td className="px-6 py-4 text-center text-slate-700 font-mono">
                    {shop.stockCount}
                  </td>

                  {/* Revenue generated */}
                  <td className="px-6 py-4 text-right text-slate-950 font-extrabold font-mono">
                    {formatCurrency(shop.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
