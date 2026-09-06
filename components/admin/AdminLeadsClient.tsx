"use client";

import React, { useState } from "react";
import { 
  Users, 
  PhoneCall, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar, 
  Sparkles,
  ExternalLink,
  Store,
  X,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  CreditCard,
  User,
  Loader2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateDemoRequestStatus, provisionNewTenantStore } from "@/services/admin.service";

interface AdminLeadsClientProps {
  leads: any[];
}

export default function AdminLeadsClient({ leads: initialLeads }: AdminLeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Provisioning Modal from Lead
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formOrgName, setFormOrgName] = useState("");
  const [formOutletName, setFormOutletName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formOwnerEmail, setFormOwnerEmail] = useState("");
  const [formOwnerPassword, setFormOwnerPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formPlan, setFormPlan] = useState<"TRIAL" | "BASIC" | "PRO" | "ENTERPRISE">("PRO");
  const [formValidityMonths, setFormValidityMonths] = useState<number>(12);
  const [formMaxShops, setFormMaxShops] = useState<number>(5);
  const [formAdminNotes, setFormAdminNotes] = useState("");

  const handleOpenProvisionModal = (lead: any) => {
    setSelectedLead(lead);
    setFormOrgName(lead.storeName || "");
    setFormOutletName(`${lead.storeName || "Store"} Main Branch`);
    setFormOwnerName(lead.ownerName || "");
    setFormOwnerEmail(lead.email || "");
    setFormPhone(lead.phone ? lead.phone.replace(/\D/g, "").slice(-10) : "");
    setFormAddress(lead.city || "");
    setFormOwnerPassword("");
    setFormConfirmPassword("");
    setFormPlan("PRO");
    setFormValidityMonths(12);
    setFormMaxShops(5);
    setFormAdminNotes(`Converted from demo request lead ${lead.id}`);
  };

  const handleProvisionFromLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (!formOrgName.trim()) {
      toast.error("Store name is required.");
      return;
    }
    if (!formOwnerName.trim()) {
      toast.error("Owner full name is required.");
      return;
    }
    if (!formOwnerEmail.trim() || !formOwnerEmail.includes("@")) {
      toast.error("A valid email is required.");
      return;
    }
    if (formPhone.trim() && formPhone.replace(/\D/g, "").length !== 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (formOwnerPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (formOwnerPassword !== formConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await provisionNewTenantStore({
        organizationName: formOrgName.trim(),
        ownerName: formOwnerName.trim(),
        ownerEmail: formOwnerEmail.trim(),
        ownerPassword: formOwnerPassword,
        phone: formPhone.trim(),
        address: formAddress.trim(),
        initialShopName: formOutletName.trim(),
        plan: formPlan,
        validityMonths: formPlan === "TRIAL" ? 0 : formValidityMonths,
        maxShops: formMaxShops,
        adminNotes: formAdminNotes.trim(),
        leadId: selectedLead.id,
      });

      if (res.success) {
        toast.success(`Store "${formOrgName.trim()}" provisioned successfully!`);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id ? { ...l, status: "APPROVED" } : l
          )
        );
        setSelectedLead(null);
      } else {
        toast.error(res.error || "Failed to provision store.");
      }
    } catch (err: any) {
      console.error("Lead provisioning error:", err);
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsProvisioning(false);
    }
  };


  const handleStatusChange = async (id: string, newStatus: any) => {
    setLoadingId(id);
    try {
      await updateDemoRequestStatus(id, newStatus);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const getWhatsAppLink = (phone: string, name: string, store: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name}, thank you for requesting 14-day access for ${store} on Optical Manager! When is a good time for a 5-minute live demo call?`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Demo Requests & Sales Lead CRM
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Store owners requesting 14-day access from landing page • Direct WhatsApp & status pipeline
          </p>
        </div>

        <div className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          Total Requests: <span className="text-white font-extrabold">{leads.length}</span>
        </div>
      </div>

      {/* Datatable */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Store & Owner Details</th>
                <th className="px-4 py-3">Phone & Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 font-bold">
                    No demo requests submitted yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-extrabold text-white block text-sm">
                        {lead.storeName}
                      </span>
                      <span className="text-slate-400 text-xs block">
                        Owner: {lead.ownerName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Requested: {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <a href={`tel:${lead.phone}`} className="text-blue-400 hover:underline block font-bold">
                        {lead.phone}
                      </a>
                      <a href={`mailto:${lead.email}`} className="text-slate-400 text-[11px] block hover:underline">
                        {lead.email}
                      </a>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-slate-300 font-bold">{lead.city || "Not Specified"}</span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <select
                        disabled={loadingId === lead.id}
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-extrabold bg-slate-950 border focus:outline-none cursor-pointer ${
                          lead.status === "PENDING"
                            ? "border-amber-500/40 text-amber-400"
                            : lead.status === "APPROVED"
                            ? "border-emerald-500/40 text-emerald-400"
                            : lead.status === "DEMO_SCHEDULED"
                            ? "border-blue-500/40 text-blue-400"
                            : "border-slate-700 text-slate-400"
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="DEMO_SCHEDULED">DEMO SCHEDULED</option>
                        <option value="APPROVED">APPROVED & PROVISIONED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.status !== "APPROVED" && (
                          <Button
                            type="button"
                            onClick={() => handleOpenProvisionModal(lead)}
                            className="h-8 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs border-none"
                          >
                            <Store className="h-3.5 w-3.5" />
                            <span>Provision Store</span>
                          </Button>
                        )}

                        <a
                          href={getWhatsAppLink(lead.phone, lead.ownerName, lead.storeName)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            className="h-8 px-3 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Demo Call
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PROVISION STORE FROM DEMO LEAD                                     */}
      {/* ========================================================================= */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-slate-800/90 rounded-2xl max-w-2xl w-full flex flex-col max-h-[92vh] text-white shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-[#090d16] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">
                    Provision Store from Demo Lead
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">
                    Pre-filled details from lead inquiry for {selectedLead.storeName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleProvisionFromLeadSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* SECTION 1: Store & Organization Details */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Store & Brand Profile
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Store / Organization Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formOrgName}
                      onChange={(e) => setFormOrgName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Main Outlet / Branch Name
                    </label>
                    <input
                      type="text"
                      value={formOutletName}
                      onChange={(e) => setFormOutletName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Store Mobile / WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">+91</span>
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) e.preventDefault();
                        }}
                        className="w-full pl-11 pr-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      City / Physical Address
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Store Owner Login Credentials */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    2. Store Owner Login Credentials
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Owner Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formOwnerName}
                      onChange={(e) => setFormOwnerName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Owner Login Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formOwnerEmail}
                      onChange={(e) => setFormOwnerEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Create Owner Password (8+ chars) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formOwnerPassword}
                        onChange={(e) => setFormOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 pl-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer border-none bg-transparent"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 pl-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer border-none bg-transparent"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Plan & Subscription Setup */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    3. Subscription Tier & Quotas
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Select Subscription Plan
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "TRIAL", name: "Trial (14d)", badge: "Free" },
                      { id: "BASIC", name: "Basic", badge: "Single" },
                      { id: "PRO", name: "Pro", badge: "Multi-store" },
                      { id: "ENTERPRISE", name: "Enterprise", badge: "Unlimited" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFormPlan(p.id as any);
                          if (p.id === "TRIAL") setFormValidityMonths(0);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          formPlan === p.id
                            ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                            : "bg-[#070b13] border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-bold block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-500 block">{p.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formPlan !== "TRIAL" && (
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Validity Duration
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { m: 1, label: "1 Mo" },
                          { m: 3, label: "3 Mos" },
                          { m: 6, label: "6 Mos" },
                          { m: 12, label: "1 Year" },
                        ].map((item) => (
                          <button
                            key={item.m}
                            type="button"
                            onClick={() => setFormValidityMonths(item.m)}
                            className={`py-2 rounded-xl text-center font-semibold border transition-all cursor-pointer text-xs ${
                              formValidityMonths === item.m
                                ? "bg-blue-600 text-white border-blue-500"
                                : "bg-[#070b13] border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Allowed Store Branches (Max Shops)
                      </label>
                      <select
                        value={formMaxShops}
                        onChange={(e) => setFormMaxShops(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={1}>1 Store Outlet</option>
                        <option value={3}>3 Store Outlets</option>
                        <option value={5}>5 Store Outlets (Recommended)</option>
                        <option value={10}>10 Store Outlets</option>
                        <option value={25}>25 Store Outlets</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Admin Payment Log & Activation Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formAdminNotes}
                    onChange={(e) => setFormAdminNotes(e.target.value)}
                    className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80 sticky bottom-0 bg-[#0d1424]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedLead(null)}
                  className="h-9 px-4 text-xs font-medium border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProvisioning}
                  className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 border-none cursor-pointer flex items-center gap-2"
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning Store...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Provision & Activate Store</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

