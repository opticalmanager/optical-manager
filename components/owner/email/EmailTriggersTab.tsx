"use client";

import React, { useState } from "react";
import { 
  Zap, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  HelpCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { toggleEmailTriggerAction, updateTriggerTemplateAction, sendTestTriggerEmailAction } from "@/actions/email-settings.actions";

interface TriggerItem {
  id: string;
  name: string;
  event: string;
  templateId: string | null;
  templateName: string | null;
  priority: "CRITICAL" | "STANDARD" | "LOW";
  isActive: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  triggerCount: number;
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
}

interface EmailTriggersTabProps {
  initialTriggers: TriggerItem[];
  templates: TemplateOption[];
}

export function EmailTriggersTab({ initialTriggers, templates }: EmailTriggersTabProps) {
  const [triggers, setTriggers] = useState<TriggerItem[]>(initialTriggers);
  const [testingTriggerId, setTestingTriggerId] = useState<string | null>(null);

  const handleToggle = async (triggerId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    setTriggers((prev) => prev.map((t) => (t.id === triggerId ? { ...t, isActive: newActive } : t)));

    const res = await toggleEmailTriggerAction(triggerId, newActive);
    if (!res.success) {
      toast.error(res.error || "Failed to update trigger state");
      setTriggers((prev) => prev.map((t) => (t.id === triggerId ? { ...t, isActive: currentActive } : t)));
    } else {
      toast.success(newActive ? "Automated trigger activated!" : "Trigger paused.");
    }
  };

  const handleTemplateChange = async (triggerId: string, newTemplateId: string) => {
    const selectedTpl = templates.find((t) => t.id === newTemplateId);
    setTriggers((prev) =>
      prev.map((t) =>
        t.id === triggerId
          ? { ...t, templateId: newTemplateId, templateName: selectedTpl?.name || null }
          : t
      )
    );

    const res = await updateTriggerTemplateAction(triggerId, newTemplateId);
    if (res.success) {
      toast.success("Trigger template updated!");
    } else {
      toast.error(res.error || "Failed to link template");
    }
  };

  const handleSendTestEmail = async (triggerId: string) => {
    setTestingTriggerId(triggerId);
    toast.loading("Dispatching test email to your Gmail address...", { id: "test-trigger" });

    try {
      const res = await sendTestTriggerEmailAction(triggerId);
      if (res.success) {
        toast.success(res.message || "Test email dispatched successfully!", { id: "test-trigger" });
      } else {
        toast.error(res.error || "Failed to send test email.", { id: "test-trigger" });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending test email.", { id: "test-trigger" });
    } finally {
      setTestingTriggerId(null);
    }
  };

  const getPriorityPill = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return { label: "CRITICAL (Invoices/Payments)", style: "bg-rose-50 text-rose-700 border-rose-200" };
      case "STANDARD":
        return { label: "STANDARD (Appointments)", style: "bg-amber-50 text-amber-700 border-amber-200" };
      default:
        return { label: "LOW (Welcome/Followup)", style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  };

  const activeCount = triggers.filter((t) => t.isActive).length;
  const totalFired = triggers.reduce((acc, t) => acc + (t.triggerCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Status Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total Triggers</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">{triggers.length}</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Active Rules</span>
          <span className="text-xl font-extrabold text-emerald-600 font-mono">{activeCount}</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Paused Rules</span>
          <span className="text-xl font-extrabold text-amber-600 font-mono">{triggers.length - activeCount}</span>
        </div>
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Total Auto-Fired</span>
          <span className="text-xl font-extrabold text-indigo-600 font-mono">{totalFired}</span>
        </div>
      </div>

      {/* Triggers List */}
      <div className="space-y-3">
        {triggers.map((trigger) => {
          const priorityInfo = getPriorityPill(trigger.priority);
          return (
            <div
              key={trigger.id}
              className={`bg-white border rounded-xl p-4 transition-all shadow-2xs space-y-3 ${
                trigger.isActive ? "border-slate-200/90 hover:border-slate-300" : "border-slate-200 opacity-75"
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${trigger.isActive ? "text-amber-500" : "text-slate-400"}`} />
                    <h4 className="font-bold text-slate-900 text-sm leading-none">{trigger.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${priorityInfo.style}`}>
                      {priorityInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{trigger.description}</p>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-bold text-slate-500">{trigger.isActive ? "ACTIVE" : "PAUSED"}</span>
                  <button
                    onClick={() => handleToggle(trigger.id, trigger.isActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      trigger.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        trigger.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Template Linker & Telemetry Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {/* Template Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Linked Template:</span>
                  <select
                    value={trigger.templateId || ""}
                    onChange={(e) => handleTemplateChange(trigger.id, e.target.value)}
                    className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>Select Template</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Telemetry info & Test Email Launcher */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Fired: <strong className="text-slate-700 font-mono">{trigger.triggerCount || 0}</strong> times
                  </span>

                  <button
                    onClick={() => handleSendTestEmail(trigger.id)}
                    disabled={testingTriggerId === trigger.id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200/60 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {testingTriggerId === trigger.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send Test Email</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
