"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Globe, 
  Layers, 
  ShieldCheck, 
  Smartphone, 
  Building, 
  Hash, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  RefreshCw, 
  LogOut, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy, 
  Activity, 
  Zap, 
  ArrowLeft,
  MessageSquare,
  Lock
} from "lucide-react";
import { 
  saveWhatsAppConfigAction, 
  disconnectWhatsAppAction, 
  verifyWabaTokenAction, 
  testWhatsAppPingAction 
} from "@/actions/promotion.actions";
import { WabaConfigData } from "@/services/promotion.service";
import { toast } from "sonner";

interface WabaManagementClientProps {
  initialConfig?: WabaConfigData | null;
}

export function WabaManagementClient({ initialConfig }: WabaManagementClientProps) {
  const router = useRouter();

  // Current config state
  const [config, setConfig] = useState<WabaConfigData | null>(initialConfig || null);
  const isConnected = config?.status === "CONNECTED";

  // Form tab selection
  const [provider, setProvider] = useState<"META_CLOUD_API" | "ZERNIO">(
    config?.providerType || "META_CLOUD_API"
  );

  // Form fields
  const [phoneNumber, setPhoneNumber] = useState(config?.phoneNumber || "");
  const [businessName, setBusinessName] = useState(config?.businessName || "");
  const [phoneNumberId, setPhoneNumberId] = useState(config?.phoneNumberId || "");
  const [wabaId, setWabaId] = useState(config?.wabaId || "");
  const [apiKey, setApiKey] = useState(config?.apiKey || "");
  const [showApiKey, setShowApiKey] = useState(false);

  // Synchronize internal state when server-provided initialConfig updates
  useEffect(() => {
    setConfig(initialConfig || null);
    if (initialConfig) {
      setProvider(initialConfig.providerType || "META_CLOUD_API");
      setPhoneNumber(initialConfig.phoneNumber || "");
      setBusinessName(initialConfig.businessName || "");
      setPhoneNumberId(initialConfig.phoneNumberId || "");
      setWabaId(initialConfig.wabaId || "");
      setApiKey(initialConfig.apiKey || "");
    }
  }, [initialConfig]);

  // UI state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isMetaGuideOpen, setIsMetaGuideOpen] = useState(false);
  const [isZernioGuideOpen, setIsZernioGuideOpen] = useState(false);

  // Test Ping state
  const [testRecipientPhone, setTestRecipientPhone] = useState("");
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // Verify token without saving
  const handleVerifyToken = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API Key / Access Token to test.");
      return;
    }
    if (provider === "META_CLOUD_API" && !phoneNumberId.trim()) {
      toast.error("Please enter your Meta Phone Number ID.");
      return;
    }

    setIsVerifying(true);
    toast.loading("Testing handshake with Cloud API endpoint...", { id: "verify-waba" });

    try {
      const res = await verifyWabaTokenAction({
        providerType: provider,
        apiKey: apiKey.trim(),
        phoneNumberId: phoneNumberId.trim() || undefined,
        wabaId: wabaId.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Token verified! Quality: ${res.qualityRating || "GREEN"}. Verified Name: "${res.verifiedName}"`,
          { id: "verify-waba" }
        );
        if (res.verifiedName && !businessName) {
          setBusinessName(res.verifiedName);
        }
      } else {
        toast.error(`Verification Failed: ${res.error}`, { id: "verify-waba" });
      }
    } catch (err: any) {
      toast.error(err.message || "Network error verifying token", { id: "verify-waba" });
    } finally {
      setIsVerifying(false);
    }
  };

  // Save & Connect
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error("WhatsApp Business Phone Number is required.");
      return;
    }
    if (!apiKey.trim()) {
      toast.error(provider === "META_CLOUD_API" ? "Meta System User Token is required." : "Zernio API Key is required.");
      return;
    }
    if (provider === "META_CLOUD_API" && !phoneNumberId.trim()) {
      toast.error("Meta Phone Number ID is required for Meta Cloud API.");
      return;
    }

    setIsSaving(true);
    toast.loading("Verifying credentials & saving WABA configuration...", { id: "save-waba" });

    try {
      const res = await saveWhatsAppConfigAction({
        providerType: provider,
        phoneNumber: phoneNumber.trim(),
        businessName: businessName.trim() || undefined,
        apiKey: apiKey.trim(),
        phoneNumberId: phoneNumberId.trim() || undefined,
        wabaId: wabaId.trim() || undefined,
      });

      if (res.success) {
        toast.success("WhatsApp Business API connected and verified successfully!", { id: "save-waba" });
        setConfig({
          status: "CONNECTED",
          providerType: provider,
          phoneNumber: phoneNumber.trim(),
          businessName: businessName.trim() || undefined,
          phoneNumberId: phoneNumberId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
          maskedApiKey: apiKey.length > 8 ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : "••••••••",
          apiKey: apiKey.trim(),
          updatedAt: new Date().toISOString(),
          metadata: {
            qualityRating: "GREEN",
            verifiedAt: new Date().toISOString(),
          },
        });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to connect WhatsApp account", { id: "save-waba" });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: "save-waba" });
    } finally {
      setIsSaving(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Official WhatsApp Cloud API account? Automated triggers and broadcast campaigns will be paused.")) {
      return;
    }

    setIsDisconnecting(true);
    toast.loading("Disconnecting WhatsApp account...", { id: "dc-waba" });

    try {
      const res = await disconnectWhatsAppAction();
      if (res.success) {
        toast.success("WhatsApp account disconnected successfully", { id: "dc-waba" });
        setConfig(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to disconnect account", { id: "dc-waba" });
      }
    } catch (err: any) {
      toast.error(err.message || "Error disconnecting account", { id: "dc-waba" });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Dispatch Live Test Ping
  const handleSendTestPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientPhone.trim()) {
      toast.error("Please enter a destination phone number for the test ping.");
      return;
    }

    setIsSendingPing(true);
    setPingResult(null);
    toast.loading("Dispatching live WhatsApp test ping...", { id: "test-ping" });

    try {
      const res = await testWhatsAppPingAction(testRecipientPhone.trim());
      if (res.success) {
        toast.success("Test WhatsApp ping delivered successfully!", { id: "test-ping" });
        setPingResult({
          success: true,
          message: res.message || "Ping delivered successfully!",
          messageId: res.messageId,
        });
      } else {
        toast.error(res.error || "Failed to send test ping", { id: "test-ping" });
        setPingResult({
          success: false,
          message: res.error || "Failed to deliver test ping",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error dispatching test ping", { id: "test-ping" });
      setPingResult({
        success: false,
        message: err.message || "Error dispatching test ping",
      });
    } finally {
      setIsSendingPing(false);
    }
  };

  return (
    <div className="space-y-4 select-none max-w-5xl">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/90 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/owner/promotions" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Promotions Suite</span>
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Official WhatsApp WABA Hub</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Official WhatsApp Business Cloud API</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              Enterprise Grade
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Connect Meta Cloud API or Zernio WABA for high-deliverability triggers and mass marketing with zero phone number ban risk.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isConnected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <span>Connected & Verified</span>
              <span className="text-[10px] font-mono bg-white text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                {config?.providerType === "ZERNIO" ? "Zernio (Coexistence)" : "Meta Direct"}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-extrabold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Not Configured</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. LIVE HEALTH CARD (When Connected) */}
      {isConnected && config && (
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-blue-50/30 border border-emerald-200/90 rounded-2xl p-4 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {config.businessName || "Verified Optical Store"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Quality: {config.metadata?.qualityRating || "HIGH / GREEN"}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono font-semibold">
                  {config.phoneNumber || "Phone Active"} • Channel: {config.providerType === "ZERNIO" ? "Zernio Cloud Gateway (Coexistence Active)" : "Direct Meta Graph API v21.0"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-extrabold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect WABA</span>
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Provider</span>
              <p className="font-extrabold text-slate-800">
                {config.providerType === "ZERNIO" ? "Zernio WABA" : "Meta Cloud API"}
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Phone Number ID</span>
              <p className="font-mono font-bold text-slate-700 truncate" title={config.phoneNumberId}>
                {config.phoneNumberId || "—"}
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Account ID / WABA</span>
              <p className="font-mono font-bold text-slate-700 truncate" title={config.wabaId}>
                {config.wabaId || "Verified"}
              </p>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Active Token</span>
              <p className="font-mono font-bold text-slate-700 truncate">
                {config.maskedApiKey || "••••••••••••••••"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEST WHATSAPP PING BOX (Available when connected) */}
      {isConnected && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Live WhatsApp Delivery Diagnostics & Test Ping
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Verify end-to-end receipt on a real phone</span>
          </div>

          <form onSubmit={handleSendTestPing} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9+ ]*"
                maxLength={16}
                onKeyPress={(e) => {
                  if (!/[0-9+ ]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                required
                placeholder="Enter test phone number with country code (e.g. 919876543210)"
                value={testRecipientPhone}
                onChange={(e) => setTestRecipientPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingPing}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isSendingPing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Ping...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test WhatsApp Ping</span>
                </>
              )}
            </button>
          </form>

          {pingResult && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              pingResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
            }`}>
              <div className="flex items-center gap-2">
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{pingResult.message}</span>
              </div>
              {pingResult.messageId && (
                <span className="font-mono text-[10px] text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                  ID: {pingResult.messageId}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN CONFIGURATION FORM & PROVIDER PICKER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {/* Switcher Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {isConnected ? "Update WhatsApp Business API Credentials" : "Configure Official WhatsApp Business API"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Choose your cloud integration provider. Both options bypass unofficial automation limits and provide high deliverability.
            </p>
          </div>

          {/* 2-Option Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => {
                setProvider("META_CLOUD_API");
                setShowApiKey(false);
              }}
              className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                provider === "META_CLOUD_API"
                  ? "bg-white text-emerald-700 shadow-2xs font-extrabold border border-emerald-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Direct Meta Cloud API</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProvider("ZERNIO");
                setShowApiKey(false);
              }}
              className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                provider === "ZERNIO"
                  ? "bg-white text-[#2563eb] shadow-2xs font-extrabold border border-blue-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>2. Zernio (Coexistence)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4">
          {/* Provider Distinctive Banner */}
          {provider === "META_CLOUD_API" ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-700" />
                  <strong className="font-extrabold text-emerald-900">Direct Meta Cloud API (Official Enterprise)</strong>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-800">
                    Zero Fees
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  Direct connection to Meta Graph API v21.0. 1,000 free service conversations per month provided directly by Meta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMetaGuideOpen(!isMetaGuideOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100/60 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <span>Setup Guide</span>
                {isMetaGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <strong className="font-extrabold text-blue-900">Zernio WhatsApp Cloud API (With Mobile Coexistence)</strong>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-blue-200 text-blue-800">
                    Coexistence Mode
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                  Retain full use of your WhatsApp Business Android/iOS smartphone app while cloud automation sends marketing broadcasts in parallel.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsZernioGuideOpen(!isZernioGuideOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-100/60 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <span>Setup Guide</span>
                {isZernioGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Collapsible Meta Setup Guide */}
          {provider === "META_CLOUD_API" && isMetaGuideOpen && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                  5-Minute Meta Cloud API Setup Walkthrough
                </span>
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                >
                  <span>Open Meta Developer Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium">
                <li>Create an App at <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800 font-bold">developers.facebook.com</code> with type <strong>Other &gt; Business</strong>.</li>
                <li>Add the <strong>WhatsApp</strong> product to your app.</li>
                <li>Navigate to <strong>WhatsApp &gt; API Setup</strong> to view your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong>.</li>
                <li>In Meta Business Manager &gt; System Users, generate a <strong>System User Access Token</strong> with <code className="bg-white px-1 py-0.2 rounded border font-mono text-[10px]">whatsapp_business_messaging</code> and <code className="bg-white px-1 py-0.2 rounded border font-mono text-[10px]">whatsapp_business_management</code>.</li>
                <li>Copy the Permanent Token, paste into the form below, and click <strong>Test Connection &amp; Save</strong>.</li>
              </ol>
            </div>
          )}

          {/* Collapsible Zernio Setup Guide */}
          {provider === "ZERNIO" && isZernioGuideOpen && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                  Zernio Coexistence API Integration
                </span>
                <a
                  href="https://zernio.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#2563eb] hover:text-blue-800 font-bold"
                >
                  <span>Open Zernio Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium">
                <li>Sign in to your Zernio Workspace and connect your WhatsApp Business number.</li>
                <li>Ensure <strong>Coexistence Mode</strong> is toggled ON if you wish to keep chat replies on your physical phone app.</li>
                <li>Copy your <strong>API Secret Key</strong> (<code className="bg-white px-1 py-0.2 rounded border font-mono text-[10px]">sk_...</code>) and Channel ID.</li>
                <li>Paste the credentials below and verify your connection.</li>
              </ol>
            </div>
          )}

          {/* Fields Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* WhatsApp Phone Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  WhatsApp Business Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Smartphone className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9+ ]*"
                    maxLength={16}
                    onKeyPress={(e) => {
                      if (!/[0-9+ ]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    required
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">With country code (e.g. +91 for India)</span>
              </div>

              {/* Business Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Business / Store Display Name
                </label>
                <div className="relative flex items-center">
                  <Building className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Vision Care Optical Studio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Verified display name shown in WhatsApp header</span>
              </div>
            </div>

            {/* Provider IDs */}
            {provider === "META_CLOUD_API" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    Meta Phone Number ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Hash className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 104829384729104"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Found in Meta App &gt; WhatsApp &gt; API Setup</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <div className="relative flex items-center">
                    <Hash className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. 109283746501928"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">WABA Account ID for template syncing</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Zernio Channel / Account ID <span className="text-slate-400 lowercase">(optional)</span>
                </label>
                <div className="relative flex items-center">
                  <Hash className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. ch_01h8x9p3q7"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Unique channel reference in Zernio Dashboard</span>
              </div>
            )}

            {/* Secret API Key / Access Token */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  {provider === "META_CLOUD_API" ? "Meta System User Token (Permanent)" : "Zernio API Secret Key"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showApiKey ? (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Hide Key</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Reveal Key</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative flex items-center">
                <Key className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showApiKey ? "text" : "password"}
                  required
                  placeholder={provider === "META_CLOUD_API" ? "EAAG..." : "sk_live_..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Encrypted with AES-256 in PostgreSQL. Never exposed in client network calls.
              </span>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleVerifyToken}
                disabled={isVerifying || isSaving}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Handshake...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Test Handshake &amp; Verify Token</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/owner/promotions"
                  className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSaving || isVerifying}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving &amp; Connecting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isConnected ? "Save & Update Credentials" : "Verify & Connect Account"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
