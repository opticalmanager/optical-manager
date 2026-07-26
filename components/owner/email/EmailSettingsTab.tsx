"use client";

import React, { useState } from "react";
import { 
  Settings, 
  ShieldCheck, 
  Store, 
  Send, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { testEmailConnectionAction, saveShopSignatureAction } from "@/actions/email-settings.actions";

interface EmailSettingsTabProps {
  emailConfig: any;
  shops: Array<{ id: string; name: string; settings: any }>;
  onDisconnect: () => void;
}

export function EmailSettingsTab({ emailConfig, shops, onDisconnect }: EmailSettingsTabProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [isSavingSig, setIsSavingSig] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    toast.loading("Sending test email to your Gmail address...", { id: "test-conn" });

    try {
      const res = await testEmailConnectionAction();
      if (res.success) {
        toast.success("Test email sent! Please check your Gmail inbox.", { id: "test-conn" });
      } else {
        toast.error(res.error || "SMTP Verification Failed.", { id: "test-conn" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to execute test connection.", { id: "test-conn" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenEditSignature = (shopId: string, currentSig: string) => {
    setEditingShopId(shopId);
    setSignatureText(currentSig || "");
  };

  const handleSaveSignature = async (shopId: string) => {
    setIsSavingSig(true);
    try {
      const res = await saveShopSignatureAction(shopId, signatureText);
      if (res.success) {
        toast.success("Shop email signature updated!");
        setEditingShopId(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to save signature.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save signature.");
    } finally {
      setIsSavingSig(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 2-Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Connection Info */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">SMTP Connection Status</h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Provider:</span>
              <span className="font-bold text-slate-900">Gmail SMTP</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Server Host:</span>
              <span className="font-mono font-bold text-slate-800">smtp.gmail.com:587</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Active Account:</span>
              <span className="font-mono font-bold text-slate-800 break-all">{emailConfig?.emailAddress}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Sender Name:</span>
              <span className="font-bold text-slate-800">{emailConfig?.senderName || "Optical Manager"}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-lg border border-indigo-200/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Test Connection & Send Verification Mail</span>
            </button>
          </div>
        </div>

        {/* Card 2: Per-Shop Email Signatures */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 border-b border-slate-100 pb-3">
            <Store className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Per-Store Email Signatures</h4>
          </div>

          <div className="space-y-3 text-xs">
            {shops.map((shop) => {
              const sig = (shop.settings as any)?.emailSignature || "";
              const isEditing = editingShopId === shop.id;

              return (
                <div key={shop.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{shop.name}</span>
                    <button
                      onClick={() => handleOpenEditSignature(shop.id, sig)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {isEditing ? "Cancel" : "Edit Signature"}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="e.g. Vision Care Optics • Narsapur Branch • Phone: +91 98765 43210"
                        className="w-full text-xs p-2 border border-slate-200 bg-white rounded-md outline-none font-sans"
                      />
                      <button
                        onClick={() => handleSaveSignature(shop.id)}
                        disabled={isSavingSig}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                      >
                        {isSavingSig ? "Saving..." : "Save Signature"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-medium italic line-clamp-2">
                      {sig ? sig : "No signature configured. Using default store footer."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h4>
        </div>
        <p className="text-xs text-rose-900/90 font-medium">
          Disconnecting your Gmail SMTP account will stop all automated email dispatches (invoice receipts, payment confirmations, appointment reminders) across all your store locations.
        </p>
        <button
          onClick={onDisconnect}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
        >
          Disconnect Gmail Account
        </button>
      </div>
    </div>
  );
}
