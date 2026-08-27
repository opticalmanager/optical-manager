"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Trash2, 
  Layers, 
  Plus, 
  Minus, 
  HelpCircle, 
  CheckCircle2, 
  SlidersHorizontal,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LensPowerMatrixProps {
  initialData?: Record<string, Record<string, number>>;
  initialStockPower?: string;
  onMatrixChange?: (data: {
    matrix: Record<string, Record<string, number>>;
    totalQuantity: number;
    powerSummary: string;
  }) => void;
  onQuantitySync?: (totalQuantity: number) => void;
}

// Optical standard SPH steps (0.00 to 4.00, with extended range to 6.00)
const SPH_STEPS_STANDARD = [
  0.00, 0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 
  2.00, 2.25, 2.50, 2.75, 3.00, 3.25, 3.50, 3.75, 4.00
];

const SPH_STEPS_EXTENDED = [
  ...SPH_STEPS_STANDARD,
  4.25, 4.50, 4.75, 5.00, 5.25, 5.50, 5.75, 6.00
];

// Optical standard CYL negative steps (0.00 to -2.00, with extended to -3.00)
const CYL_STEPS_STANDARD = [
  0.00, -0.25, -0.50, -0.75, -1.00, -1.25, -1.50, -1.75, -2.00
];

const CYL_STEPS_EXTENDED = [
  ...CYL_STEPS_STANDARD,
  -2.25, -2.50, -2.75, -3.00
];

