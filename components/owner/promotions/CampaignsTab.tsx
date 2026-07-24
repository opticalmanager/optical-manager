"use client";

import React, { useState } from "react";
import { Megaphone, Plus, CheckCircle2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface CampaignItem {
  id: string;
  name: string;
  offerDetails: string;
  audience: string;
  audienceCount: number;
  scheduledOn: string;
  status: "SCHEDULED" | "COMPLETED" | "DRAFT" | "CANCELLED";
  totalSent: number;
  delivered: number;
  read: number;
  replied: number;
}

export function CampaignsTab() {
  const [campaigns] = useState<CampaignItem[]>([
    {
      id: "camp-1",
      name: "Summer Sale Offer 🕶️",
      offerDetails: "Flat 20% off on Sunglasses",
      audience: "Sunglasses Buyers & High Spenders",
      audienceCount: 1250,
      scheduledOn: "20 Jul 2025 • 10:00 AM",
      status: "SCHEDULED",
      totalSent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
    },
    {
      id: "camp-2",
      name: "New Arrivals Alert 👓",
      offerDetails: "Check out our new titanium frame collection",
      audience: "Active Frame Buyers",
      audienceCount: 858,
      scheduledOn: "18 Jul 2025 • 11:30 AM",
      status: "SCHEDULED",
      totalSent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
    },
    {
      id: "camp-3",
      name: "Weekend Special Offer 🏷️",
      offerDetails: "Buy 1 Get 1 on Prescription Frames",
      audience: "All Registered Patients",
      audienceCount: 1102,
      scheduledOn: "15 Jul 2025 • 11:30 AM",
      status: "COMPLETED",
      totalSent: 1102,
      delivered: 1045,
      read: 980,
      replied: 215,
    },
    {
      id: "camp-4",
      name: "Eye Care Tips Campaign 👁️",
      offerDetails: "Monthly eye care tips & lens cleaning guide",
      audience: "All Active Store Clients",
      audienceCount: 2341,
      scheduledOn: "12 Jul 2025 • 09:30 AM",
      status: "COMPLETED",
      totalSent: 2341,
      delivered: 2210,
      read: 2015,
      replied: 430,
    },
  ]);

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Broadcast Campaigns</h3>
          <p className="text-xs text-slate-500 font-medium">Scheduled and completed mass promotional messages.</p>
        </div>
        <button
          onClick={() => toast.info("New Broadcast Campaign creation coming soon!")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Listing Cards */}
      <div className="space-y-3">
        {campaigns.map((camp) => {
          const isScheduled = camp.status === "SCHEDULED";

          return (
            <div key={camp.id} className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    isScheduled ? "bg-blue-50 text-[#2563eb]" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{camp.name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">{camp.offerDetails}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {isScheduled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
                      Scheduled for {camp.scheduledOn}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Completed on {camp.scheduledOn}
                    </span>
                  )}

                  <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Target Audience & Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Audience</p>
                  <p className="font-extrabold text-slate-800 mt-0.5 truncate">{camp.audience}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{camp.audienceCount.toLocaleString()} Recipient Patients</p>
                </div>

                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Delivered</p>
                  <p className="font-extrabold text-emerald-600 font-mono mt-0.5">{camp.delivered.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{camp.totalSent > 0 ? `${Math.round((camp.delivered / camp.totalSent) * 100)}% Rate` : "Pending"}</p>
                </div>

                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Read</p>
                  <p className="font-extrabold text-[#2563eb] font-mono mt-0.5">{camp.read.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{camp.delivered > 0 ? `${Math.round((camp.read / camp.delivered) * 100)}% Read` : "Pending"}</p>
                </div>

                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Replies</p>
                  <p className="font-extrabold text-amber-600 font-mono mt-0.5">{camp.replied.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{camp.read > 0 ? `${Math.round((camp.replied / camp.read) * 100)}% Conversion` : "Pending"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
