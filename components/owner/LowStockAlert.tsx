import React from "react";
import Link from "next/link";
import { PackageOpen, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
}

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  // Translate DB Category Enum to readable text
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "FRAME": return "Frame";
      case "LENS": return "Lens";
      case "CONTACT_LENS": return "Contact Lens";
      case "ACCESSORY": return "Accessory";
      case "SOLUTION": return "Solution";
      default: return category;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 tracking-tight">
            Low Stock Alerts
          </h3>
        </div>
        <Link 
          href="/owner/inventory" 
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          <span>View stock</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-48 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner animate-pulse">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">All items fully in stock</p>
              <p className="text-xs text-slate-400 max-w-[200px]">No inventory items are currently running below their minimum count.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30 hover:bg-red-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {item.name}
                  </p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 mt-1 uppercase">
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-red-600">
                    {item.quantity} left
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Min limit: {item.minQuantity}
                  </p>
                </div>
              </div>
            ))}
            
            {items.length > 5 && (
              <div className="text-center pt-2">
                <Link 
                  href="/owner/inventory"
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  and {items.length - 5} more item(s) running low &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
