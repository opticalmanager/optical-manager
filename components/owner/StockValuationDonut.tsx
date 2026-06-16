"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface StockCategoryData {
  category: string;
  value: number;
  label: string;
  color: string;
}

interface StockValuationDonutProps {
  data: StockCategoryData[];
}

export function StockValuationDonut({ data }: StockValuationDonutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[260px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg animate-pulse">
        <span className="text-xs font-semibold text-slate-400">Loading asset distribution...</span>
      </div>
    );
  }

  const totalValuation = data.reduce((sum, item) => sum + item.value, 0);

  // Formatting large sums compactly without decimal places for clean layout
  const formatCompactValue = (val: number) => {
    return val.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  const displayData = data.length > 0 && totalValuation > 0
    ? data.filter(item => item.value > 0)
    : [{ category: "EMPTY", value: 1, label: "No Assets", color: "#e2e8f0" }];

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Donut Chart with Center Text */}
      <div className="relative h-[130px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={56}
              paddingAngle={3}
              dataKey="value"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            {totalValuation > 0 && (
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "11px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                }}
                formatter={(value: any) => [formatCurrency(value), "Valuation"]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center valuation text */}
        <div className="absolute flex flex-col items-center justify-center text-center px-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            Total Value
          </span>
          <span className="text-xs font-black text-slate-800 mt-1 leading-none">
            {formatCompactValue(totalValuation)}
          </span>
        </div>
      </div>

      {/* Legend & Allocation details (Stacked underneath) */}
      <div className="w-full space-y-1.5 mt-1">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-0.5 mb-1">
          Capital Allocation
        </h4>
        <div className="space-y-1">
          {displayData.map((item, idx) => {
            const percentage = totalValuation > 0 && item.category !== "EMPTY"
              ? ((item.value / totalValuation) * 100).toFixed(0)
              : "0";
            
            return (
              <div key={idx} className="flex items-center justify-between text-[11px] font-semibold pb-0.5 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-slate-500 truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-800 font-bold">
                    {item.category === "EMPTY" ? "-" : formatCompactValue(item.value)}
                  </span>
                  {item.category !== "EMPTY" && (
                    <span className="text-slate-400 font-bold text-[9px] bg-slate-50 border border-slate-100 rounded px-1 min-w-[28px] text-center">
                      {percentage}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
