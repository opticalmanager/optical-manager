"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, X, Calendar, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareModalProps {
  currentCompareMode?: string;
  currentGranularity?: string;
  currentPeriodA?: string;
  currentPeriodB?: string;
  periodALabel?: string;
  periodBLabel?: string;
}

type GranularityType = "day" | "week" | "month" | "quarter" | "year";

const monthsList = [
  { val: "01", label: "January" },
  { val: "02", label: "February" },
  { val: "03", label: "March" },
  { val: "04", label: "April" },
  { val: "05", label: "May" },
  { val: "06", label: "June" },
  { val: "07", label: "July" },
  { val: "08", label: "August" },
  { val: "09", label: "September" },
  { val: "10", label: "October" },
  { val: "11", label: "November" },
  { val: "12", label: "December" },
];

const quartersList = [
  { val: "Q1", label: "Q1 (Jan - Mar)" },
  { val: "Q2", label: "Q2 (Apr - Jun)" },
  { val: "Q3", label: "Q3 (Jul - Sep)" },
  { val: "Q4", label: "Q4 (Oct - Dec)" },
];

const yearsList = ["2026", "2025", "2024", "2023"];

function getWeekOptionsForYear(yearNumStr: string) {
  const yearNum = parseInt(yearNumStr, 10) || 2026;
  const weeks = [];
  
  const jan4 = new Date(yearNum, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  for (let w = 1; w <= 52; w++) {
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + (w - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    weeks.push({
      val: String(w),
      label: `Week ${w} (${startStr} - ${endStr})`
    });
  }
  return weeks;
}

export default function CompareModal({
  currentCompareMode,
  currentGranularity = "month",
  currentPeriodA,
  currentPeriodB,
  periodALabel,
  periodBLabel,
}: CompareModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const [granularity, setGranularity] = useState<GranularityType>(
    (currentGranularity as GranularityType) || "month"
  );

  // Default states for Period A and Period B
  const [dayA, setDayA] = useState(() => new Date().toISOString().split("T")[0]);
  const [dayB, setDayB] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });

  const [weekA, setWeekA] = useState("29");
  const [yearWeekA, setYearWeekA] = useState("2026");
  const [weekB, setWeekB] = useState("28");
  const [yearWeekB, setYearWeekB] = useState("2026");

  const [monthA, setMonthA] = useState("07");
  const [yearMonthA, setYearMonthA] = useState("2026");
  const [monthB, setMonthB] = useState("06");
  const [yearMonthB, setYearMonthB] = useState("2026");

  const [quarterA, setQuarterA] = useState("Q3");
  const [yearQuarterA, setYearQuarterA] = useState("2026");
  const [quarterB, setQuarterB] = useState("Q2");
  const [yearQuarterB, setYearQuarterB] = useState("2026");

  const [yearA, setYearA] = useState("2026");
  const [yearB, setYearB] = useState("2025");

  const isComparisonActive = Boolean(
    searchParams.get("granularity") || (currentCompareMode && currentCompareMode !== "none")
  );

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("compare", "granularity");
    params.set("granularity", granularity);

    let valA = "";
    let valB = "";

    if (granularity === "day") {
      valA = dayA;
      valB = dayB;
    } else if (granularity === "week") {
      valA = `${yearWeekA}-W${weekA.padStart(2, "0")}`;
      valB = `${yearWeekB}-W${weekB.padStart(2, "0")}`;
    } else if (granularity === "month") {
      valA = `${yearMonthA}-${monthA}`;
      valB = `${yearMonthB}-${monthB}`;
    } else if (granularity === "quarter") {
      valA = `${yearQuarterA}-${quarterA}`;
      valB = `${yearQuarterB}-${quarterB}`;
    } else if (granularity === "year") {
      valA = yearA;
      valB = yearB;
    }

    params.set("periodA", valA);
    params.set("periodB", valB);

    router.push(`/shop/analytics?${params.toString()}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    params.delete("granularity");
    params.delete("periodA");
    params.delete("periodB");
    params.delete("compFrom");
    params.delete("compTo");
    router.push(`/shop/analytics?${params.toString()}`);
    setIsOpen(false);
  };

  const weeksOptionsA = getWeekOptionsForYear(yearWeekA);
  const weeksOptionsB = getWeekOptionsForYear(yearWeekB);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs transition-all cursor-pointer ${
          isComparisonActive
            ? "border-[#2563eb] bg-blue-50 text-[#2563eb]"
            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <Layers className="h-4 w-4 text-[#2563eb]" />
        <span>
          {isComparisonActive && periodALabel && periodBLabel
            ? `Compare: ${periodALabel} vs ${periodBLabel}`
            : "Compare Periods..."}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 select-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#2563eb] border border-blue-100">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Compare 2 Time Periods
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Select granularity and choose two specific periods to analyze growth/loss
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: Granularity Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Step 1: Choose Granularity
              </label>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold">
                {(["day", "week", "month", "quarter", "year"] as GranularityType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={`py-2 rounded-lg capitalize transition-all cursor-pointer ${
                      granularity === g
                        ? "bg-white text-[#2563eb] shadow-xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Dynamic Period Pickers */}
            <div className="space-y-3 pt-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Step 2: Select Periods to Compare
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                {/* Period A (Primary) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2563eb]"></span> Primary Period (A)
                  </span>

                  {granularity === "day" && (
                    <input
                      type="date"
                      value={dayA}
                      onChange={(e) => setDayA(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#2563eb]"
                    />
                  )}

                  {granularity === "week" && (
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={yearWeekA}
                        onChange={(e) => setYearWeekA(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                      <select
                        value={weekA}
                        onChange={(e) => setWeekA(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white truncate"
                      >
                        {weeksOptionsA.map((w) => (
                          <option key={w.val} value={w.val}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "month" && (
                    <div className="flex gap-1.5">
                      <select
                        value={monthA}
                        onChange={(e) => setMonthA(e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {monthsList.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={yearMonthA}
                        onChange={(e) => setYearMonthA(e.target.value)}
                        className="w-24 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "quarter" && (
                    <div className="flex gap-1.5">
                      <select
                        value={quarterA}
                        onChange={(e) => setQuarterA(e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {quartersList.map((q) => (
                          <option key={q.val} value={q.val}>
                            {q.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={yearQuarterA}
                        onChange={(e) => setYearQuarterA(e.target.value)}
                        className="w-24 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "year" && (
                    <select
                      value={yearA}
                      onChange={(e) => setYearA(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Period B (Baseline) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-600 block flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400"></span> Comparison Baseline (B)
                  </span>

                  {granularity === "day" && (
                    <input
                      type="date"
                      value={dayB}
                      onChange={(e) => setDayB(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#2563eb]"
                    />
                  )}

                  {granularity === "week" && (
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={yearWeekB}
                        onChange={(e) => setYearWeekB(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                      <select
                        value={weekB}
                        onChange={(e) => setWeekB(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white truncate"
                      >
                        {weeksOptionsB.map((w) => (
                          <option key={w.val} value={w.val}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "month" && (
                    <div className="flex gap-1.5">
                      <select
                        value={monthB}
                        onChange={(e) => setMonthB(e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {monthsList.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={yearMonthB}
                        onChange={(e) => setYearMonthB(e.target.value)}
                        className="w-24 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "quarter" && (
                    <div className="flex gap-1.5">
                      <select
                        value={quarterB}
                        onChange={(e) => setQuarterB(e.target.value)}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {quartersList.map((q) => (
                          <option key={q.val} value={q.val}>
                            {q.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={yearQuarterB}
                        onChange={(e) => setYearQuarterB(e.target.value)}
                        className="w-24 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {granularity === "year" && (
                    <select
                      value={yearB}
                      onChange={(e) => setYearB(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                className="h-9 px-3 text-xs font-bold border-slate-200 text-slate-600 rounded-xl cursor-pointer"
              >
                Turn Off Comparison
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="h-9 px-4 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl cursor-pointer shadow-xs"
                >
                  Apply Comparison
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
