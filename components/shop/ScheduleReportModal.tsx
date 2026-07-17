"use client";

import React, { useState } from "react";
import { Mail, Clock, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateShopSettingsConfigAction } from "@/actions/shop-settings.actions";

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  initialConfig?: { type: "daily" | "weekly" | "off"; email?: string };
}

export default function ScheduleReportModal({
  isOpen,
  onClose,
  shopId,
  initialConfig,
}: ScheduleReportModalProps) {
  const [scheduleType, setScheduleType] = useState<"daily" | "weekly" | "off">(
    initialConfig?.type || "daily"
  );
  const [email, setEmail] = useState(initialConfig?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateShopSettingsConfigAction(shopId, {
      autoReportSchedule: {
        type: scheduleType,
        email: email.trim(),
      },
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ success: true, text: "Automated EOD email report schedule saved!" });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ success: false, text: res.message || "Failed to update schedule." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl border border-blue-100">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Automated Email Reports</h3>
              <p className="text-xs text-slate-400 font-semibold">
                Receive End-of-Day store performance ledgers automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              statusMessage.success
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {statusMessage.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Frequency Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Report Delivery Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "daily", label: "Daily EOD" },
                { id: "weekly", label: "Weekly Summary" },
                { id: "off", label: "Disabled" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleType(opt.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    scheduleType === opt.id
                      ? "bg-blue-50 border-[#2563eb] text-[#2563eb] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Address */}
          {scheduleType !== "off" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Recipient Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="manager@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">
                Daily reports are sent automatically at 09:00 PM local store time.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 px-4 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/20"
            >
              {isSaving ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
