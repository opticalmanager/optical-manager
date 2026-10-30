"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCw,
  Home,
  LayoutDashboard,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Search,
  Receipt,
  Users,
  Package,
  ShieldCheck,
  AlertTriangle,
  Compass,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
  Database,
  HardDrive,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { offlineDB } from "@/lib/offline/db";

export interface ErrorStateViewProps {
  variant?: "not-found" | "error" | "dashboard-error" | "dashboard-not-found";
  code?: string | number;
  title?: string;
  description?: string;
  error?: (Error & { digest?: string }) | null;
  reset?: () => void;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  showQuickLinks?: boolean;
  showDiagnostics?: boolean;
  showHealthStrip?: boolean;
}

export function ErrorStateView({
  variant = "error",
  code,
  title,
  description,
  error,
  reset,
  primaryAction,
  secondaryAction,
  showQuickLinks = true,
  showDiagnostics = true,
  showHealthStrip = true,
}: ErrorStateViewProps) {
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);

  // Live System Health State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "slow" | "offline">("checking");
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);

  const isNotFound = variant === "not-found" || variant === "dashboard-not-found";
  const isDashboard = variant === "dashboard-error" || variant === "dashboard-not-found";

  // Error Classification
  const errorInfo = useMemo(() => {
    const msg = (error?.message || "").toLowerCase();
    const name = (error?.name || "").toLowerCase();

    const isChunkLoad =
      msg.includes("loading chunk") ||
      msg.includes("failed to fetch dynamically imported module") ||
      name.includes("chunkloaderror");

    const isNetwork =
      !isOnline ||
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("err_internet_disconnected") ||
      msg.includes("load failed");

    const isTimeout =
      msg.includes("timeout") ||
      msg.includes("etimedout") ||
      msg.includes("503") ||
      msg.includes("db_ping_timeout") ||
      msg.includes("connection closed");

    const isAuth =
      msg.includes("401") ||
      msg.includes("unauthorized") ||
      msg.includes("jwt") ||
      msg.includes("session expired") ||
      msg.includes("deactivated");

    return { isChunkLoad, isNetwork, isTimeout, isAuth };
  }, [error, isOnline]);

  // Handle Auto Retry for Transient Database Timeouts
  useEffect(() => {
    if (errorInfo.isTimeout && reset && autoRetryCountdown === null) {
      setAutoRetryCountdown(5);
    }
  }, [errorInfo.isTimeout, reset, autoRetryCountdown]);

  useEffect(() => {
    if (autoRetryCountdown === null || autoRetryCountdown <= 0) return;

    const timer = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (reset) reset();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetryCountdown, reset]);

  // Live System Health Probe
  const checkHealth = useCallback(async () => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    // Read local IndexedDB pending queue
    try {
      const pendingQueue = await offlineDB.offline_invoices_queue
        .where("syncStatus")
        .equals("PENDING")
        .count();
      setPendingDraftsCount(pendingQueue);
    } catch {
      // Local IndexedDB fallback
    }

    // Ping cloud database with latency measurement
    const startTime = performance.now();
    try {
      const res = await fetch("/api/offline/ping?db=1", {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const elapsed = Math.round(performance.now() - startTime);
      setDbLatency(elapsed);

      if (res.ok) {
        setDbStatus(elapsed > 1800 ? "slow" : "online");
      } else {
        setDbStatus("offline");
      }
    } catch {
      setDbStatus("offline");
      setDbLatency(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname + window.location.search);
      setCurrentTime(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));

      checkHealth();

      const handleOnline = () => {
        setIsOnline(true);
        checkHealth();
      };
      const handleOffline = () => {
        setIsOnline(false);
        setDbStatus("offline");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [checkHealth]);

  // Dynamic titles & descriptions
  const displayCode = code ?? (isNotFound ? 404 : 500);
  const displayTitle =
    title ??
    (isNotFound
      ? isDashboard
        ? "Optical Record Not Found"
        : "Focal Point Lost (404)"
      : errorInfo.isChunkLoad
      ? "Application Update Available"
      : errorInfo.isNetwork
      ? "Network Signal Interrupted"
      : errorInfo.isTimeout
      ? "Optical Cloud Reconnecting"
      : isDashboard
      ? "Optical Workspace Hiccup"
      : "Optical Aberration Detected");

  const displayDescription =
    description ??
    (isNotFound
      ? isDashboard
        ? "The invoice, patient profile, inward purchase, or inventory item you requested could not be located in this organization database."
        : "The optical route or resource you are seeking has been shifted or is out of focal alignment. Verify the URL or return to your optical workspace."
      : errorInfo.isChunkLoad
      ? "A newer, updated version of Optical Manager has been published. Refresh your browser to load the latest high-performance bundles."
      : errorInfo.isNetwork
      ? "Your device temporarily lost external internet reachability. You can continue billing customers smoothly using local Offline POS mode."
      : errorInfo.isTimeout
      ? "The optical database pooler is warming up or reconnecting. Your stored session and draft bills are 100% preserved."
      : isDashboard
      ? "An unexpected issue interrupted this operation. Your offline local database, patient profiles, and stored drafts remain 100% safe."
      : "Our optical rendering engine encountered an unexpected runtime exception. We have captured the diagnostic signature for immediate resolution.");

  const handleRetry = async () => {
    setIsRetrying(true);
    setAutoRetryCountdown(null);
    try {
      if (reset) {
        reset();
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  const handleUpdateAndClearCache = async () => {
    setIsRetrying(true);
    try {
      if (typeof window !== "undefined") {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        window.location.reload();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const getDiagnosticJSON = () => {
    return JSON.stringify(
      {
        timestamp: currentTime || new Date().toISOString(),
        url: currentPath,
        code: displayCode,
        errorName: error?.name || "AppException",
        errorMessage: error?.message || "Unknown error encountered",
        errorDigest: error?.digest || "N/A",
        systemHealth: {
          online: isOnline,
          dbStatus,
          dbLatencyMs: dbLatency,
          pendingDraftsCount,
        },
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
        screenResolution:
          typeof window !== "undefined"
            ? `${window.innerWidth}x${window.innerHeight}`
            : "N/A",
      },
      null,
      2
    );
  };

  const handleCopyDiagnostics = async () => {
    try {
      const text = getDiagnosticJSON();
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Diagnostic report copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Could not copy diagnostics automatically.");
    }
  };

  const handleDownloadDiagnosticFile = () => {
    try {
      const jsonStr = getDiagnosticJSON();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `optical-manager-diagnostic-${error?.digest || "error"}-${Date.now()}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Diagnostic log file downloaded.");
    } catch {
      toast.error("Could not download diagnostic file.");
    }
  };

  const getWhatsAppSupportLink = () => {
    const healthSummary = `Net: ${isOnline ? "Online" : "Offline"} | DB: ${dbStatus} (${dbLatency ? dbLatency + "ms" : "N/A"})`;
    const message = `*Optical Manager Error Report*\n*Code:* ${displayCode}\n*Route:* ${currentPath}\n*Digest:* ${error?.digest || "N/A"}\n*Issue:* ${error?.message || displayTitle}\n*Health:* ${healthSummary}\n*Timestamp:* ${currentTime}`;
    return `https://wa.me/918178962366?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-3 sm:p-5 w-full select-none">
      {/* Background Precision Industrial Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-45 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]"
      />

      {/* Main High-Density Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-5 sm:p-7 text-center overflow-hidden"
      >
        {/* Animated Lens / Optical Reticle Header */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
            {/* Ambient Radial Glow */}
            <div
              className={`absolute inset-0 rounded-full blur-xl opacity-25 ${
                isNotFound
                  ? "bg-blue-500"
                  : errorInfo.isNetwork
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />

            {/* SVG Optical Reticle & Scanning Crosshairs */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Calibration Ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke={isNotFound ? "#3b82f6" : "#f43f5e"}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="opacity-40"
              />

              {/* Smoothly Rotating Phoropter Astigmatic Axis Ring */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                style={{ originX: "50px", originY: "50px" }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke={isNotFound ? "#2563eb" : "#e11d48"}
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                  className="opacity-60"
                />
                {/* 4 Cardinal Optical Marker Ticks (0, 90, 180, 270) */}
                <line x1="50" y1="8" x2="50" y2="14" stroke={isNotFound ? "#2563eb" : "#e11d48"} strokeWidth="1.5" />
                <line x1="50" y1="86" x2="50" y2="92" stroke={isNotFound ? "#2563eb" : "#e11d48"} strokeWidth="1.5" />
                <line x1="8" y1="50" x2="14" y2="50" stroke={isNotFound ? "#2563eb" : "#e11d48"} strokeWidth="1.5" />
                <line x1="86" y1="50" x2="92" y2="50" stroke={isNotFound ? "#2563eb" : "#e11d48"} strokeWidth="1.5" />
              </motion.g>

              {/* Dynamic Scanning Radar Sweep Beam */}
              <motion.g
                animate={{ rotate: isNotFound ? 360 : [0, 90, 0] }}
                transition={{
                  duration: isNotFound ? 4 : 3,
                  repeat: Infinity,
                  ease: isNotFound ? "linear" : "easeInOut",
                }}
                style={{ originX: "50px", originY: "50px" }}
              >
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="14"
                  stroke={isNotFound ? "#60a5fa" : "#fb7185"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="14"
                  r="2.5"
                  fill={isNotFound ? "#2563eb" : "#e11d48"}
                />
              </motion.g>

              {/* Center Focal Aperture */}
              <circle
                cx="50"
                cy="50"
                r="18"
                fill={isNotFound ? "#eff6ff" : "#fff1f2"}
                stroke={isNotFound ? "#93c5fd" : "#fca5a5"}
                strokeWidth="1.5"
              />
            </svg>

            {/* Central Icon */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              {isNotFound ? (
                <Compass className="w-8 h-8 text-[#2563eb]" />
              ) : errorInfo.isNetwork ? (
                <WifiOff className="w-8 h-8 text-amber-600" />
              ) : errorInfo.isChunkLoad ? (
                <Zap className="w-8 h-8 text-[#2563eb]" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              )}
            </motion.div>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2 border shadow-2xs font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              isNotFound
                ? "bg-blue-600"
                : errorInfo.isNetwork
                ? "bg-amber-600"
                : "bg-rose-600"
            }`}
          />
          <span
            className={
              isNotFound
                ? "bg-blue-50 text-[#2563eb] border-blue-200/60"
                : errorInfo.isNetwork
                ? "bg-amber-50 text-amber-700 border-amber-200/60"
                : "bg-rose-50 text-rose-600 border-rose-200/60"
            }
          >
            {isNotFound
              ? `STATUS ${displayCode} • FOCAL POINT LOST`
              : errorInfo.isChunkLoad
              ? "CLIENT ASSET RE-SYNC • 500"
              : errorInfo.isNetwork
              ? "OFFLINE FALLBACK ACTIVE"
              : `STATUS ${displayCode} • EXCEPTION TRIGGERED`}
          </span>
        </div>

        {/* Crisp Page Title & Subtitle */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
          {displayTitle}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
          {displayDescription}
        </p>

        {/* Auto-Retry Countdown Notice */}
        {autoRetryCountdown !== null && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-semibold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-recalibrating in {autoRetryCountdown}s...</span>
            <button
              onClick={() => setAutoRetryCountdown(null)}
              className="ml-1 text-[10px] underline hover:text-blue-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Dashboard Local Data Safety Reassurance */}
        {isDashboard && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="font-semibold text-emerald-900">Data Protected:</strong> Local Dexie.js offline databank & draft bills are securely preserved.
              {pendingDraftsCount > 0 && ` (${pendingDraftsCount} bills awaiting sync)`}
            </span>
          </div>
        )}

        {/* Live System Health Diagnostic Strip */}
        {showHealthStrip && (
          <div className="mt-3.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600">
            {/* Internet Status */}
            <div className="flex items-center justify-center gap-1.5 truncate">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              <span className="truncate">{isOnline ? "Network: Online" : "Network: Offline"}</span>
            </div>

            {/* Cloud Database Status */}
            <div className="flex items-center justify-center gap-1.5 truncate border-x border-slate-200/80 px-1">
              <Database
                className={`w-3.5 h-3.5 shrink-0 ${
                  dbStatus === "online"
                    ? "text-emerald-500"
                    : dbStatus === "slow"
                    ? "text-amber-500"
                    : dbStatus === "checking"
                    ? "text-blue-500 animate-spin"
                    : "text-rose-500"
                }`}
              />
              <span className="truncate">
                {dbStatus === "online"
                  ? `DB: Ready (${dbLatency}ms)`
                  : dbStatus === "slow"
                  ? `DB: Latency (${dbLatency}ms)`
                  : dbStatus === "checking"
                  ? "DB: Testing..."
                  : "DB: Offline"}
              </span>
            </div>

            {/* Offline Databank Status */}
            <div className="flex items-center justify-center gap-1.5 truncate">
              <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Local Storage: Safe</span>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {errorInfo.isChunkLoad ? (
            <Button
              onClick={handleUpdateAndClearCache}
              disabled={isRetrying}
              size="sm"
              className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>Update & Clear Cache</span>
            </Button>
          ) : errorInfo.isNetwork ? (
            <Link href="/shop/invoices/new" className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Switch to Offline Billing</span>
              </Button>
            </Link>
          ) : primaryAction ? (
            primaryAction.href ? (
              <Link href={primaryAction.href} className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                onClick={primaryAction.onClick}
                size="sm"
                className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {primaryAction.label}
              </Button>
            )
          ) : reset ? (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "Calibrating..." : "Try Again / Reconnect"}</span>
            </Button>
          ) : (
            <Link href={isDashboard ? "/shop/dashboard" : "/"} className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto h-9 px-4 font-bold text-xs bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>
          )}

          {secondaryAction ? (
            secondaryAction.href ? (
              <Link href={secondaryAction.href} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-9 px-3.5 font-bold text-xs border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9 px-3.5 font-bold text-xs border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                {secondaryAction.label}
              </Button>
            )
          ) : (
            <Button
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(isDashboard ? "/shop/dashboard" : "/");
                }
              }}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-9 px-3.5 font-bold text-xs border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </Button>
          )}

          {/* Quick Refresh Shortcut */}
          <Button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto h-9 px-2.5 font-bold text-xs text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer flex items-center justify-center gap-1"
            title="Perform hard browser reload"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload</span>
          </Button>
        </div>

        {/* Quick Optical Shortcuts */}
        {showQuickLinks && (
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Optical Workspace Shortcuts
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Link
                href="/shop/invoices/new"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#2563eb] text-slate-600 text-[11px] font-semibold transition-colors"
              >
                <Receipt className="w-3 h-3" />
                <span>New Bill</span>
              </Link>
              <Link
                href="/shop/customers"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#2563eb] text-slate-600 text-[11px] font-semibold transition-colors"
              >
                <Users className="w-3 h-3" />
                <span>Patients</span>
              </Link>
              <Link
                href="/shop/inventory"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#2563eb] text-slate-600 text-[11px] font-semibold transition-colors"
              >
                <Package className="w-3 h-3" />
                <span>Inventory</span>
              </Link>
              <Link
                href="/shop/dashboard"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#2563eb] text-slate-600 text-[11px] font-semibold transition-colors"
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        )}

        {/* Technical Diagnostics Accordion */}
        {showDiagnostics && (
          <div className="mt-3.5 pt-3 text-left">
            <button
              type="button"
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Technical Diagnostics & Support</span>
              </span>
              {showTechDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <AnimatePresence>
              {showTechDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 overflow-hidden"
                >
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-[10px] font-mono text-slate-600 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase">Digest ID:</span>
                      <span className="font-bold text-slate-800">{error?.digest || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase">Route:</span>
                      <span className="truncate max-w-[200px] text-slate-800" title={currentPath}>
                        {currentPath || "N/A"}
                      </span>
                    </div>
                    {error?.message && (
                      <div className="pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 font-bold uppercase block mb-0.5">Details:</span>
                        <p className="text-rose-700 bg-rose-50/60 p-1.5 rounded-md break-all">
                          {error.message}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={handleCopyDiagnostics}
                          className="text-[10px] h-7 font-bold text-slate-600 gap-1 border-slate-200 bg-white hover:bg-slate-50"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? "Copied" : "Copy Log"}</span>
                        </Button>

                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={handleDownloadDiagnosticFile}
                          className="text-[10px] h-7 font-bold text-slate-600 gap-1 border-slate-200 bg-white hover:bg-slate-50"
                          title="Download diagnostic JSON report"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .json</span>
                        </Button>
                      </div>

                      <a
                        href={getWhatsAppSupportLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] h-7 px-2.5 rounded-md font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp Support</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
