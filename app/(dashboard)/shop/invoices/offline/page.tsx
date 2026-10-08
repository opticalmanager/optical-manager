"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Trash2,
  Search,
  FileText,
  Database,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { safeFormatDateLocale } from "@/lib/invoice-helpers";
import { useOffline } from "@/components/providers/OfflineProvider";
import {
  getOfflineInvoicesWithStats,
  syncOfflineInvoices,
  deleteOfflineInvoice,
} from "@/lib/offline/invoice-queue";
import { type OfflineQueuedInvoice } from "@/lib/offline/db";
import { toast } from "sonner";

export default function OfflineInvoicesOutboxPage() {
  const router = useRouter();
  const { shopId, isOnline, syncNow, isSyncing } = useOffline();
  const [invoices, setInvoices] = useState<OfflineQueuedInvoice[]>([]);
  const [stats, setStats] = useState({ total: 0, synced: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "FAILED" | "SYNCED">("ALL");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await getOfflineInvoicesWithStats(shopId || undefined);
      setInvoices(res.invoices);
      setStats(res.stats);
    } catch (err) {
      console.error("[OfflineOutbox] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("offline-databank-updated", handleUpdate);
    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);

    return () => {
      window.removeEventListener("offline-databank-updated", handleUpdate);
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
    };
  }, [shopId]);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.info("Internet connection required to push local bills to the cloud.");
      return;
    }
    toast.loading("Pushing all local bills to cloud database...", { id: "sync-all-outbox" });
    try {
      await syncNow();
      await loadData();
      toast.success("Outbox synchronization completed!", { id: "sync-all-outbox" });
    } catch (e: any) {
      toast.error(e.message || "Failed to complete outbox sync.", { id: "sync-all-outbox" });
    }
  };

  const handleSyncSingle = async (e: React.MouseEvent, queueId: string) => {
    e.stopPropagation();
    if (!isOnline) {
      toast.info("Internet connection required to push local bills to the cloud.");
      return;
    }
    setSyncingId(queueId);
    toast.loading("Syncing bill to cloud...", { id: `sync-${queueId}` });
    try {
      const res = await syncOfflineInvoices(shopId || "", queueId);
      if (res.syncedCount > 0) {
        toast.success("Bill successfully pushed to cloud!", { id: `sync-${queueId}` });
      } else {
        toast.error("Sync could not complete. Check bill details or error.", { id: `sync-${queueId}` });
      }
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to sync bill.", { id: `sync-${queueId}` });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, queueId: string, invoiceNumber: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove offline record ${invoiceNumber} from local device memory?`)) {
      return;
    }
    const ok = await deleteOfflineInvoice(queueId);
    if (ok) {
      toast.success(`Removed ${invoiceNumber} from local memory.`);
      await loadData();
    } else {
      toast.error("Failed to remove bill.");
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const custName = inv.payload?.customer?.fullName || "";
    const custPhone = inv.payload?.customer?.phone || "";
    const invNo = inv.offlineInvoiceNumber || "";
    const matchesSearch =
      !search ||
      custName.toLowerCase().includes(search.toLowerCase()) ||
      custPhone.includes(search) ||
      invNo.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === "PENDING") return inv.syncStatus === "PENDING" || inv.syncStatus === "SYNCING";
    if (filterTab === "FAILED") return inv.syncStatus === "FAILED";
    if (filterTab === "SYNCED") return inv.syncStatus === "SYNCED";
    return true;
  });

  return (
    <div className="space-y-4 pb-12 select-none text-slate-800 max-w-[1400px] mx-auto animate-fade-in">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/orders"
            className="p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            title="Back to Orders Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Offline Invoices Outbox
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#0a52c3] border border-blue-200">
                Local Device Storage
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Inspect, verify, and push invoices created locally in this browser's IndexedDB storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/shop/invoices/new"
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>New Bill</span>
          </Link>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing || !isOnline || (stats.pending === 0 && stats.failed === 0)}
            className="h-9 px-4 rounded-xl bg-[#0a52c3] hover:bg-[#004bb5] text-white text-xs font-bold transition-all shadow-sm shadow-[#0a52c3]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing Outbox..." : "Sync All to Cloud Now"}</span>
          </button>
        </div>
      </div>

      {/* 2. Compact KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Stored */}
        <Card
          onClick={() => setFilterTab("ALL")}
          className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all ${
            filterTab === "ALL"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in Device</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0a52c3]">
              <Database className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.total}</span>
            <span className="text-[10px] font-semibold text-slate-400">bills stored</span>
          </div>
        </Card>

        {/* KPI 2: Synced to Cloud */}
        <Card
          onClick={() => setFilterTab("SYNCED")}
          className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all ${
            filterTab === "SYNCED"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Synced to Cloud</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.synced}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Confirmed
            </span>
          </div>
        </Card>

        {/* KPI 3: Pending Sync */}
        <Card
          onClick={() => setFilterTab("PENDING")}
          className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all ${
            filterTab === "PENDING"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Sync</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.pending}</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              In Queue
            </span>
          </div>
        </Card>

        {/* KPI 4: Sync Paused / Failed */}
        <Card
          onClick={() => setFilterTab("FAILED")}
          className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all ${
            filterTab === "FAILED"
              ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
              : "border border-slate-200/80 bg-white shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attention Needed</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.failed}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              stats.failed > 0
                ? "text-rose-600 bg-rose-50 border-rose-100"
                : "text-slate-500 bg-slate-50 border-slate-200"
            }`}>
              {stats.failed > 0 ? "Needs Retry" : "Clean"}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Bill #, Patient, or Phone..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0a52c3] font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(["ALL", "PENDING", "FAILED", "SYNCED"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterTab === tab
                  ? "bg-[#0a52c3] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {tab === "ALL"
                ? `All (${stats.total})`
                : tab === "PENDING"
                ? `Pending (${stats.pending})`
                : tab === "FAILED"
                ? `Failed (${stats.failed})`
                : `Synced (${stats.synced})`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. High-Density Outbox Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100 tracking-wider">
                <th className="px-4 py-2.5">Offline Bill #</th>
                <th className="px-4 py-2.5">Date & Time</th>
                <th className="px-4 py-2.5">Patient Details</th>
                <th className="px-4 py-2.5 text-center">Items</th>
                <th className="px-4 py-2.5 text-right">Net Amount</th>
                <th className="px-4 py-2.5 text-center">Sync Status</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#0a52c3] inline-block mr-2" />
                    Loading local device records...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const p = inv.payload;
                  const customerName = p?.customer?.fullName || "Walk-in Patient";
                  const customerPhone = p?.customer?.phone || "No Phone";
                  const items = p?.invoiceItems || [];
                  const itemsCount = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);

                  let calculatedTotal = 0;
                  for (const it of items) {
                    calculatedTotal += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
                  }
                  const totalAmt = p?.total !== undefined ? Number(p.total) : calculatedTotal;

                  const isItemSyncing = syncingId === inv.id || inv.syncStatus === "SYNCING";

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/shop/invoices/offline/${inv.id}`)}
                      className="group hover:bg-slate-50/70 transition-colors align-middle cursor-pointer"
                    >
                      {/* Offline Bill # */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 group-hover:text-[#0a52c3] transition-colors">
                            {inv.offlineInvoiceNumber}
                          </span>
                          {inv.serverInvoiceNumber && (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              (#{inv.serverInvoiceNumber})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Time */}
                      <td className="px-4 py-2.5 text-slate-500 font-medium whitespace-nowrap">
                        {safeFormatDateLocale(inv.createdAt, "—", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Patient Details */}
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-800">{customerName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{customerPhone}</div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-2.5 text-center font-bold text-slate-600">
                        {itemsCount} item{itemsCount !== 1 ? "s" : ""}
                      </td>

                      {/* Net Amount */}
                      <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                        {formatCurrency(totalAmt)}
                      </td>

                      {/* Sync Status */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {inv.syncStatus === "SYNCED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Synced
                          </span>
                        ) : isItemSyncing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <RefreshCw className="h-3 w-3 animate-spin text-amber-600" /> Syncing...
                          </span>
                        ) : inv.syncStatus === "FAILED" ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                            title={inv.syncError || "Sync failed. Click Sync Now to retry."}
                          >
                            <AlertCircle className="h-3 w-3 text-rose-600" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#0a52c3] border border-blue-200">
                            <Clock className="h-3 w-3 text-[#0a52c3]" /> In Queue
                          </span>
                        )}
                        {inv.syncError && inv.syncStatus === "FAILED" && (
                          <p className="text-[9px] text-rose-600 font-semibold mt-0.5 max-w-[140px] mx-auto truncate" title={inv.syncError}>
                            {inv.syncError}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {inv.syncStatus !== "SYNCED" && (
                            <button
                              type="button"
                              onClick={(e) => handleSyncSingle(e, inv.id)}
                              disabled={isItemSyncing || !isOnline}
                              className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              title="Push to Cloud Database Now"
                            >
                              <UploadCloud className="h-3 w-3" />
                              <span>Sync</span>
                            </button>
                          )}

                          <Link
                            href={`/shop/invoices/offline/${inv.id}`}
                            className="h-7 px-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-colors"
                            title="View / Print Document"
                          >
                            <Printer className="h-3 w-3 text-slate-600" />
                            <span className="hidden sm:inline">Print</span>
                          </Link>

                          {inv.syncStatus !== "SYNCED" && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, inv.id, inv.offlineInvoiceNumber)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Discard un-synced test bill"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">No offline invoices in this view</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        All local bills have either been synced to the cloud or no bills match your filter.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
