"use client";

import React, { useState } from "react";
import { 
  X, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Check, 
  RefreshCw, 
  Tag, 
  Sliders, 
  Zap,
  Info
} from "lucide-react";
import { refineGrowthCopyAction } from "@/actions/ai-growth.actions";
import type { 
  GrowthCohortCategory, 
  CampaignRefinementOptions, 
  AiCampaignRefinementResult 
} from "@/types/ai-growth";
import { toast } from "sonner";

interface AiCopyStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohortType: GrowthCohortCategory;
  initialMessage: string;
  initialDiscount: string;
  onApplyCopy: (result: { messageBody: string; approvedOffer: string }) => void;
}

export function AiCopyStudioModal({
  isOpen,
  onClose,
  cohortType,
  initialMessage,
  initialDiscount,
  onApplyCopy,
}: AiCopyStudioModalProps) {
  const [occasion, setOccasion] = useState("Routine Optometric Recall");
  const [tone, setTone] = useState<"clinical" | "friendly" | "urgent" | "festive">("clinical");
  const [discountCap, setDiscountCap] = useState(initialDiscount || "15% OFF");
  const [customNotes, setCustomNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [previewBody, setPreviewBody] = useState(initialMessage);
  const [approvedOffer, setApprovedOffer] = useState(initialDiscount);
  const [targetAngle, setTargetAngle] = useState("Clinical Optometric Care");

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setPreviewBody(initialMessage);
      setApprovedOffer(initialDiscount);
    }
  }, [isOpen, initialMessage, initialDiscount]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      toast.loading("Gemini 3.5 Flash is generating clinical copy...", { id: "ai-gen" });

      const res = await refineGrowthCopyAction({
        cohortType,
        occasion,
        tone,
        discountCap,
        customNotes: customNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setPreviewBody(res.data.messageBody);
        setApprovedOffer(res.data.approvedOffer);
        setTargetAngle(res.data.targetAngle);
        toast.success("New clinical copy generated!", { id: "ai-gen" });
      } else {
        toast.error(res.error || "Failed to generate copy", { id: "ai-gen" });
      }
    } catch (err: any) {
      toast.error("Error generating copy", { id: "ai-gen" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onApplyCopy({
      messageBody: previewBody,
      approvedOffer,
    });
    toast.success("Applied new copy to campaign!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200/90 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>AI Copy Studio</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                  Gemini 3.5 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tune promotional messaging with clinical ethics and margin guardrails.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Occasion / Theme */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Occasion / Campaign Angle
              </label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="Routine Optometric Recall">Routine Optometric Recall</option>
                <option value="Festive Eyewear Celebration">Festive Eyewear Celebration</option>
                <option value="Digital Eye Strain Awareness">Digital Eye Strain Awareness</option>
                <option value="Weekend Flash Frame Upgrade">Weekend Flash Upgrade</option>
                <option value="Seasonal Eye Care Refresh">Seasonal Eye Care Refresh</option>
              </select>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Brand Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="clinical">Clinical & Caring (Recommended)</option>
                <option value="friendly">Friendly & Warm</option>
                <option value="urgent">Gentle Time-Sensitive</option>
                <option value="festive">Festive & Celebratory</option>
              </select>
            </div>

            {/* Discount Cap / Offer */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Maximum Approved Offer</span>
                <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Margin Locked
                </span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={discountCap}
                onChange={(e) => setDiscountCap(e.target.value)}
                placeholder="e.g. 15% OFF or ₹500 Voucher"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Store Notes (Optional)
              </label>
              <input
                type="text"
                maxLength={120}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Highlight blue-cut lenses or new frames"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refining with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Refined WhatsApp Message</span>
              </>
            )}
          </button>

          {/* Ethics Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Clinical Ethics Guardrail Active • Zero unverified medical cure claims permitted.
            </span>
          </div>

          {/* Live Preview Panel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Live WhatsApp Message Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {targetAngle}
              </span>
            </div>

            {/* WhatsApp Smartphone Speech Bubble */}
            <div className="p-3.5 rounded-2xl bg-[#EFEAE2] border border-[#DDD5C7] shadow-inner relative">
              <div className="max-w-[85%] bg-white rounded-xl rounded-tl-none p-3 shadow-sm border border-slate-100 text-slate-800 font-sans leading-relaxed text-xs">
                <p className="whitespace-pre-wrap">
                  {previewBody}
                </p>
                <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-600">
                    Approved: {approvedOffer}
                  </span>
                  <span>10:30 AM • Delivered</span>
                </div>
              </div>
            </div>

            {/* Variable Pills Guide */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-400 font-semibold">Available placeholders:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                {"{{customer_name}}"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                {"{{shop_name}}"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                {"{{store_credit}}"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Copy to Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
}
