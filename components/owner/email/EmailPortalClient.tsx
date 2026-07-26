"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  KeyRound, 
  HelpCircle, 
  Loader2,
  FileText,
  Zap,
  Activity,
  Settings,
  ShieldCheck,
  Building,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  Send,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { saveEmailConfigAction, disconnectEmailAction } from "@/actions/email-settings.actions";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { EmailTriggersTab } from "./EmailTriggersTab";
import { EmailActivityTab } from "./EmailActivityTab";
import { EmailSettingsTab } from "./EmailSettingsTab";

interface EmailPortalClientProps {
  organization: any;
  emailConfig: any;
  systemStatus: any;
  templates: any[];
  triggers: any[];
  usageStats: any[];
  shops: any[];
  logs: any[];
}

export function EmailPortalClient({
  organization,
  emailConfig,
  systemStatus,
  templates: initialTemplates,
  triggers: initialTriggers,
  usageStats: initialUsageStats,
  shops,
  logs: initialLogs,
}: EmailPortalClientProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "triggers" | "activity" | "settings">("templates");
  
  // Setup Form State (Strictly empty by default — no pre-filled credentials or hardcoded placeholders)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [senderName, setSenderName] = useState("");

  const isConfigured = emailConfig && emailConfig.status === "ACTIVE" && emailConfig.isVerified;

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailAddress.trim() || !emailAddress.includes("@")) {
      toast.error("Please enter a valid Gmail address.");
      return;
    }

    if (!appPassword.trim() || appPassword.replace(/\s+/g, "").length < 16) {
      toast.error("App Password must be a 16-character string from Google App Passwords.");
      return;
    }

    setIsSubmitting(true);
    toast.loading("Verifying Gmail SMTP connection...", { id: "setup-email" });

    try {
      const formData = new FormData();
      formData.append("emailAddress", emailAddress);
      formData.append("appPassword", appPassword);
      formData.append("senderName", senderName || organization?.name || "Optical Manager");

      const res = await saveEmailConfigAction(formData);

      if (res.success) {
        toast.success("Gmail SMTP setup verified and saved successfully!", { id: "setup-email" });
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to verify SMTP credentials.", { id: "setup-email" });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred during SMTP setup.", { id: "setup-email" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Gmail SMTP account? Automated triggers will be disabled.")) {
      return;
    }

    toast.loading("Disconnecting email service...", { id: "disconnect-email" });
    const res = await disconnectEmailAction();
    if (res.success) {
      toast.success("Email account disconnected.", { id: "disconnect-email" });
      window.location.reload();
    } else {
      toast.error(res.error || "Failed to disconnect email account.", { id: "disconnect-email" });
    }
  };

  // ── STATE A: NOT CONFIGURED SETUP WIZARD (Compact & Professional UI/UX) ──
  if (!isConfigured) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 select-none py-1">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/owner/settings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <span>Back to Settings</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] text-[10px] font-bold border border-blue-100">
            <Lock className="w-3 h-3 text-[#2563eb]" />
            <span>AES-256 Encrypted Setup</span>
          </span>
        </div>

        {/* Compact Banner Header */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Utility Email Communication Setup
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-8">
              Connect your Gmail account to automatically send invoices, payment receipts, appointment confirmations, and welcome notifications to patients across all store locations.
            </p>
          </div>
        </div>

        {/* Two-Column High-Density Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Step-by-Step Instructions */}
          <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#2563eb]" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">How to Get App Password</h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="leading-tight">Open your Google Account settings at <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" className="text-[#2563eb] font-bold hover:underline">myaccount.google.com</a></span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="leading-tight">Go to <strong>Security</strong> tab & ensure <strong>2-Step Verification</strong> is enabled.</span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="leading-tight">Search for <strong>"App passwords"</strong> in the search bar.</span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span className="leading-tight">Create a new password (App name: <em>Optical Manager</em>).</span>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                  <span className="leading-tight">Copy the <strong>16-character code</strong> into the form on the right.</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2 text-[11px] text-amber-900 font-medium leading-relaxed mt-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Use a Google App Password, not your personal Gmail login password.</span>
            </div>
          </div>

          {/* Right Column: Setup Form */}
          <div className="md:col-span-7 bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Configure Gmail Credentials</h3>
              </div>
            </div>

            <form onSubmit={handleSetupSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Gmail Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="e.g. yourstore@gmail.com"
                  required
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] font-medium text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  16-Character App Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="e.g. abcd efgh ijkl mnop"
                  required
                  maxLength={20}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] font-mono text-slate-800 tracking-wider transition-all placeholder:text-slate-400 placeholder:font-sans"
                />
                <p className="text-[10px] text-slate-400 font-medium">Your credentials will be encrypted with AES-256 before storing.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Sender Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={organization?.name || "e.g. Vision Care Optics"}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] font-medium text-slate-800 transition-all placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 font-medium">Patients see: "[Shop Name] via {senderName || organization?.name || 'Optical Manager'}"</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials & Testing Connection...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Test Connection & Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE B: CONFIGURED 4-TAB PORTAL WITH LEFT NAVIGATION ──
  const dailySent = emailConfig?.dailySentCount || 0;
  const dailyLimit = emailConfig?.dailyLimit || 490;
  const usagePercent = Math.min(100, Math.round((dailySent / dailyLimit) * 100));

  let meterColor = "bg-emerald-500";
  if (usagePercent >= 80) meterColor = "bg-amber-500";
  if (usagePercent >= 95) meterColor = "bg-rose-500";

  return (
    <div className="space-y-4 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/90 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/owner/settings" className="text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Email Communication Portal
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5 ml-7">
            Manage templates, automated email trigger rules, send logs, and Gmail SMTP quota for <span className="font-semibold text-slate-700">{organization?.name}</span>.
          </p>
        </div>

        {/* Header Right Connection Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Gmail Connected</span>
            <span className="text-[10px] text-emerald-800 font-mono hidden md:inline">({emailConfig.emailAddress})</span>
          </div>

          <button
            onClick={handleDisconnect}
            title="Disconnect Email"
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all text-slate-500 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN LAYOUT WITH LEFT NAV PANEL & ACTIVE VIEW */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* LEFT NAV PANEL (3 cols) */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs space-y-1">
            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "templates"
                  ? "bg-indigo-50/70 text-indigo-600 border border-indigo-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Templates</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                {initialTemplates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("triggers")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "triggers"
                  ? "bg-indigo-50/70 text-indigo-600 border border-indigo-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Automated Triggers</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                {initialTriggers.filter(t => t.isActive).length} Active
              </span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "activity"
                  ? "bg-indigo-50/70 text-indigo-600 border border-indigo-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Activity & Logs</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">
                {initialLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-50/70 text-indigo-600 border border-indigo-100/50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>SMTP Settings</span>
              </div>
            </button>
          </div>

          {/* Daily Usage Quota Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Gmail Quota</span>
              <span className="text-xs font-extrabold text-slate-800 font-mono">{dailySent} / {dailyLimit}</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${meterColor} transition-all duration-300`} style={{ width: `${usagePercent}%` }} />
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              {usagePercent >= 80 ? (
                <span className="text-amber-600 font-bold">⚠️ Reaching limit ({usagePercent}% used). Critical invoice emails prioritized.</span>
              ) : (
                <span>Soft cap is set to {dailyLimit} emails/day to keep safe buffer under Google's limit.</span>
              )}
            </p>
          </div>
        </div>

        {/* RIGHT ACTIVE VIEW AREA (9 cols) */}
        <div className="md:col-span-9">
          {activeTab === "templates" && (
            <EmailTemplatesTab initialTemplates={initialTemplates} />
          )}
          {activeTab === "triggers" && (
            <EmailTriggersTab initialTriggers={initialTriggers} templates={initialTemplates} />
          )}
          {activeTab === "activity" && (
            <EmailActivityTab initialLogs={initialLogs} usageStats={initialUsageStats} shops={shops} />
          )}
          {activeTab === "settings" && (
            <EmailSettingsTab emailConfig={emailConfig} shops={shops} onDisconnect={handleDisconnect} />
          )}
        </div>
      </div>
    </div>
  );
}
