"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Zap, 
  Megaphone, 
  ArrowRight, 
  MoreHorizontal, 
  Check, 
  Plug,
  AlertCircle
} from "lucide-react";
import { toggleTriggerStatusAction } from "@/actions/promotion.actions";
import { toast } from "sonner";

interface OverviewTabProps {
  data: {
    whatsappStatus: "CONNECTED" | "DISCONNECTED" | "PENDING";
    activeTemplatesCount: number;
    activeTriggersCount: number;
    upcomingCampaignsCount: number;
    telemetry: {
      totalSent: number;
      delivered: number;
      read: number;
      replied: number;
    };
    recentCampaigns: Array<{
      id: string;
      name: string;
      offerDetails: string;
      audience: string;
      scheduledOn: string;
      status: "SCHEDULED" | "COMPLETED" | "DRAFT" | "CANCELLED";
    }>;
    activeTriggers: Array<{
      id: string;
      name: string;
      description: string;
      category: "BIRTHDAY" | "PURCHASE" | "APPOINTMENT" | "RE_ENGAGEMENT";
      nextRun: string;
      status: "ACTIVE" | "PAUSED" | "INACTIVE";
    }>;
  };
  onSwitchTab: (tab: "overview" | "templates" | "triggers" | "campaigns") => void;
  onConnect: () => void;
}

export function OverviewTab({ data, onSwitchTab, onConnect }: OverviewTabProps) {
  const [triggersState, setTriggersState] = useState(data.activeTriggers);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isConnected = data.whatsappStatus === "CONNECTED";

  const handleToggleTrigger = async (id: string, currentStatus: string) => {
    setTogglingId(id);
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setTriggersState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t))
    );

    const res = await toggleTriggerStatusAction(id, currentStatus);
    setTogglingId(null);

    if (res.success) {
      toast.success(`Trigger ${nextStatus === "ACTIVE" ? "activated" : "paused"}`);
    } else {
      setTriggersState((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: currentStatus as any } : t))
      );
      toast.error(res.error || "Failed to toggle trigger");
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "BIRTHDAY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">Birthday</span>;
      case "PURCHASE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Purchase</span>;
      case "APPOINTMENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563eb] border border-blue-100">Appointment</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">Re-engagement</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* DISCONNECTED WARNING BANNER */}
      {!isConnected && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>WhatsApp Account Not Connected</strong> — Connect your Meta Cloud API or Twilio account to start sending automated triggers & broadcasts.
            </span>
          </div>
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Connect Account</span>
          </button>
        </div>
      )}

      {/* 1. RICH COLORED SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: WhatsApp Templates (Purple Theme) */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/20 border border-indigo-100/90 p-4 rounded-2xl shadow-2xs hover:shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <span className="text-2xl font-black text-indigo-950 font-mono">
              {data.activeTemplatesCount}
            </span>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-900">WhatsApp Templates</h3>
            <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
              {data.activeTemplatesCount} ACTIVE TEMPLATES
            </p>
          </div>

          <button
            onClick={() => onSwitchTab("templates")}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors pt-2 border-t border-indigo-100/60"
          >
            <span>Manage Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Automated Triggers (Green Theme) */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 border border-emerald-100/90 p-4 rounded-2xl shadow-2xs hover:shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {data.activeTriggersCount}
            </span>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-900">Automated Triggers</h3>
            <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
              {data.activeTriggersCount} ACTIVE TRIGGERS
            </p>
          </div>

          <button
            onClick={() => onSwitchTab("triggers")}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors pt-2 border-t border-emerald-100/60"
          >
            <span>Manage Triggers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Campaigns (Blue Theme) */}
        <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 border border-blue-100/90 p-4 rounded-2xl shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Megaphone className="w-4.5 h-4.5" />
            </div>
            <span className="text-2xl font-black text-blue-950 font-mono">
              {data.upcomingCampaignsCount}
            </span>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-900">Campaigns</h3>
            <p className="text-[11px] text-[#2563eb] font-bold uppercase tracking-wider mt-0.5">
              {data.upcomingCampaignsCount} UPCOMING CAMPAIGNS
            </p>
          </div>

          <button
            onClick={() => onSwitchTab("campaigns")}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:text-blue-700 transition-colors pt-2 border-t border-blue-100/60"
          >
            <span>Manage Campaigns</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. SPLIT SECTION: COMPACT TELEMETRY + RECENT CAMPAIGNS (Left) + ACTIVE TRIGGERS (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2 COLUMNS: TELEMETRY + RECENT CAMPAIGNS */}
        <div className="lg:col-span-2 space-y-4">
          {/* Telemetry Counter Bar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-center">
            <div className="p-1.5">
              <p className="text-lg font-extrabold text-indigo-600 font-mono">
                {data.telemetry.totalSent.toLocaleString()}
              </p>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Total Sent
              </p>
            </div>

            <div className="p-1.5 pt-3 sm:pt-1.5">
              <p className="text-lg font-extrabold text-emerald-600 font-mono">
                {data.telemetry.delivered.toLocaleString()}
              </p>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Delivered
              </p>
            </div>

            <div className="p-1.5 pt-3 sm:pt-1.5">
              <p className="text-lg font-extrabold text-[#2563eb] font-mono">
                {data.telemetry.read.toLocaleString()}
              </p>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Read
              </p>
            </div>

            <div className="p-1.5 pt-3 sm:pt-1.5">
              <p className="text-lg font-extrabold text-amber-600 font-mono">
                {data.telemetry.replied.toLocaleString()}
              </p>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Replied
              </p>
            </div>
          </div>

          {/* Recent Campaigns Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Campaigns</h3>
                <p className="text-[11px] text-slate-500 font-medium">Mass marketing broadcasts scheduled or completed.</p>
              </div>
              <button
                onClick={() => onSwitchTab("campaigns")}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="px-4 py-2.5">Campaign Name</th>
                    <th className="px-4 py-2.5">Audience</th>
                    <th className="px-4 py-2.5">Scheduled On</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.recentCampaigns.map((camp) => {
                    const isScheduled = camp.status === "SCHEDULED";

                    return (
                      <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-2.5">
                          <p className="font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">
                            {camp.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {camp.offerDetails}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">
                          {camp.audience}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-500">
                          {camp.scheduledOn}
                        </td>
                        <td className="px-4 py-2.5">
                          {isScheduled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
                              Scheduled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
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

        {/* RIGHT 1 COLUMN: ACTIVE TRIGGERS LIST */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Active Triggers</h3>
              <button
                onClick={() => onSwitchTab("triggers")}
                className="text-xs font-bold text-[#2563eb] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {triggersState.map((trig) => {
                const isActive = trig.status === "ACTIVE";

                return (
                  <div 
                    key={trig.id} 
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{trig.name}</h4>
                          {getCategoryBadge(trig.category)}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {trig.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleTrigger(trig.id, trig.status)}
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
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1.5 border-t border-slate-100">
                      <span>NEXT RUN</span>
                      <span className="text-slate-700 font-bold">{trig.nextRun}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
