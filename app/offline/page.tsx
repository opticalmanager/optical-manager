"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  WifiOff, 
  RotateCw, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { offlineDB } from "@/lib/offline/db";

export default function OfflineFallbackPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [cachedDataStats, setCachedDataStats] = useState({
    customersCount: 0,
    inventoryCount: 0,
    pendingInvoicesCount: 0,
  });
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Read cached databank stats from local IndexedDB
    async function loadStats() {
      try {
        const custCount = await offlineDB.cached_customers.count();
        const invCount = await offlineDB.cached_inventory.count();
        const invQueueCount = await offlineDB.offline_invoices_queue.where("syncStatus").equals("PENDING").count();
        setCachedDataStats({
          customersCount: custCount,
          inventoryCount: invCount,
          pendingInvoicesCount: invQueueCount,
        });
      } catch (err) {
        console.warn("[OfflinePage] Error reading indexedDB stats:", err);
      }
    }

    loadStats();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsReloading(true);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans text-slate-800">
      <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex p-3.5 bg-white/15 backdrop-blur-md rounded-2xl mb-3 shadow-inner border border-white/20">
            <WifiOff className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Offline Mode Active
          </h1>
          <p className="text-xs sm:text-sm text-white/90 font-medium mt-1 max-w-md mx-auto">
            You are currently working without an active internet connection. All locally cached records and offline POS tools remain fully operational.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Status Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-0.5 shrink-0 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900 leading-tight">
                Local Device Databank is Ready
              </p>
              <p className="text-amber-700/90 leading-relaxed text-[11px]">
                You can continue billing walk-in customers and searching cached patients. Invoices created offline will automatically synchronize to cloud servers once internet connectivity is restored.
              </p>
            </div>
          </div>

          {/* Local Databank Counters */}
          <div className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Cached Local Records in Browser
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                <div className="flex items-center justify-center text-indigo-600 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-base font-extrabold text-slate-800">
                  {cachedDataStats.customersCount}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                  Patients
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-base font-extrabold text-slate-800">
                  {cachedDataStats.inventoryCount}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                  Products
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                <div className="flex items-center justify-center text-emerald-600 mb-1">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-base font-extrabold text-slate-800">
                  {cachedDataStats.pendingInvoicesCount}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                  Pending Sync
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Action Grid */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Available Offline Actions
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/shop/invoices/new"
                className="p-3.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80 rounded-xl flex items-center justify-between text-indigo-900 group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold">New Offline Invoice</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/shop/dashboard"
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800 group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold">Shop Dashboard</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/shop/customers"
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800 group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold">Patient Directory</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/shop/inventory"
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800 group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold">Cached Inventory</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Reconnect Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isReloading}
              className="w-full bg-[#0a52c3] hover:bg-[#08429e] text-white py-3.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isReloading ? "animate-spin" : ""}`} />
              {isReloading ? "Checking Connection..." : "Retry Connection"}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Optical Manager Operating System</span>
          </div>
          <div className="font-mono">
            {isOnline ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="text-amber-600 font-bold">● Offline</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
