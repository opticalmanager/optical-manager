"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg animate-pulse">
        <span className="text-xs font-semibold text-slate-400">Loading trend analysis...</span>
      </div>
    );
  }

  const formatYAxis = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    }
    return `₹${value}`;
  };

  return (
    <div className="h-[280px] w-full pr-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
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
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              padding: "8px 12px",
            }}
            formatter={(value: any) => [formatCurrency(value), "Revenue"]}
            labelStyle={{ fontWeight: 700, color: "#1e293b", fontSize: "11px", marginBottom: "4px" }}
            itemStyle={{ fontSize: "11px", color: "#4f46e5", fontWeight: 650 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#4f46e5"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
