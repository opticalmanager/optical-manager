"use client";

import React, { useState } from "react";
import { 
  Plus, 
  FileText, 
  Edit2, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  X, 
  Loader2, 
  Sparkles,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { saveEmailTemplateAction, toggleEmailTemplateAction, deleteEmailTemplateAction } from "@/actions/email-settings.actions";

interface TemplateItem {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "INVOICE" | "RECEIPT" | "REMINDER" | "WELCOME" | "APPOINTMENT" | "CUSTOM";
  variables: any;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface EmailTemplatesTabProps {
  initialTemplates: TemplateItem[];
}

export function EmailTemplatesTab({ initialTemplates }: EmailTemplatesTabProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("CUSTOM");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active cursor target field (subject or body)
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const availableVariables = [
    { key: "{{customer_name}}", label: "Customer Name", group: "Customer" },
    { key: "{{customer_email}}", label: "Customer Email", group: "Customer" },
    { key: "{{customer_phone}}", label: "Customer Phone", group: "Customer" },
    { key: "{{invoice_number}}", label: "Invoice Number", group: "Invoice" },
    { key: "{{total}}", label: "Total Amount", group: "Invoice" },
    { key: "{{balance_due}}", label: "Balance Due", group: "Invoice" },
    { key: "{{amount_paid}}", label: "Amount Paid", group: "Payment" },
    { key: "{{payment_method}}", label: "Payment Method", group: "Payment" },
    { key: "{{appointment_date}}", label: "Appointment Date", group: "Appointment" },
    { key: "{{appointment_time}}", label: "Appointment Time", group: "Appointment" },
    { key: "{{shop_name}}", label: "Shop Name", group: "Shop" },
    { key: "{{shop_address}}", label: "Shop Address", group: "Shop" },
    { key: "{{shop_phone}}", label: "Shop Phone", group: "Shop" },
  ];

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName("");
    setCategory("CUSTOM");
    setSubject("");
    setBody(`
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: #2563eb; padding: 20px; text-align: center;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">{{shop_name}}</h2>
  </div>
  <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
    <p>Dear <strong>{{customer_name}}</strong>,</p>
    <p>Write your email body message here...</p>
    <p style="margin-top: 24px;">Regards,<br/><strong>{{shop_name}} Team</strong></p>
  </div>
</div>
    `.trim());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: TemplateItem) => {
    setEditingTemplate(tpl);
    setName(tpl.name);
    setCategory(tpl.category);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setIsModalOpen(true);
  };

  const handleInsertVariable = (varKey: string) => {
    if (activeField === "subject") {
      setSubject((prev) => prev + " " + varKey);
    } else {
      setBody((prev) => prev + " " + varKey);
    }
  };

  const handleToggle = async (tplId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    setTemplates((prev) => prev.map((t) => (t.id === tplId ? { ...t, isActive: newActive } : t)));

    const res = await toggleEmailTemplateAction(tplId, newActive);
    if (!res.success) {
      toast.error("Failed to update template status");
      setTemplates((prev) => prev.map((t) => (t.id === tplId ? { ...t, isActive: currentActive } : t)));
    } else {
      toast.success(newActive ? "Template activated" : "Template deactivated");
    }
  };

  const handleDelete = async (tplId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setTemplates((prev) => prev.filter((t) => t.id !== tplId));
    const res = await deleteEmailTemplateAction(tplId);
    if (res.success) {
      toast.success("Template deleted");
    } else {
      toast.error(res.error || "Failed to delete template");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Name, Subject, and Body are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (editingTemplate) formData.append("id", editingTemplate.id);
      formData.append("name", name);
      formData.append("category", category);
      formData.append("subject", subject);
      formData.append("body", body);

      const res = await saveEmailTemplateAction(formData);
      if (res.success) {
        toast.success(editingTemplate ? "Template updated!" : "Template created!");
        setIsModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to save template.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryPill = (cat: string) => {
    switch (cat) {
      case "INVOICE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "RECEIPT": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REMINDER": return "bg-amber-50 text-amber-700 border-amber-200";
      case "WELCOME": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "APPOINTMENT": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Render Sample Preview with replaced dummy values
  const renderSamplePreview = (rawHtml: string, rawSubject: string) => {
    let s = rawSubject;
    let b = rawHtml;
    const dummyMap: Record<string, string> = {
      "{{customer_name}}": "Rahul Sharma",
      "{{customer_email}}": "rahul.sharma@example.com",
      "{{customer_phone}}": "+91 98765 43210",
      "{{invoice_number}}": "INV-00124",
      "{{total}}": "₹4,500.00",
      "{{balance_due}}": "₹2,000.00",
      "{{amount_paid}}": "₹2,500.00",
      "{{payment_method}}": "UPI / GPay",
      "{{appointment_date}}": "28 Jul 2025",
      "{{appointment_time}}": "10:30 AM",
      "{{shop_name}}": "Vision Care Optics",
      "{{shop_address}}": "MG Road, Narsapur",
      "{{shop_phone}}": "+91 98765 43210",
    };

    Object.entries(dummyMap).forEach(([k, v]) => {
      s = s.replace(new RegExp(`{{\\s*${k.replace(/[{}]/g, "")}\\s*}}`, "g"), v);
      b = b.replace(new RegExp(`{{\\s*${k.replace(/[{}]/g, "")}\\s*}}`, "g"), v);
    });

    return { previewSubject: s, previewBody: b };
  };

  const { previewSubject, previewBody } = renderSamplePreview(body, subject);

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Email Templates</h3>
          <p className="text-xs text-slate-400 font-medium">
            Manage HTML email templates for invoice receipts, payment confirmations, and patient notifications.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`border rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 bg-white ${
              tpl.isActive ? "border-slate-200/90 shadow-2xs hover:shadow-md" : "border-slate-200 bg-slate-50/50 opacity-60"
            }`}
          >
            {/* Template Card Top Bar */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getCategoryPill(tpl.category)}`}>
                    {tpl.category}
                  </span>
                  {tpl.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      System Default
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-900 text-xs leading-none">{tpl.name}</h4>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(tpl.id, tpl.isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  tpl.isActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    tpl.isActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Subject & Preview snippet */}
            <div className="space-y-1.5 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject Line:</span>
              <p className="text-xs font-semibold text-slate-800 line-clamp-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md font-mono">
                {tpl.subject}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                {Array.isArray(tpl.variables) ? `${tpl.variables.length} variables` : "Custom variables"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(tpl)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {!tpl.isDefault && (
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL WITH LIVE PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  {editingTemplate ? "Edit Email Template" : "Create New Email Template"}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Screen Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
              {/* Left Column: Form & Variable Picker (7 cols) */}
              <form onSubmit={handleSubmit} className="md:col-span-7 p-6 space-y-4 border-r border-slate-200 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Template Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Invoice Receipt"
                      required
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-slate-800"
                    >
                      <option value="INVOICE">Invoice</option>
                      <option value="RECEIPT">Payment Receipt</option>
                      <option value="REMINDER">Reminder</option>
                      <option value="WELCOME">Welcome Email</option>
                      <option value="APPOINTMENT">Appointment</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Subject Line *</label>
                    <span className="text-[10px] text-slate-400 font-medium">Click a variable chip below to insert</span>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onFocus={() => setActiveField("subject")}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Invoice #{{invoice_number}} from {{shop_name}}"
                    required
                    className="w-full border border-slate-200 bg-white px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-slate-800"
                  />
                </div>

                {/* Variable Smart Picker */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Variable Smart Picker (Click to insert into {activeField}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVariables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleInsertVariable(v.key)}
                        className="px-2 py-1 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded-md transition-all cursor-pointer"
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Email Body (HTML) *</label>
                  <textarea
                    rows={12}
                    value={body}
                    onFocus={() => setActiveField("body")}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    className="w-full border border-slate-200 bg-white p-3 text-xs rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-slate-800 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Template</span>
                  </button>
                </div>
              </form>

              {/* Right Column: Real-Time Live Preview (5 cols) */}
              <div className="md:col-span-5 bg-slate-100/70 p-6 space-y-3 overflow-y-auto">
                <div className="flex items-center gap-2 text-slate-700 border-b border-slate-200 pb-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Live Sample Email Preview</span>
                </div>

                {/* Email Client Window Frame */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                  <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-1 text-[11px]">
                    <div><span className="text-slate-400 font-medium">From:</span> <span className="font-semibold text-slate-800">Vision Care Optics via Optical Manager</span></div>
                    <div><span className="text-slate-400 font-medium">To:</span> <span className="font-semibold text-slate-800">Rahul Sharma &lt;rahul.sharma@example.com&gt;</span></div>
                    <div><span className="text-slate-400 font-medium">Subject:</span> <span className="font-bold text-slate-900 font-mono">{previewSubject || "(No Subject)"}</span></div>
                  </div>

                  {/* Rendered Body */}
                  <div 
                    className="p-4 overflow-x-auto text-slate-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
