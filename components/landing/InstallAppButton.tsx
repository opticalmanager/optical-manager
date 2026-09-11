"use client";

import React, { useState, useEffect } from "react";
import { Download, Monitor, CheckCircle, X, ArrowRight, ShieldCheck, Zap, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InstallAppButtonProps {
  variant?: "navbar" | "hero" | "footer";
  className?: string;
}

export function InstallAppButton({ variant = "navbar", className = "" }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          toast.success("Optical Manager Desktop App installed to your PC!");
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
        setShowDesktopModal(false);
      } catch (err) {
        console.error("Desktop install prompt error:", err);
        setShowDesktopModal(true);
      }
    } else {
      setShowDesktopModal(true);
    }
  };

  if (variant === "hero") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleInstallClick}
          className={`px-5 py-3 text-base font-semibold border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70 hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-2 shadow-xs ${className}`}
        >
          <Monitor className="w-4 h-4 text-indigo-600" />
          <span>Install Desktop App (PC / Mac)</span>
        </Button>

        {showDesktopModal && (
          <DesktopInstallModal
            onClose={() => setShowDesktopModal(false)}
            onDirectInstall={handleInstallClick}
            hasDirectPrompt={Boolean(deferredPrompt)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-xs ${className}`}
        title="Install Optical Manager as a Standalone Desktop App on Windows PC / Mac"
      >
        <Monitor className="w-3.5 h-3.5 text-indigo-600" />
        <span>Install Desktop App</span>
      </button>

      {showDesktopModal && (
        <DesktopInstallModal
          onClose={() => setShowDesktopModal(false)}
          onDirectInstall={handleInstallClick}
          hasDirectPrompt={Boolean(deferredPrompt)}
        />
      )}
    </>
  );
}

function DesktopInstallModal({
  onClose,
  onDirectInstall,
  hasDirectPrompt,
}: {
  onClose: () => void;
  onDirectInstall: () => void;
  hasDirectPrompt: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0a52c3] to-indigo-700 flex items-center justify-center text-white shadow-md shadow-[#0a52c3]/20">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Optical Manager for Desktop
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                Windows & Mac
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Native desktop experience with offline billing, taskbar shortcuts, and high-density POS checkout.
            </p>
          </div>
        </div>

        {/* Browser Address Bar Illustration (Showing the Chrome / Edge Install icon) */}
        <div className="my-5 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
            <span>Install directly from your browser's top search / URL bar:</span>
            <span className="text-indigo-400 font-bold">Chrome & Edge</span>
          </div>

          {/* Mock Browser URL Bar */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs">
            <span className="text-slate-400">🔒</span>
            <span className="text-slate-300 font-mono text-[11px] flex-1 truncate">
              opticalmanager.in<span className="text-slate-500">/shop/dashboard</span>
            </span>

            {/* Glowing Address Bar Install Icon (Like WhatsApp / YouTube) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 text-white font-bold text-[11px] shadow-sm animate-pulse">
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </div>

            <span className="text-slate-400 ml-1">⋮</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
            💡 Look at the <strong>right-hand side of your browser address bar</strong> at the top of the screen (next to the bookmark star). Click the <strong>Install icon</strong> (computer with down arrow) to add Optical Manager directly to your Windows desktop and taskbar.
          </p>
        </div>

        {/* Desktop Features Matrix */}
        <div className="grid grid-cols-2 gap-3 my-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Offline POS Billing</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Continue creating invoices and searching stock even during shop internet outages.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <Monitor className="w-4 h-4 text-indigo-600" />
              <span>Standalone PC Window</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Runs in its own clean app window without clutter from browser tabs or URL bars.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Windows Taskbar Pin</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pin to taskbar or desktop for 1-click launch like Microsoft Word or Excel.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <Printer className="w-4 h-4 text-blue-600" />
              <span>High-Speed Printing</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Direct connection to thermal receipt and A4 laser printers with zero margins.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onDirectInstall}
            className="w-full sm:flex-1 py-3 px-4 bg-[#0a52c3] hover:bg-[#004bb5] text-white text-xs font-bold rounded-xl shadow-md shadow-[#0a52c3]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install to Windows / Mac Desktop</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
