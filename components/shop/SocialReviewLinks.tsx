"use client";

import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import type { SocialReviewLinksSettings } from "@/types";

export function GoogleColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function InstagramColorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="ig-grad-shared" r="150%" cx="30%" cy="107%">
          <stop stopColor="#fdf497" offset="0%" />
          <stop stopColor="#fdf497" offset="5%" />
          <stop stopColor="#fd5949" offset="45%" />
          <stop stopColor="#d6249f" offset="60%" />
          <stop stopColor="#285AEB" offset="90%" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad-shared)" />
      <path
        d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2A3.2 3.2 0 1112 8.8a3.2 3.2 0 010 6.4zm5.2-8.4a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function normalizeInstagramUrl(rawUrl?: string): { url: string; handle: string } {
  if (!rawUrl || !rawUrl.trim()) return { url: "", handle: "" };
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const pathPart = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
      const handle = pathPart ? `@${pathPart}` : "@instagram";
      return { url: trimmed, handle };
    } catch {
      return { url: trimmed, handle: "@instagram" };
    }
  }
  const cleanHandle = trimmed.replace(/^@/, "");
  return {
    url: `https://instagram.com/${cleanHandle}`,
    handle: `@${cleanHandle}`,
  };
}

interface SocialReviewPillsProps {
  settings?: SocialReviewLinksSettings | null;
  mode?: "INVOICE" | "RECEIPT";
  storeName?: string;
  className?: string;
  forcePreview?: boolean;
}

export function SocialReviewPills({
  settings,
  mode = "INVOICE",
  storeName,
  className = "",
  forcePreview = false,
}: SocialReviewPillsProps) {
  if (!settings && !forcePreview) return null;

  const isReceiptMode = mode === "RECEIPT";
  const google = settings?.googleReview;
  const instagram = settings?.instagram;

  // Resilient enablement: if enabled is not explicitly false and url is present, treat as enabled
  const isGoogleConfigured = Boolean(google?.url?.trim());
  const isGoogleActive = google?.enabled === true || (google?.enabled === undefined && isGoogleConfigured);

  const isInstagramConfigured = Boolean(instagram?.url?.trim());
  const isInstagramActive = instagram?.enabled === true || (instagram?.enabled === undefined && isInstagramConfigured);

  const showGoogle = forcePreview
    ? isGoogleConfigured
    : Boolean(
        isGoogleActive &&
        isGoogleConfigured &&
        (isReceiptMode ? google?.showOnReceipts !== false : google?.showOnInvoices !== false)
      );

  const showInstagram = forcePreview
    ? isInstagramConfigured
    : Boolean(
        isInstagramActive &&
        isInstagramConfigured &&
        (isReceiptMode ? instagram?.showOnReceipts !== false : instagram?.showOnInvoices !== false)
      );

  if (!showGoogle && !showInstagram) return null;

  const igInfo = normalizeInstagramUrl(instagram?.url || "yourstore");

  return (
    <div className={`w-full max-w-4xl print:hidden px-2 sm:px-0 ${className}`}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-all duration-200">
        {/* Engagement Invitation */}
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-blue-500/10 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Loved your eyewear experience with</span>
            <span className="text-xs font-black text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70">
              {storeName || "us"}
            </span>
            <span className="text-xs font-semibold text-slate-600">?</span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-2.5 w-full md:w-auto">
          {showGoogle && (
            <a
              href={google?.url || "#"}
              target={forcePreview ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={forcePreview ? (e) => e.preventDefault() : undefined}
              className="group flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-white hover:bg-slate-50/90 text-slate-900 border border-slate-200/90 hover:border-blue-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.12)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              title="Rate us on Google (Opens in new tab)"
            >
              <div className="flex items-center gap-2">
                <GoogleColorIcon className="h-4.5 w-4.5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-black text-slate-900 tracking-tight">Rate on Google</span>
              </div>
              <div className="flex items-center gap-1.5 ml-1">
                <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200/80 shadow-2xs">
                  <span className="text-amber-500 text-xs">★</span>
                  <span>5.0</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </a>
          )}

          {showInstagram && (
            <a
              href={igInfo.url}
              target={forcePreview ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={forcePreview ? (e) => e.preventDefault() : undefined}
              className="group flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-purple-50/90 via-pink-50/90 to-amber-50/80 hover:from-purple-100/80 hover:via-pink-100/80 hover:to-amber-100/70 text-slate-900 border border-pink-200/90 hover:border-pink-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(225,48,108,0.15)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              title="Follow our latest collections on Instagram (Opens in new tab)"
            >
              <div className="flex items-center gap-2">
                <InstagramColorIcon className="h-4.5 w-4.5 shrink-0 rounded-md group-hover:scale-110 transition-transform duration-200 shadow-2xs" />
                <span className="text-xs font-black text-slate-900 tracking-tight">Follow on Instagram</span>
              </div>
              <div className="flex items-center gap-1.5 ml-1">
                {igInfo.handle && (
                  <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/95 text-[#d6249f] text-[11px] font-black border border-pink-200 shadow-2xs">
                    <span>{igInfo.handle}</span>
                  </div>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-pink-500/80 group-hover:text-pink-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
