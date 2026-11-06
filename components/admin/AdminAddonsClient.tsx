"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { 
  Cpu, 
  Sparkles, 
  Database, 
  DollarSign, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ArrowRight,
  TrendingUp,
  Building2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Tag,
  MessageCircle,
  Smartphone,
  Sliders,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toggleOrganizationAddonAction } from "@/actions/addons.actions";
import { toast } from "sonner";

interface AdminAddonsClientProps {
  initialData: {
    telemetry: {
      totalQueries: number;
      cachedHits: number;
      liveCalls: number;
      cacheHitRatio: number;
      totalCostInr: number;
      whatsappDispatches: number;
    };
    tenants: Array<{
      id: string;
      name: string;
      slug: string | null;
      plan: string;
      gstAddonEnabled: boolean;
      costPerCall: string;
      totalCalls: number;
      totalCostInr: number;
      createdAt: string;
    }>;
  };
}

export default function AdminAddonsClient({ initialData }: AdminAddonsClientProps) {
  const [telemetry, setTelemetry] = useState(initialData.telemetry);
  const [tenants, setTenants] = useState(initialData.tenants);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "ENABLED" | "DISABLED" | "HIGH_USAGE">("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit Rate Modal state
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [customRate, setCustomRate] = useState("0.40");
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (selectedFilter === "ENABLED" && !t.gstAddonEnabled) return false;
      if (selectedFilter === "DISABLED" && t.gstAddonEnabled) return false;
      if (selectedFilter === "HIGH_USAGE" && t.totalCalls < 5) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.slug && t.slug.toLowerCase().includes(q))
      );
    });
  }, [tenants, selectedFilter, searchQuery]);

  const handleToggleAddon = async (tenantId: string, currentStatus: boolean) => {
    setTogglingId(tenantId);
    try {
      const newStatus = !currentStatus;
      const res = await toggleOrganizationAddonAction({
        organizationId: tenantId,
        addonKey: "GST_AUTOFETCH",
        isEnabled: newStatus,
      });

      if (res.success) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, gstAddonEnabled: newStatus } : t
          )
        );
        toast.success(`GST add-on ${newStatus ? "enabled" : "disabled"} for store.`);
      } else {
        toast.error(res.error || "Failed to update add-on.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle add-on.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setIsUpdatingRate(true);
    try {
      const res = await toggleOrganizationAddonAction({
        organizationId: editingTenant.id,
        addonKey: "GST_AUTOFETCH",
        isEnabled: editingTenant.gstAddonEnabled,
        costPerCall: customRate,
      });

      if (res.success) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === editingTenant.id ? { ...t, costPerCall: customRate } : t
          )
        );
        toast.success(`Rate card updated to ₹${customRate}/call for ${editingTenant.name}`);
        setEditingTenant(null);
      } else {
        toast.error(res.error || "Failed to update rate card.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred.");
    } finally {
      setIsUpdatingRate(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[1520px] mx-auto select-none animate-in fade-in duration-200">
      {/* ── Top Executive Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Add-on Services &amp; API Control Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-1">
            Platform-wide API consumption telemetry, taxpayer lookup rate cards, WhatsApp dispatch logs, and quota provisioning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/organizations">
            <Button
              variant="outline"
              className="h-8.5 px-3 text-xs font-semibold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <span>Manage Stores</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 Telemetry Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Lookups */}
        <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL GSTIN QUERIES</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {telemetry.totalQueries} <span className="text-xs font-normal text-slate-400">Calls</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {telemetry.liveCalls} live API calls • {telemetry.cachedHits} DB cached
            </p>
          </div>
        </div>

        {/* Metric 2: Cache Hit Ratio */}
        <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">CACHE HIT RATIO</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              {telemetry.cacheHitRatio}%
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Free queries served with zero external API fees
            </p>
          </div>
        </div>

        {/* Metric 3: Total Costs Incurred */}
        <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">ACCRUED API COSTS</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatCurrency(telemetry.totalCostInr)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Statutory base rate @ ₹0.40/call
            </p>
          </div>
        </div>

        {/* Metric 4: WhatsApp Messages */}
        <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">WHATSAPP DISPATCHES</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {telemetry.whatsappDispatches} <span className="text-xs font-normal text-slate-400">Messages</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Order forms, bills, and eye Rx delivered
            </p>
          </div>
        </div>
      </div>

      {/* ── Add-on Modules Catalog (4 Cards) ── */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          Available Platform Add-on Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: GST Verification */}
          <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE &amp; ACTIVE
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">₹0.40/call</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>GSTIN Verification</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                3-tier taxpayer lookup using Luhn Modulo 36 offline check + local cache + live Appyflow API.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Auto B2B Tax Invoice</span>
              <span className="text-emerald-400 font-bold">100% Taxpayer Match</span>
            </div>
          </div>

          {/* Card 2: WhatsApp Assistant */}
          <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE &amp; ACTIVE
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">Zero Gateway Fee</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2.5 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>WhatsApp Assistant</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Silent background desktop assistant dispatch + browser fallback for orders, Rx, and bill dispatches.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Local Counter Sync</span>
              <span className="text-emerald-400 font-bold">Free POS Dispatch</span>
            </div>
          </div>

          {/* Card 3: TSPL2 Barcode Engine */}
          <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  CORE BUILT-IN
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">Included</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2.5 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-blue-400" />
                <span>TSPL2 Barcode Engine</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Vector SVG barcodes with exact 81x12mm barbell flap geometry and native TSPL2 `.PRN` generation.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>TSC, Zebra, TVS Calibrated</span>
              <span className="text-blue-400 font-bold">203/300 DPI</span>
            </div>
          </div>

          {/* Card 4: SMS Gateway */}
          <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  MODULAR GATEWAY
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">Configurable</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2.5 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-purple-400" />
                <span>SMS Notification Gateway</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                DLT-compliant Indian telecom route for transactional pickup alerts and marketing dispatches.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Enterprise DLT Ready</span>
              <span className="text-purple-400 font-bold">Modular</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tenant Quota & Consumption Matrix ── */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-[#0f172a]">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span>Tenant Add-on Quota Matrix ({filteredTenants.length})</span>
            </h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              Configure per-store rate cards, toggle API capabilities, and audit consumption
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-60">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
              {(["ALL", "ENABLED", "DISABLED", "HIGH_USAGE"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedFilter === f
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f === "HIGH_USAGE" ? "HIGH USAGE" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f172a] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-bold">Tenant Chain</th>
                <th className="py-2.5 px-3 text-center font-bold">Plan</th>
                <th className="py-2.5 px-4 text-center font-bold">GSTIN Add-on Status</th>
                <th className="py-2.5 px-4 text-center font-bold">Rate Card</th>
                <th className="py-2.5 px-4 text-center font-bold">Queries Used</th>
                <th className="py-2.5 px-4 text-center font-bold">Accrued Cost</th>
                <th className="py-2.5 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    No tenant stores matching the filter.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-[#162238]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-400 font-bold text-[11px] flex items-center justify-center border border-blue-500/20 shrink-0">
                          {t.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{t.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">slug: {t.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {t.plan}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={togglingId === t.id}
                        onClick={() => handleToggleAddon(t.id, t.gstAddonEnabled)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          t.gstAddonEnabled
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                        }`}
                      >
                        {togglingId === t.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : t.gstAddonEnabled ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>{t.gstAddonEnabled ? "ENABLED" : "DISABLED"}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTenant(t);
                          setCustomRate(t.costPerCall || "0.40");
                        }}
                        className="text-slate-300 hover:text-blue-400 font-mono font-bold text-[11px] underline decoration-dotted cursor-pointer"
                      >
                        ₹{t.costPerCall}/call
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="font-extrabold text-white font-mono text-xs">
                        {t.totalCalls}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="font-extrabold text-purple-400 font-mono text-xs">
                        {formatCurrency(t.totalCostInr)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/organizations/${t.id}`}>
                        <Button
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] font-bold border-slate-700/80 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-lg cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <span>Manage Store</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Rate Card Modal ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Configure Rate Card</h3>
                <p className="text-[11px] text-slate-400 truncate">{editingTenant.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Cost Per Verified GST Call (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="w-full h-8.5 pl-7 pr-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Default base platform cost is ₹0.40/call
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTenant(null)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingRate}
                  className="text-xs h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {isUpdatingRate ? "Saving..." : "Save Rate Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
