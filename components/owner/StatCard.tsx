import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: "indigo" | "emerald" | "amber" | "blue";
  description?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "indigo", 
  description 
}: StatCardProps) {
  // Styles based on color choice
  const colorStyles = {
    indigo: {
      bg: "bg-indigo-50 border-indigo-100/50",
      text: "text-indigo-600",
    },
    emerald: {
      bg: "bg-emerald-50 border-emerald-100/50",
      text: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50 border-amber-100/50",
      text: "text-amber-600",
    },
    blue: {
      bg: "bg-blue-50 border-blue-100/50",
      text: "text-blue-600",
    },
  };

  const style = colorStyles[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4">
      {/* Top Row: Title & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${style.bg}`}>
          <Icon className={`w-4 h-4 ${style.text}`} />
        </div>
      </div>

      {/* Bottom Row: Value & Trend/Description */}
      <div className="space-y-2">
        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </p>
        
        {(trend || description) && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
            {trend && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 shrink-0
                ${trend.isPositive 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : "bg-red-50 text-red-700 border border-red-100"
                }
              `}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {description && (
              <span className="text-slate-400 truncate font-semibold">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
