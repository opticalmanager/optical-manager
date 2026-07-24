"use client";

import React, { useState } from "react";
import { MessageSquare, Plus, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

interface TemplateItem {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  content: string;
  variablesCount: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
}

export function TemplatesTab() {
  const [templates] = useState<TemplateItem[]>([
    {
      id: "tmpl-1",
      name: "Birthday Wishes Template",
      category: "MARKETING",
      language: "English (en)",
      content: "Hi {{1}} 🥳 Wishing you a very Happy Birthday! 🎉 May your day be filled with happiness and clarity. Use code: *BIRTHDAY20* to get 20% OFF on your next purchase. Valid till {{2}}.",
      variablesCount: 2,
      status: "APPROVED",
    },
    {
      id: "tmpl-2",
      name: "Thank You & Review Request",
      category: "UTILITY",
      language: "English (en)",
      content: "Dear {{1}}, thank you for purchasing your spectacles with {{2}}! We hope you love your vision clarity. Please leave us a review here: {{3}}.",
      variablesCount: 3,
      status: "APPROVED",
    },
    {
      id: "tmpl-3",
      name: "Appointment Reminder",
      category: "UTILITY",
      language: "English (en)",
      content: "Hi {{1}}, this is a friendly reminder for your upcoming Eye Consultation on {{2}} at {{3}} with {{4}}. Reply 1 to confirm.",
      variablesCount: 4,
      status: "APPROVED",
    },
    {
      id: "tmpl-4",
      name: "Special Discount Broadcast",
      category: "MARKETING",
      language: "English (en)",
      content: "Exclusive Offer for {{1}}! Get Buy 1 Get 1 Free on all branded spectacle frames this weekend only at {{2}}.",
      variablesCount: 2,
      status: "APPROVED",
    },
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Template text copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">WhatsApp Message Templates</h3>
          <p className="text-xs text-slate-500 font-medium">Pre-approved Meta/WhatsApp templates for triggers and campaigns.</p>
        </div>
        <button
          onClick={() => toast.info("WhatsApp Template creation dialog coming soon!")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Template</span>
        </button>
      </div>

      {/* Templates Catalog Grid - DISTINCT BORDERS & HIGH-DENSITY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tmpl) => (
          <div 
            key={tmpl.id} 
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-[#2563eb]/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{tmpl.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100 uppercase tracking-wider">
                      {tmpl.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">{tmpl.language}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Approved
                </span>
              </div>

              {/* Template Content Box */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-800 leading-relaxed relative group">
                <p>{tmpl.content}</p>
                <button
                  onClick={() => copyToClipboard(tmpl.content)}
                  className="absolute top-2 right-2 p-1 bg-white border border-slate-200 rounded text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all shadow-2xs"
                  title="Copy template content"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500 font-semibold">
              <span>{tmpl.variablesCount} Dynamic Variables</span>
              <button
                onClick={() => copyToClipboard(tmpl.content)}
                className="text-[#2563eb] hover:underline font-bold"
              >
                Copy Syntax
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
