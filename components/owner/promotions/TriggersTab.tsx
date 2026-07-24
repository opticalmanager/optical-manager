"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  HelpCircle, 
  ExternalLink, 
  Gift,
  ShoppingBag,
  Calendar,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { toggleTriggerStatusAction } from "@/actions/promotion.actions";
import { toast } from "sonner";

interface TriggerItem {
  id: string;
  name: string;
  category: "BIRTHDAY" | "PURCHASE" | "APPOINTMENT" | "RE_ENGAGEMENT";
  whenItRuns: string;
  templateName: string;
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
}

export function TriggersTab() {
  const [triggers, setTriggers] = useState<TriggerItem[]>([
    {
      id: "trig-1",
      name: "Birthday Wishes",
      category: "BIRTHDAY",
      whenItRuns: "On Birthday (At 09:00 AM)",
      templateName: "Birthday Wishes Template",
      status: "ACTIVE",
    },
    {
      id: "trig-2",
      name: "Post Purchase Follow-up",
      category: "PURCHASE",
      whenItRuns: "3 Days After Purchase (At 10:00 AM)",
      templateName: "Thank You Template",
      status: "ACTIVE",
    },
    {
      id: "trig-3",
      name: "Appointment Reminder",
      category: "APPOINTMENT",
      whenItRuns: "1 Day Before Appointment (At 06:00 PM)",
      templateName: "Appointment Reminder Template",
      status: "ACTIVE",
    },
    {
      id: "trig-4",
      name: "Special Offer - Inactive",
      category: "RE_ENGAGEMENT",
      whenItRuns: "15 Days Inactive (At 11:00 AM)",
      templateName: "Special Offer Template",
      status: "PAUSED",
    },
  ]);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setTogglingId(id);
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t))
    );

    const res = await toggleTriggerStatusAction(id, currentStatus);
    setTogglingId(null);

    if (res.success) {
      toast.success(`Trigger ${nextStatus === "ACTIVE" ? "activated" : "paused"}`);
    } else {
      setTriggers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: currentStatus as any } : t))
      );
      toast.error(res.error || "Failed to update trigger state");
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "BIRTHDAY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">BIRTHDAY</span>;
      case "PURCHASE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">PURCHASE</span>;
      case "APPOINTMENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100 uppercase tracking-wider">APPOINTMENT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">RE-ENGAGEMENT</span>;
    }
  };

  const totalTriggers = triggers.length;
  const activeTriggers = triggers.filter((t) => t.status === "ACTIVE").length;
  const pausedTriggers = triggers.filter((t) => t.status === "PAUSED").length;
  const inactiveTriggers = triggers.filter((t) => t.status === "INACTIVE").length;

  return (
    <div className="space-y-4">
      {/* 1. TOP 4 STATUS KPI CARDS (Compact High-Density) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Triggers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Total Triggers</p>
            <p className="text-lg font-extrabold text-slate-900 font-mono">{totalTriggers}</p>
            <p className="text-[9px] font-semibold text-slate-400">All Time</p>
          </div>
        </div>

        {/* Active Triggers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Play className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Active Triggers</p>
            <p className="text-lg font-extrabold text-emerald-700 font-mono">{activeTriggers}</p>
            <p className="text-[9px] font-semibold text-slate-400">Running</p>
          </div>
        </div>

        {/* Paused Triggers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Pause className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Paused Triggers</p>
            <p className="text-lg font-extrabold text-amber-700 font-mono">{pausedTriggers}</p>
            <p className="text-[9px] font-semibold text-slate-400">Paused</p>
          </div>
        </div>

        {/* Inactive Triggers */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <Square className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Inactive Triggers</p>
            <p className="text-lg font-extrabold text-rose-700 font-mono">{inactiveTriggers}</p>
            <p className="text-[9px] font-semibold text-slate-400">Stopped</p>
          </div>
        </div>
      </div>

      {/* 2. SPLIT SECTION: MAIN TRIGGERS TABLE + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT TABLE AREA */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Automated Trigger Rules</h3>
                <p className="text-[11px] text-slate-500 font-medium">Rules that send WhatsApp messages when customer events occur.</p>
              </div>
              <Link
                href="/owner/promotions/triggers/new"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Trigger</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="px-4 py-2.5">Trigger Name</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">When It Runs</th>
                    <th className="px-4 py-2.5">Template</th>
                    <th className="px-4 py-2.5 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {triggers.map((trig) => {
                    const isActive = trig.status === "ACTIVE";

                    return (
                      <tr key={trig.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3 font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">
                          {trig.name}
                        </td>
                        <td className="px-4 py-3">
                          {getCategoryBadge(trig.category)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {trig.whenItRuns}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{trig.templateName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleStatus(trig.id, trig.status)}
                            disabled={togglingId === trig.id}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActive ? "bg-[#2563eb]" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isActive ? "translate-x-3.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR WIDGETS */}
        <div className="space-y-4">
          {/* How Triggers Work Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
              <span>How Triggers Work</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </h3>

            <div className="space-y-3 text-[11px] font-medium relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              <div className="flex items-start gap-2.5 relative z-10">
                <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 text-[#2563eb] font-extrabold flex items-center justify-center text-[9px] shrink-0">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900">Set Condition</p>
                  <p className="text-[10px] text-slate-500">Define trigger events (Birthday, Purchase, etc.).</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 relative z-10">
                <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold flex items-center justify-center text-[9px] shrink-0">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900">Choose Template</p>
                  <p className="text-[10px] text-slate-500">Select pre-approved WhatsApp message.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 relative z-10">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center text-[9px] shrink-0">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-900">Set Audience</p>
                  <p className="text-[10px] text-slate-500">Target patient recipient groups.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 relative z-10">
                <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-extrabold flex items-center justify-center text-[9px] shrink-0">
                  4
                </div>
                <div>
                  <p className="font-bold text-slate-900">Auto Send</p>
                  <p className="text-[10px] text-slate-500">Automated dispatch on schedule.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trigger Categories Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900">Trigger Categories</h3>
              <span className="text-[9px] font-black text-[#2563eb] uppercase">COUNT</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Birthday</span>
                </div>
                <span className="font-bold font-mono text-indigo-600">2</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Purchase</span>
                </div>
                <span className="font-bold font-mono text-emerald-600">2</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>Appointment</span>
                </div>
                <span className="font-bold font-mono text-[#2563eb]">1</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Re-engagement</span>
                </div>
                <span className="font-bold font-mono text-amber-600">2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
