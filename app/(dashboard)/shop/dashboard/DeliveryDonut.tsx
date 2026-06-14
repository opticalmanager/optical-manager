"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DeliveryDonutProps {
  data: {
    onTime: number;
    delayed: number;
    cancelled: number;
  };
}

export default function DeliveryDonut({ data }: DeliveryDonutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[160px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg animate-pulse">
        <span className="text-xs font-semibold text-slate-400">Loading delivery matrix...</span>
      </div>
    );
  }

  const chartData = [
    { name: "On Time", value: data.onTime || 0, color: "#10b981" },
    { name: "Delayed", value: data.delayed || 0, color: "#f59e0b" },
    { name: "Cancelled", value: data.cancelled || 0, color: "#ef4444" },
  ].filter(item => item.value > 0);

  // Fallback if no values at all
  const displayData = chartData.length > 0 ? chartData : [{ name: "No Orders", value: 1, color: "#e2e8f0" }];

  return (
    <div className="relative h-[160px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={65}
            paddingAngle={3}
            dataKey="value"
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center percentage summary text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-800">
          {data.onTime}%
        </span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          On Time
        </span>
      </div>
    </div>
  );
}
