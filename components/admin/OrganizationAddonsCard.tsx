"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
  Clock,
  Coins,
  Database,
  ArrowUpRight,
  ChevronDown,
  MessageSquare,
  FileCheck2,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  toggleOrganizationAddonAction,
  getOrganizationAddonStatsAction,
  type AddonStatsResult,
} from "@/actions/addons.actions";

interface OrganizationAddonsCardProps {
  organizationId: string;
  initialIsEnabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function OrganizationAddonsCard({
  organizationId,
  initialIsEnabled = false,
}: OrganizationAddonsCardProps) {
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
  const [isToggling, startToggleTransition] = useTransition();

  // Period filter state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [periodPreset, setPeriodPreset] = useState<"this-month" | "last-month" | "custom">("this-month");

  // Analytics state
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState<AddonStatsResult["stats"] | null>(null);

  // Helper to compute date range
  const getDateRange = (preset: "this-month" | "last-month" | "custom", m: number, y: number) => {
    const now = new Date();
    if (preset === "this-month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: start.toISOString().split("T")[0],
        to: end.toISOString().split("T")[0],
      };
    } else if (preset === "last-month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: start.toISOString().split("T")[0],
        to: end.toISOString().split("T")[0],
      };
    } else {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return {
        from: start.toISOString().split("T")[0],
        to: end.toISOString().split("T")[0],
      };
    }
  };

  // Fetch stats when period changes or when enabled
  const fetchStats = async (preset: "this-month" | "last-month" | "custom", m: number, y: number) => {
    setIsLoadingStats(true);
    try {
      const { from, to } = getDateRange(preset, m, y);
      const res = await getOrganizationAddonStatsAction({
        organizationId,
        addonKey: "GST_AUTOFETCH",
        fromDate: from,
        toDate: to,
      });

      if (res.success && res.stats) {
        setStatsData(res.stats);
        if (typeof res.isEnabled === "boolean") {
          setIsEnabled(res.isEnabled);
        }
      }
    } catch (err: any) {
      console.error("Failed to load addon stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats(periodPreset, selectedMonth, selectedYear);
  }, [organizationId, periodPreset, selectedMonth, selectedYear]);

  // Handle Toggle Switch
  const handleToggle = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);

    startToggleTransition(async () => {
      const res = await toggleOrganizationAddonAction({
        organizationId,
        addonKey: "GST_AUTOFETCH",
        isEnabled: nextState,
        costPerCall: "0.40",
      });

      if (res.success) {
        toast.success(
          nextState
            ? "GSTIN Auto-Fetch add-on enabled for this organization."
            : "GSTIN Auto-Fetch add-on disabled for this organization."
        );
        fetchStats(periodPreset, selectedMonth, selectedYear);
      } else {
        setIsEnabled(!nextState); // Rollback
        toast.error(res.error || "Failed to update add-on state.");
      }
    });
  };

  return (
    <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5 text-white">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">
            <Zap className="h-4 w-4 text-blue-400" />
            <span>Organization Add-ons & Integrations</span>
          </h2>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Configure external API capabilities, usage allowances, and monitor billing consumption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            Active Add-ons: <span className="text-blue-400 font-bold">{isEnabled ? 1 : 0}</span> / 4
          </span>
        </div>
      </div>

      {/* Grid of Add-on Cards */}
      <div className="space-y-4">
        {/* 1. GST Auto-fetch Add-on Card */}
        <div className={`p-4 rounded-xl border transition-all ${
          isEnabled 
            ? "bg-[#070b13] border-blue-500/40 shadow-lg shadow-blue-950/20" 
            : "bg-[#070b13]/60 border-slate-800/60"
        }`}>
          {/* Card Top Row: Info + Toggle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                isEnabled
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-500"
              }`}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-bold text-white">
                    GSTIN Auto-Fetch & Taxpayer Verification (Appyflow)
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                    isEnabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {isEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  Auto-populates official trade name, registered street address, and filing status directly into invoice and customer forms.
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 font-mono text-slate-300">
                    <Coins className="h-3 w-3 text-amber-400" />
                    ₹0.40 per live API call
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Database className="h-3 w-3" />
                    ₹0.00 for database cache hits
                  </span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">0ms offline checksum guard</span>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleToggle}
                  disabled={isToggling}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs font-bold text-slate-300 min-w-[50px]">
                {isToggling ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                ) : isEnabled ? (
                  "Enabled"
                ) : (
                  "Disabled"
                )}
              </span>
            </div>
          </div>

          {/* Card Body: Analytics & Usage (Visible when Enabled) */}
          {isEnabled && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
              {/* Period Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-[#0c1322] border border-slate-800/80 rounded-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-1.5 text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-300">Period:</span>
                  </div>

                  {/* This Month */}
                  <button
                    type="button"
                    onClick={() => setPeriodPreset("this-month")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      periodPreset === "this-month"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-[#070b13] text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    This Month
                  </button>

                  {/* Last Month */}
                  <button
                    type="button"
                    onClick={() => setPeriodPreset("last-month")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      periodPreset === "last-month"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-[#070b13] text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Last Month
                  </button>

                  {/* Month Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setPeriodPreset("custom");
                        setSelectedMonth(parseInt(e.target.value, 10));
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-200 bg-[#070b13] border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-6"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Year Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setPeriodPreset("custom");
                        setSelectedYear(parseInt(e.target.value, 10));
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-200 bg-[#070b13] border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-6"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {isLoadingStats && (
                  <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating metrics...
                  </span>
                )}
              </div>

              {/* 4 Interactive KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Lookups */}
                <div className="p-3.5 rounded-xl border border-slate-800/80 bg-[#070b13] hover:border-slate-700 transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Total Lookups
                  </div>
                  <div className="text-2xl font-extrabold text-white">
                    {statsData?.totalQueries ?? 0}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">All customer & invoice searches</p>
                </div>

                {/* Live Calls (Billed) */}
                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                    Live Calls (Billed)
                  </div>
                  <div className="text-2xl font-extrabold text-blue-300">
                    {statsData?.liveCalls ?? 0}
                  </div>
                  <p className="text-[10px] text-blue-400/70 mt-0.5">Fresh lookups via Appyflow</p>
                </div>

                {/* Cache Hits (Free) */}
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    Database Hits (Free)
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-300">
                    {statsData?.cachedHits ?? 0}
                  </div>
                  <p className="text-[10px] text-emerald-400/70 mt-0.5">Served at ₹0 from local cache</p>
                </div>

                {/* Total Accrued Cost */}
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Total Accrued Cost
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300">
                    ₹{(statsData?.totalCostInr ?? 0).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-amber-400/70 mt-0.5">Calculated @ ₹0.40 per live hit</p>
                </div>
              </div>

              {/* Recent Verification Activity Mini-Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Recent Verification Activity (Last 10 Lookups)
                  </span>
                  <span className="text-[10px] text-slate-500">Live transaction audit log</span>
                </div>

                <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-[#070b13]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b1220] border-b border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2">Timestamp</th>
                        <th className="px-3.5 py-2">GSTIN</th>
                        <th className="px-3.5 py-2">Taxpayer / Trade Name</th>
                        <th className="px-3.5 py-2 text-center">Type</th>
                        <th className="px-3.5 py-2 text-center">Tax Status</th>
                        <th className="px-3.5 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-normal">
                      {!statsData?.recentLogs || statsData.recentLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-500 font-medium text-xs">
                            No GST verification calls recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        statsData.recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#10182b] transition-colors">
                            <td className="px-3.5 py-2 text-[11px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-200 text-xs">
                              {log.gstin}
                            </td>
                            <td className="px-3.5 py-2 text-slate-300 max-w-[200px] truncate font-medium">
                              {log.tradeName}
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-block ${
                                log.isCached
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {log.isCached ? "CACHE HIT" : "LIVE CALL"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-block ${
                                log.status.toLowerCase() === "active"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-semibold text-slate-200">
                              {log.isCached ? "₹0.00" : `₹${parseFloat(log.costInr).toFixed(2)}`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Future Add-on Placeholder: WhatsApp Business Automation */}
        <div className="p-4 rounded-xl border border-slate-800/40 bg-[#070b13]/40 opacity-75">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-300">
                    WhatsApp Business Marketing & Invoicing
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    COMING SOON
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Automated dispatch of PDF invoices, eye prescription reminders, and birthday offers directly to patient WhatsApp numbers.
                </p>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 self-start sm:self-center">
              Available in Enterprise
            </div>
          </div>
        </div>

        {/* 3. Future Add-on Placeholder: Government e-Invoicing (IRN & QR) */}
        <div className="p-4 rounded-xl border border-slate-800/40 bg-[#070b13]/40 opacity-75">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 shrink-0">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-300">
                    Government e-Invoicing (IRN & Signed QR Code)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ROADMAP
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Direct real-time transmission of B2B optical invoices to the NIC e-Invoice registry for instant IRN number and QR generation.
                </p>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 self-start sm:self-center">
              Regulatory Tier
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
