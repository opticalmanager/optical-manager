"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

interface CategorySalesItem {
  category: string;
  quantity: number;
  revenue: number;
}

interface CategorySalesChartProps {
  data: CategorySalesItem[];
  totalRevenue: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; fill: string; border: string }> = {
  FRAME: { bg: "bg-[#2563eb]", fill: "#2563eb", border: "border-[#2563eb]" },
  LENS: { bg: "bg-emerald-500", fill: "#10b981", border: "border-emerald-500" },
  CONTACT_LENS: { bg: "bg-amber-500", fill: "#f59e0b", border: "border-amber-500" },
  ACCESSORY: { bg: "bg-purple-500", fill: "#a855f7", border: "border-purple-500" },
  SOLUTION: { bg: "bg-sky-500", fill: "#0ea5e9", border: "border-sky-500" },
  UNASSIGNED: { bg: "bg-slate-400", fill: "#94a3b8", border: "border-slate-400" },
};

export default function CategorySalesChart({ data, totalRevenue }: CategorySalesChartProps) {
  if (!data || data.length === 0 || totalRevenue === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs font-bold text-slate-400">No category sales telemetry available</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      {/* Visual Segmented Progress Bar */}
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 p-0.5 gap-0.5">
        {sorted.map((item, idx) => {
          const pct = Math.max(1, (item.revenue / totalRevenue) * 100);
          const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.UNASSIGNED;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%` }}
              className={`h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full ${colors.bg}`}
              title={`${item.category}: ${formatCurrency(item.revenue)} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Category Breakdown Metric Items */}
      <div className="grid grid-cols-2 gap-2.5">
        {sorted.map((item, idx) => {
          const pct = (item.revenue / totalRevenue) * 100;
          const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.UNASSIGNED;

          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.bg}`} />
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {item.category.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block">
                    {item.quantity} Sold • {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-slate-900 shrink-0">
                {formatCurrency(item.revenue)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