export function LensPowerMatrix({
  initialData,
  initialStockPower,
  onMatrixChange,
  onQuantitySync,
}: LensPowerMatrixProps) {
  // Chart sign mode: "minus" | "plus"
  const [chartMode, setChartMode] = useState<"minus" | "plus">("minus");
  
  // Power range density toggle: standard (up to 4.00) vs extended (up to 6.00)
  const [isExtendedRange, setIsExtendedRange] = useState(false);
  
  // 2D Matrix storage: { [sphKey: string]: { [cylKey: string]: number } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      return initialData;
    }
    // Attempt parse from initialStockPower if JSON
    if (initialStockPower && initialStockPower.startsWith("{")) {
      try {
        const parsed = JSON.parse(initialStockPower);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // Not JSON formatted
      }
    }
    return {};
  });

  // Active SPH columns based on chart mode (Minus vs Plus)
  const sphList = useMemo(() => {
    const rawSteps = isExtendedRange ? SPH_STEPS_EXTENDED : SPH_STEPS_STANDARD;
    return rawSteps.map((step) => {
      if (step === 0) return "0.00";
      const formatted = step.toFixed(2);
      return chartMode === "plus" ? `+${formatted}` : `-${formatted}`;
    });
  }, [chartMode, isExtendedRange]);

  // Active CYL rows (always standard negative in optical lab stocking)
  const cylList = useMemo(() => {
    const rawSteps = isExtendedRange ? CYL_STEPS_EXTENDED : CYL_STEPS_STANDARD;
    return rawSteps.map((step) => {
      if (step === 0) return "0.00";
      return step.toFixed(2);
    });
  }, [isExtendedRange]);

  // Calculate total matrix pieces and unique stocked combinations
  const { totalCount, uniqueCombinations, activeSphRange, activeCylRange } = useMemo(() => {
    let sum = 0;
    let combinations = 0;
    const filledSphs = new Set<string>();
    const filledCyls = new Set<string>();

    Object.entries(matrix).forEach(([sph, cyls]) => {
      Object.entries(cyls).forEach(([cyl, qty]) => {
        if (qty && qty > 0) {
          sum += Number(qty);
          combinations += 1;
          filledSphs.add(sph);
          filledCyls.add(cyl);
        }
      });
    });

    let sphSummary = "None";
    if (filledSphs.size > 0) {
      const sortedSphs = Array.from(filledSphs).sort((a, b) => parseFloat(a) - parseFloat(b));
      sphSummary = `${sortedSphs[0]} to ${sortedSphs[sortedSphs.length - 1]}`;
    }

    let cylSummary = "None";
    if (filledCyls.size > 0) {
      const sortedCyls = Array.from(filledCyls).sort((a, b) => parseFloat(a) - parseFloat(b));
      cylSummary = `${sortedCyls[0]} to ${sortedCyls[sortedCyls.length - 1]}`;
    }

    return {
      totalCount: sum,
      uniqueCombinations: combinations,
      activeSphRange: sphSummary,
      activeCylRange: cylSummary,
    };
  }, [matrix]);

  // Notify parent form of matrix mutations
  useEffect(() => {
    const summaryString = totalCount > 0 
      ? `SPH: ${activeSphRange} | CYL: ${activeCylRange} (${totalCount} pcs in ${uniqueCombinations} powers)`
      : "";

    if (onMatrixChange) {
      onMatrixChange({
        matrix,
        totalQuantity: totalCount,
        powerSummary: summaryString,
      });
    }

    if (onQuantitySync && totalCount > 0) {
      onQuantitySync(totalCount);
    }
  }, [matrix, totalCount, uniqueCombinations, activeSphRange, activeCylRange, onMatrixChange, onQuantitySync]);

  // Handle individual cell edit
  const handleCellChange = (sphKey: string, cylKey: string, value: string) => {
    const parsed = parseInt(value, 10);
    const validQty = isNaN(parsed) || parsed < 0 ? 0 : parsed;

    setMatrix((prev) => {
      const next = { ...prev };
      if (!next[sphKey]) {
        next[sphKey] = {};
      }
      
      if (validQty === 0) {
        delete next[sphKey][cylKey];
        if (Object.keys(next[sphKey]).length === 0) {
          delete next[sphKey];
        }
      } else {
        next[sphKey] = {
          ...next[sphKey],
          [cylKey]: validQty,
        };
      }
      return next;
    });
  };

  // Clear entire matrix
  const handleClearMatrix = useCallback(() => {
    setMatrix({});
  }, []);

  // Quick fill batch quantity helper
  const handleQuickBatchFill = (qty: number) => {
    const newMatrix: Record<string, Record<string, number>> = { ...matrix };
    sphList.slice(0, 5).forEach((sph) => {
      if (!newMatrix[sph]) newMatrix[sph] = {};
      cylList.slice(0, 5).forEach((cyl) => {
        newMatrix[sph][cyl] = qty;
      });
    });
    setMatrix(newMatrix);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden space-y-0 transition-all">
      {/* ── Header Toolbar ── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Mode Buttons Matching Exact Image */}
        <div className="flex flex-wrap items-center gap-2">
          {/* (-) Minus Power Sphere Chart Button */}
          <button
            type="button"
            onClick={() => setChartMode("minus")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none ${
              chartMode === "minus"
                ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 scale-[1.01]"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            (-) Minus Power Sphere Chart
          </button>

          {/* (+) Plus Power Sphere Chart Button */}
          <button
            type="button"
            onClick={() => setChartMode("plus")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none ${
              chartMode === "plus"
                ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/20 scale-[1.01]"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            (+) Plus Power Sphere Chart
          </button>

          {/* Clear Matrix Button */}
          <button
            type="button"
            onClick={handleClearMatrix}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all cursor-pointer flex items-center gap-1"
            title="Clear all cell entries"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Matrix
          </button>
        </div>

        {/* Right: Quick Telemetry & Range Density Toggle */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Extended Power Toggle */}
          <button
            type="button"
            onClick={() => setIsExtendedRange(!isExtendedRange)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
              isExtendedRange
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
            }`}
            title="Toggle power range between Standard (up to 4.00) and Extended (up to 6.00)"
          >
            <SlidersHorizontal className="w-3 h-3" />
            {isExtendedRange ? "Range: 0 to ±6.00 (Extended)" : "Range: 0 to ±4.00 (Standard)"}
          </button>

          {/* Matrix Total Badge */}
          <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Total Matrix Stock:
            </span>
            <span className="text-xs font-black text-emerald-800">
              {totalCount} Pcs
            </span>
          </div>
        </div>

      </div>

      {/* ── Subtitle Instruction Banner ── */}
      <div className="px-5 py-2 bg-blue-50/40 border-b border-blue-100/60 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>
            Enter <strong>Quantity (pcs)</strong> in each cell corresponding to the <strong>Sphere (SPH columns)</strong> and <strong>Cylinder (CYL rows)</strong>.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <span>Active Chart: <strong>{chartMode === "minus" ? "Negative (-)" : "Positive (+)"} SPH</strong></span>
          <span>•</span>
          <span>Combinations: <strong>{uniqueCombinations}</strong></span>
        </div>
      </div>

      {/* ── The Responsive SPH / CYL Table Grid ── */}
      <div className="overflow-x-auto max-w-full p-2 sm:p-4">
        <table className="border-collapse text-xs select-none min-w-[720px] w-full">
          <thead>
            {/* Header Row: SPH / CYL -> and SPH Values */}
            <tr className="bg-slate-50/80 border-b border-slate-200">
              {/* Corner Header */}
              <th className="sticky left-0 z-20 bg-slate-100 border-r border-b border-slate-200 px-3 py-2.5 text-center min-w-[90px] w-[90px] font-black text-[10px] text-slate-600 uppercase tracking-wider shadow-xs">
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className="text-slate-800 font-extrabold">SPH</span>
                  <span className="text-[8px] text-slate-400 font-bold">/ CYL ↓</span>
                </div>
              </th>

              {/* SPH Column Headings */}
              {sphList.map((sphVal) => (
                <th
                  key={sphVal}
                  className={`border-r border-b border-slate-200 px-2 py-2 text-center min-w-[58px] font-black text-xs tracking-tight transition-colors ${
                    sphVal === "0.00"
                      ? "bg-slate-100/90 text-slate-800"
                      : chartMode === "minus"
                      ? "bg-blue-50/40 text-blue-900 font-bold"
                      : "bg-emerald-50/40 text-emerald-900 font-bold"
                  }`}
                >
                  {sphVal}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {cylList.map((cylVal) => (
              <tr key={cylVal} className="hover:bg-slate-50/60 transition-colors group">
                {/* Sticky Left CYL Header Column */}
                <td className="sticky left-0 z-10 bg-slate-50 group-hover:bg-slate-100 border-r border-b border-slate-200 px-3 py-1.5 font-bold font-mono text-xs text-slate-700 text-center shadow-xs">
                  {cylVal}
                </td>

                {/* Matrix SPH Cells */}
                {sphList.map((sphVal) => {
                  const qty = matrix[sphVal]?.[cylVal] || 0;
                  const hasStock = qty > 0;

                  return (
                    <td
                      key={`${sphVal}_${cylVal}`}
                      className={`border-r border-b border-slate-200 p-0.5 text-center transition-all ${
                        hasStock ? "bg-blue-50/80 font-bold" : "hover:bg-slate-100/40"
                      }`}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={hasStock ? qty : ""}
                        onChange={(e) => handleCellChange(sphVal, cylVal, e.target.value)}
                        placeholder="-"
                        className={`w-full h-8 text-center text-xs font-mono font-bold rounded outline-none transition-all ${
                          hasStock
                            ? "text-[#2563eb] bg-white border border-blue-300 shadow-xs ring-1 ring-blue-400/20"
                            : "text-slate-600 bg-transparent hover:bg-white focus:bg-white focus:border focus:border-indigo-500 placeholder-slate-300"
                        }`}
                        title={`SPH: ${sphVal}, CYL: ${cylVal}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Matrix Footer Info & Fast Action Presets ── */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Quick Batch Fill (Top 5×5):
          </span>
          {[2, 5, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleQuickBatchFill(num)}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
            >
              +{num} per cell
            </button>
          ))}
        </div>

        {/* Live Power Summary String */}
        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
          {totalCount > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-700">
                Active: SPH ({activeSphRange}) • CYL ({activeCylRange}) • {totalCount} total pieces
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-semibold">
              Matrix is empty. Enter counts above or use standard stock quantity.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
