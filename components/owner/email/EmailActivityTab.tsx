"use client";

import React, { useState } from "react";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  Store,
  Calendar,
  Clock
} from "lucide-react";

interface LogItem {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: "SENT" | "FAILED" | "RATE_LIMITED" | "QUEUED";
  errorMessage: string | null;
  triggerEvent: string | null;
  shopName: string | null;
  sentAt: string;
}

interface EmailActivityTabProps {
  initialLogs: LogItem[];
  usageStats: Array<{ shopName: string; sent: number; failed: number }>;
  shops: Array<{ id: string; name: string }>;
}

export function EmailActivityTab({ initialLogs, usageStats, shops }: EmailActivityTabProps) {
  const [logs] = useState<LogItem[]>(initialLogs);
  const [selectedShop, setSelectedShop] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (selectedShop !== "ALL" && log.shopName !== selectedShop) return false;
    if (selectedStatus !== "ALL" && log.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = log.recipientEmail.toLowerCase().includes(q);
      const matchSubject = log.subject.toLowerCase().includes(q);
      return matchEmail || matchSubject;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 border border-emerald-200 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Sent</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-50 border border-rose-200 text-rose-700"><XCircle className="w-3 h-3" /> Failed</span>;
      case "RATE_LIMITED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-50 border border-amber-200 text-amber-700"><AlertTriangle className="w-3 h-3" /> Rate Limited</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-slate-50 border border-slate-200 text-slate-700">Queued</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Per-Shop Analytics Summary Banner */}
      {usageStats.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <Store className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Per-Store Sending Breakdown Today</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {usageStats.map((stat, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{stat.shopName}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{stat.failed} failed dispatches</span>
                </div>
                <span className="text-sm font-extrabold text-indigo-600 font-mono">{stat.sent} sent</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipient email or subject..."
            className="w-full text-xs outline-none bg-transparent font-medium text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Shop Filter */}
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="ALL">All Stores</option>
            {shops.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="RATE_LIMITED">Rate Limited</option>
          </select>
        </div>
      </div>

      {/* 3. Activity Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recipient</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Subject</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Store</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No email activity records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{log.recipientName || "Patient"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{log.recipientEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 line-clamp-1">{log.subject}</div>
                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-600 font-medium line-clamp-1">{log.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                      {log.shopName || "System"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
