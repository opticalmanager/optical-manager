"use client";

import React, { useState } from "react";
import { 
  Megaphone, 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminBroadcastModal({ isOpen, onClose }: AdminBroadcastModalProps) {
  const [broadcastType, setBroadcastType] = useState<"INFO" | "WARNING" | "SUCCESS">("INFO");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSaveBroadcast = () => {
    if (!message.trim()) {
      toast.error("Please enter an announcement message.");
      return;
    }

    try {
      const payload = {
        type: broadcastType,
        message: message.trim(),
        isActive,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("om_platform_broadcast", JSON.stringify(payload));
      toast.success("Platform announcement published to all tenant stores!");
      onClose();
    } catch {
      toast.error("Failed to save announcement.");
    }
  };

  const handleClearBroadcast = () => {
    try {
      localStorage.removeItem("om_platform_broadcast");
      setMessage("");
      toast.success("Platform announcement cleared.");
      onClose();
    } catch {
      toast.error("Failed to clear announcement.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Platform Announcement Broadcast
              </h2>
              <p className="text-[11px] text-slate-400">
                Display a priority announcement banner across all store and owner dashboards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Banner Type */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Notice Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBroadcastType("INFO")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  broadcastType === "INFO"
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                    : "bg-[#111827] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Information</span>
              </button>
              <button
                type="button"
                onClick={() => setBroadcastType("WARNING")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  broadcastType === "WARNING"
                    ? "bg-amber-600/20 text-amber-400 border-amber-500/40"
                    : "bg-[#111827] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Maintenance</span>
              </button>
              <button
                type="button"
                onClick={() => setBroadcastType("SUCCESS")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  broadcastType === "SUCCESS"
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                    : "bg-[#111827] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Feature Live</span>
              </button>
            </div>
          </div>

          {/* Announcement Copy */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Broadcast Message
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Scheduled cloud maintenance this Sunday at 2:00 AM IST. Invoices can continue offline."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Quick Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBroadcastType("WARNING");
                  setMessage("⚠️ Scheduled cloud maintenance this Sunday between 2:00 AM - 3:00 AM IST. Offline POS will remain active.");
                }}
                className="text-[10px] font-medium px-2 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg cursor-pointer"
              >
                Server Maintenance
              </button>
              <button
                type="button"
                onClick={() => {
                  setBroadcastType("SUCCESS");
                  setMessage("🚀 New Feature: Bulk Barcode Barbell Printing (TSC & Zebra TSPL2) is now live in Inventory!");
                }}
                className="text-[10px] font-medium px-2 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg cursor-pointer"
              >
                New Feature Release
              </button>
              <button
                type="button"
                onClick={() => {
                  setBroadcastType("INFO");
                  setMessage("📢 New statutory GST Tax Matrix configuration available in Store Settings.");
                }}
                className="text-[10px] font-medium px-2 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg cursor-pointer"
              >
                GST Advisory
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearBroadcast}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 px-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Banner</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveBroadcast}
              className="text-xs h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish Broadcast</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
