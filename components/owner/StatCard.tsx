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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-4">
      {/* Icon Wrapper */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${style.bg}`}>
        <Icon className={`w-6 h-6 ${style.text}`} />
      </div>

      {/* Content */}
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none pt-1">
          {value}
        </p>
        
        {/* Trend or description */}
        {(trend || description) && (
          <div className="flex items-center gap-1.5 pt-2 text-xs font-medium">
            {trend && (
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold
                ${trend.isPositive 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "bg-red-50 text-red-700"
                }
              `}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {description && (
              <span className="text-slate-400 truncate font-normal">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
