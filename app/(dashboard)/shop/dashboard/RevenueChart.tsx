"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data: Array<{ day: string; revenue: number }>;
  compareData?: Array<{ day: string; revenue: number }>;
  periodALabel?: string;
  compareLabel?: string;
}

export default function RevenueChart({ 
  data, 
  compareData, 
  periodALabel = "Primary Period", 
  compareLabel = "Baseline Period" 
}: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[250px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg animate-pulse">
        <span className="text-xs font-semibold text-slate-400">Loading trend analysis...</span>
      </div>
    );
  }

  // Format currency compact for Y axis
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    }
    return `₹${value}`;
  };

  // Combine primary and comparison data points
  const combinedData = data.map((item, idx) => {
    const compItem = compareData && compareData[idx] ? compareData[idx] : null;
    return {
      day: item.day,
      revenue: item.revenue,
      compareRevenue: compItem ? compItem.revenue : undefined
    };
  });

  const hasCompare = Boolean(compareData && compareData.length > 0);

  // Custom rich comparison tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const valA = Number(payload[0]?.value || 0);
    const valB = hasCompare && payload[1] ? Number(payload[1]?.value || 0) : null;

    let pctDelta = 0;
    if (valB !== null && valB > 0) {
      pctDelta = Math.round(((valA - valB) / valB) * 100);
    } else if (valB !== null && valA > 0) {
      pctDelta = 100;
    }

    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <div className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
          <span>{label}</span>
          {valB !== null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${pctDelta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"}`}>
              {pctDelta >= 0 ? `+${pctDelta}%` : `${pctDelta}%`}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-3 text-slate-700">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]"></span>
            {periodALabel}:
          </span>
          <span className="font-extrabold text-slate-900">{formatCurrency(valA)}</span>
        </div>

        {valB !== null && (
          <div className="flex items-center justify-between gap-3 text-slate-500">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-slate-400 border border-slate-300"></span>
              {compareLabel}:
            </span>
            <span className="font-bold text-slate-700">{formatCurrency(valB)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {hasCompare && (
        <div className="flex items-center gap-4 text-[10px] font-bold px-1 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-[#2563eb]"></span>
            <span className="text-slate-700">{periodALabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-slate-400 border border-dashed border-slate-500"></span>
            <span className="text-slate-500">{compareLabel}</span>
          </div>
        </div>
      )}

      <div className="h-[230px] w-full pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
              dx={-8}
              tickFormatter={formatYAxis}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Primary Trend Line */}
            <Line
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#2563eb" }}
            />

            {/* Comparison Baseline Trend Line */}
            {hasCompare && (
              <Line
                type="monotone"
                dataKey="compareRevenue"
                name="compareRevenue"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#64748b" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
