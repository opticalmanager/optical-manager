"use client";

import React, { useState } from "react";
import { 
  X, 
  MessageSquare, 
  Globe, 
  Smartphone, 
  QrCode, 
  Key, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  Zap,
  Building
} from "lucide-react";
import { saveWhatsAppConfigAction } from "@/actions/promotion.actions";
import { toast } from "sonner";

interface ConnectWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectWhatsAppModal({ isOpen, onClose, onSuccess }: ConnectWhatsAppModalProps) {
  const [provider, setProvider] = useState<"META_CLOUD_API" | "TWILIO" | "QR_GATEWAY">("META_CLOUD_API");
  const [phoneNumber, setPhoneNumber] = useState("+91 98765 43210");
  const [businessName, setBusinessName] = useState("VisionCare Optics");
  const [apiKey, setApiKey] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid WhatsApp phone number");
      return;
    }

    setIsConnecting(true);
    const res = await saveWhatsAppConfigAction({
      providerType: provider,
      phoneNumber,
      businessName,
      apiKey: provider === "META_CLOUD_API" ? apiKey : undefined,
      accountSid: provider === "TWILIO" ? accountSid : undefined,
    });
    setIsConnecting(false);

    if (res.success) {
      toast.success("WhatsApp Business Account connected successfully!");
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "Failed to connect WhatsApp account");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden space-y-0">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Connect WhatsApp Account</h3>
              <p className="text-xs text-slate-500 font-medium">Set up automated promotional messages & patient triggers.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100/80 rounded-xl text-xs font-extrabold text-slate-600">
            <button
              type="button"
              onClick={() => setProvider("META_CLOUD_API")}
              className={`py-2 px-2.5 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                provider === "META_CLOUD_API"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Meta Cloud API</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("TWILIO")}
              className={`py-2 px-2.5 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                provider === "TWILIO"
                  ? "bg-white text-[#2563eb] shadow-2xs font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Twilio API</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("QR_GATEWAY")}
              className={`py-2 px-2.5 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                provider === "QR_GATEWAY"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Gateway</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                WhatsApp Business Phone Number
              </label>
              <div className="relative flex items-center">
                <Smartphone className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Business Display Name
              </label>
              <div className="relative flex items-center">
                <Building className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="VisionCare Optics"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* Meta Specific API Key */}
            {provider === "META_CLOUD_API" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Meta System User Token / API Key
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="EAAG...."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Twilio Specific Account SID */}
            {provider === "TWILIO" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Twilio Account SID
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    placeholder="AC...."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            )}

            {/* QR Gateway Preview */}
            {provider === "QR_GATEWAY" && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <div className="w-24 h-24 mx-auto bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-800" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Scan QR code using WhatsApp Link a Device menu.</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connect Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Note Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit Encrypted Integration • Official WhatsApp Business APIs</span>
        </div>
      </div>
    </div>
  );
}
