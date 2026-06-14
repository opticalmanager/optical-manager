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
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with matching height to prevent layout shifts
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

  return (
    <div className="h-[250px] w-full pr-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
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
            itemStyle={{ fontSize: "11px", color: "#0a52c3", fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0a52c3"
            strokeWidth={3}
            dot={{ r: 4, fill: "#0a52c3", strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0, fill: "#0a52c3" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
