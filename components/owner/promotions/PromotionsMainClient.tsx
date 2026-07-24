"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Megaphone, 
  Plus, 
  MessageSquare, 
  Zap, 
  ChevronDown, 
  CheckCircle2, 
  Plug, 
  LogOut,
  Settings
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { TriggersTab } from "./TriggersTab";
import { TemplatesTab } from "./TemplatesTab";
import { CampaignsTab } from "./CampaignsTab";
import { ConnectWhatsAppModal } from "./ConnectWhatsAppModal";
import { PromotionOverviewData } from "@/services/promotion.service";
import { disconnectWhatsAppAction } from "@/actions/promotion.actions";
import { toast } from "sonner";

interface PromotionsMainClientProps {
  initialData: PromotionOverviewData;
  initialTab?: string;
}

export function PromotionsMainClient({ initialData, initialTab }: PromotionsMainClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dataState, setDataState] = useState<PromotionOverviewData>(initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "triggers" | "campaigns">(
    (initialTab as any) || "overview"
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const isConnected = dataState.whatsappStatus === "CONNECTED";

  const handleTabChange = (tab: "overview" | "templates" | "triggers" | "campaigns") => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/owner/promotions?${params.toString()}`);
  };

  const handleDisconnect = async () => {
    const res = await disconnectWhatsAppAction();
    if (res.success) {
      toast.success("WhatsApp disconnected");
      setDataState((prev) => ({
        ...prev,
        whatsappStatus: "DISCONNECTED",
        phoneNumber: undefined,
      }));
    } else {
      toast.error(res.error || "Failed to disconnect");
    }
  };

  const handleConnectSuccess = () => {
    setDataState((prev) => ({
      ...prev,
      whatsappStatus: "CONNECTED",
      phoneNumber: "+91 98765 43210",
    }));
    router.refresh();
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "triggers":
        return "Triggers";
      case "templates":
        return "Message Templates";
      case "campaigns":
        return "Broadcast Campaigns";
      default:
        return "Promotion & Automation";
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case "triggers":
        return "Create automated triggers that send WhatsApp messages based on customer events and conditions.";
      case "templates":
        return "Manage pre-approved WhatsApp message templates and variable placeholders.";
      case "campaigns":
        return "Schedule mass promotional offer broadcasts to targeted patient customer groups.";
      default:
        return "Engage your customers with WhatsApp messages, automated triggers and campaigns.";
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* 1. COMPACT HIGH-DENSITY TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/90 pb-3.5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {getPageTitle()}
          </h2>
          <p className="text-xs text-slate-500 font-medium -mt-0.5">
            {getPageSubtitle()}
          </p>
        </div>

        {/* Right Status Badge & Create Launcher */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* DYNAMIC WHATSAPP CONNECTION STATUS BADGE */}
          {isConnected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>WhatsApp Connected</span>
              {dataState.phoneNumber && (
                <span className="text-[10px] text-emerald-800 font-mono font-bold hidden md:inline">
                  ({dataState.phoneNumber})
                </span>
              )}
              <button
                onClick={handleDisconnect}
                title="Disconnect WhatsApp"
                className="ml-1 p-0.5 text-emerald-600 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Plug className="w-4 h-4 text-white" />
              <span>Connect WhatsApp</span>
            </button>
          )}

          {/* Create New Dropdown Launcher */}
          <div className="relative">
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isCreateOpen && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsCreateOpen(false)}
              >
                <Link
                  href="/owner/promotions/triggers/new"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span>Create New Trigger</span>
                </Link>

                <button
                  onClick={() => handleTabChange("campaigns")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-[#2563eb] transition-colors text-left"
                >
                  <Megaphone className="w-4 h-4 text-[#2563eb]" />
                  <span>New Broadcast Campaign</span>
                </button>

                <button
                  onClick={() => handleTabChange("templates")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>New Message Template</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS (High-Density Compact) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => handleTabChange("overview")}
          className={`px-3.5 py-1.5 rounded-t-lg transition-all border-b-2 ${
            activeTab === "overview"
              ? "border-[#2563eb] text-[#2563eb] bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => handleTabChange("templates")}
          className={`px-3.5 py-1.5 rounded-t-lg transition-all border-b-2 ${
            activeTab === "templates"
              ? "border-[#2563eb] text-[#2563eb] bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Templates
        </button>

        <button
          onClick={() => handleTabChange("triggers")}
          className={`px-3.5 py-1.5 rounded-t-lg transition-all border-b-2 ${
            activeTab === "triggers"
              ? "border-[#2563eb] text-[#2563eb] bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Triggers
        </button>

        <button
          onClick={() => handleTabChange("campaigns")}
          className={`px-3.5 py-1.5 rounded-t-lg transition-all border-b-2 ${
            activeTab === "campaigns"
              ? "border-[#2563eb] text-[#2563eb] bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Campaigns
        </button>
      </div>

      {/* 3. ACTIVE TAB VIEW RENDERER */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab 
            data={{ ...dataState, whatsappStatus: dataState.whatsappStatus }} 
            onSwitchTab={handleTabChange} 
            onConnect={() => setIsConnectModalOpen(true)}
          />
        )}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "triggers" && <TriggersTab />}
        {activeTab === "campaigns" && <CampaignsTab />}
      </div>

      {/* CONNECT WHATSAPP MODAL */}
      <ConnectWhatsAppModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
