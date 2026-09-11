"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Check, UploadCloud, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useOffline } from "@/components/providers/OfflineProvider";

interface SyncStatusControlsProps {
  className?: string;
}

export function SyncStatusControls({ className = "" }: SyncStatusControlsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    isInstallable,
    installPwa,
    syncNow,
    warmCacheNow,
  } = useOffline();

  // Stable SSR initial render matching client first pass
  const effectiveOnline = mounted ? isOnline : true;
  const effectiveSyncing = mounted ? isSyncing : false;
  const effectivePendingCount = mounted ? pendingCount : 0;
  const effectiveInstallable = mounted ? isInstallable : false;
  const effectiveLastSyncTime = mounted ? lastSyncTime : null;

  const handleManualSync = async () => {
    if (!effectiveOnline) {
      toast.info("You are offline. Reconnect to internet to synchronize latest data.");
      return;
    }
    toast.loading("Synchronizing local data...", { id: "manual-sync-toast" });
    try {
      await warmCacheNow();
      if (pendingCount > 0) {
        await syncNow();
      }
      toast.success("Local databank fully synchronized!", { id: "manual-sync-toast" });
    } catch {
      toast.error("Sync could not complete. Check network.", { id: "manual-sync-toast" });
    }
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} suppressHydrationWarning>
      {/* 1. Online / Offline Indicator Button */}
      {effectiveOnline ? (
        <button
          type="button"
          onClick={() => {
            toast.success("System is online and connected to cloud services.", {
              description: lastSyncTime
                ? `Last synchronized: ${lastSyncTime.toLocaleTimeString()}`
                : "Cloud databank active",
            });
          }}
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors hover:bg-emerald-100/70 cursor-pointer shrink-0"
          title="Internet connection active"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Online</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            toast.info("Offline mode active. You can continue creating bills using cached data.", {
              description: pendingCount > 0 ? `${pendingCount} offline invoice(s) pending sync` : "No pending bills",
            });
          }}
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors hover:bg-amber-100/70 cursor-pointer shrink-0"
          title="Offline mode active"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>Offline</span>
        </button>
      )}

      {/* 2. Syncing... in Green / Synced in Green Indicator Button */}
      {effectiveSyncing ? (
        <div
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
          title="Synchronizing local databank with cloud..."
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
          <span>Syncing...</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleManualSync}
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          title={
            effectiveLastSyncTime
              ? `Synced at ${effectiveLastSyncTime.toLocaleTimeString()}. Click to refresh local cache.`
              : "Data synchronized. Click to re-sync."
          }
        >
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
          <span>Synced</span>
        </button>
      )}

      {/* 3. Pending Offline Invoices Badge (if any pending) */}
      {effectivePendingCount > 0 && (
        <button
          type="button"
          onClick={() => syncNow()}
          disabled={effectiveSyncing || !effectiveOnline}
          className="h-9 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0a52c3] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title="Push pending offline invoices to cloud now"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#0a52c3] shrink-0" />
          <span>{effectivePendingCount} Pending</span>
        </button>
      )}

      {/* 4. Desktop PWA App Install Button */}
      {effectiveInstallable && (
        <button
          type="button"
          onClick={() => installPwa()}
          className="h-9 px-3 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
          title="Install Optical Manager as a Native Desktop App on Windows / Mac"
        >
          <Monitor className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden xl:inline">Install Desktop App</span>
        </button>
      )}
    </div>
  );
}
