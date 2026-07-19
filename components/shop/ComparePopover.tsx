"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, ChevronDown, Check, Calendar, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComparePopoverProps {
  currentCompareMode: string;
}

const presetOptions = [
  { value: "prev", label: "vs Previous Period", desc: "Prior equal timeframe" },
  { value: "mom", label: "vs Previous Month (MoM)", desc: "1 month prior" },
  { value: "yoy", label: "vs Same Period Last Year (YoY)", desc: "Seasonal 1 year prior" },
  { value: "qoq", label: "vs Previous Quarter (QoQ)", desc: "3 months prior" },
  { value: "none", label: "No Comparison", desc: "Show raw values only" },
];

export default function ComparePopover({ currentCompareMode }: ComparePopoverProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Custom comparison dates
  const [compFrom, setCompFrom] = useState(() => searchParams.get("compFrom") || "");
  const [compTo, setCompTo] = useState(() => searchParams.get("compTo") || "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetSelect = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("compare", val);
    params.delete("compFrom");
    params.delete("compTo");
    router.push(`/shop/analytics?${params.toString()}`);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (!compFrom || !compTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("compare", "custom");
    params.set("compFrom", compFrom);
    params.set("compTo", compTo);
    router.push(`/shop/analytics?${params.toString()}`);
    setIsOpen(false);
  };

  const selectedPresetLabel = presetOptions.find(p => p.value === currentCompareMode)?.label || "Compare: Off";

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold shadow-2xs hover:border-[#2563eb] hover:bg-blue-50/30 transition-all cursor-pointer"
      >
        <Layers className="h-4 w-4 text-[#2563eb]" />
        <span>{selectedPresetLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#2563eb]" /> Select Comparison Window
            </h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Subtabs: Presets vs Custom */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setTab("preset")}
              className={`flex-1 py-1 rounded-lg transition-all ${tab === "preset" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Quick Presets
            </button>
            <button
              onClick={() => setTab("custom")}
              className={`flex-1 py-1 rounded-lg transition-all ${tab === "custom" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Custom Dual Dates
            </button>
          </div>

          {tab === "preset" ? (
            <div className="space-y-1">
              {presetOptions.map((opt) => {
                const isSelected = currentCompareMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handlePresetSelect(opt.value)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${isSelected ? "bg-blue-50/80 border border-blue-100" : "hover:bg-slate-50"}`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563eb]">
                        {opt.label}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {opt.desc}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#2563eb]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold text-slate-500">
                Select custom baseline date range to compare against primary window:
              </p>
              
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Baseline Comparison Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={compFrom}
                    onChange={(e) => setCompFrom(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#2563eb]"
                  />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={compTo}
                    onChange={(e) => setCompTo(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  onClick={() => handlePresetSelect("none")}
                  variant="outline"
                  className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleCustomApply}
                  disabled={!compFrom || !compTo}
                  className="h-8 px-3 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg cursor-pointer"
                >
                  Apply Comparison
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
