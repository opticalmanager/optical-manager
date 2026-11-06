"use client";

import React, { useState, useMemo } from "react";
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
  Plus,
  Search,
  MapPin,
  Check,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateDemoRequestStatus, provisionNewTenantStore } from "@/services/admin.service";

interface AdminLeadsClientProps {
  leads: any[];
}

type LeadStatusFilter = "ALL" | "PENDING" | "CONTACTED" | "DEMO_SCHEDULED" | "APPROVED" | "REJECTED";

export default function AdminLeadsClient({ leads: initialLeads }: AdminLeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<LeadStatusFilter>("ALL");

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

  // Counts by status
  const statusCounts = useMemo(() => {
    let pending = 0;
    let contacted = 0;
    let demo = 0;
    let approved = 0;
    let rejected = 0;

    leads.forEach((l) => {
      if (l.status === "PENDING") pending++;
      else if (l.status === "CONTACTED") contacted++;
      else if (l.status === "DEMO_SCHEDULED") demo++;
      else if (l.status === "APPROVED") approved++;
      else if (l.status === "REJECTED") rejected++;
    });

    return { pending, contacted, demo, approved, rejected };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedStatus !== "ALL" && lead.status !== selectedStatus) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const store = (lead.storeName || "").toLowerCase();
      const owner = (lead.ownerName || "").toLowerCase();
      const phone = (lead.phone || "").toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const city = (lead.city || "").toLowerCase();

      return store.includes(q) || owner.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q);
    });
  }, [leads, selectedStatus, searchQuery]);

  const handleStatusChange = async (leadId: string, newStatus: any) => {
    setLoadingId(leadId);
    try {
      const res = await updateDemoRequestStatus(leadId, newStatus);
      if (res?.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        toast.success(`Lead status updated to ${newStatus}`);
      } else {
        toast.error("Failed to update lead status.");
      }
    } catch (err: any) {
      console.error("Error updating lead status:", err);
      toast.error(err?.message || "An error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

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
      });

      if (res.success) {
        await updateDemoRequestStatus(selectedLead.id, "APPROVED");
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedLead.id ? { ...l, status: "APPROVED" } : l))
        );
        toast.success(`Store "${formOrgName.trim()}" provisioned successfully! Owner account created.`);
        setSelectedLead(null);
      } else {
        toast.error(res.error || "Failed to provision store.");
      }
    } catch (err: any) {
      console.error("Provisioning error:", err);
      toast.error(err?.message || "Failed to provision store from lead.");
    } finally {
      setIsProvisioning(false);
    }
  };

  const getWhatsAppLink = (phone: string, name: string, store: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name}, thank you for requesting access for ${store} on Optical Manager! When is a convenient time for a 5-minute walkthrough demo?`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  return (
    <div className="space-y-5 max-w-[1520px] mx-auto select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Demo Requests & Inbound Leads
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-1">
            Store owners requesting demo access from opticalmanager.in • Direct WhatsApp demo & 1-click provisioning
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-[#0f172a] px-3.5 py-2 rounded-xl border border-slate-800">
          <span>Total Inbound Leads:</span>
          <span className="text-white font-bold font-mono text-sm">{leads.length}</span>
        </div>
      </div>

      {/* Main Datatable Container */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Status Tabs & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedStatus === "ALL"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Leads ({leads.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedStatus === "PENDING"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Pending</span>
              {statusCounts.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {statusCounts.pending}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("CONTACTED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedStatus === "CONTACTED"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Contacted ({statusCounts.contacted})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("DEMO_SCHEDULED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedStatus === "DEMO_SCHEDULED"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Demo Scheduled ({statusCounts.demo})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("APPROVED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedStatus === "APPROVED"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Approved ({statusCounts.approved})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by store, owner, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f172a] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-bold">Store & Owner Details</th>
                <th className="py-2.5 px-4 font-bold">Phone & Email</th>
                <th className="py-2.5 px-4 font-bold">City / Location</th>
                <th className="py-2.5 px-4 text-center font-bold">Pipeline Status</th>
                <th className="py-2.5 px-4 text-right font-bold">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-300">No demo requests found.</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting the status filter or search keyword.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const reqDate = lead.createdAt
                    ? new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Recent";

                  return (
                    <tr key={lead.id} className="hover:bg-[#162032] transition-colors">
                      {/* Store & Owner */}
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-white text-xs block">
                          {lead.storeName}
                        </span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          Owner: <strong className="text-slate-300 font-semibold">{lead.ownerName}</strong>
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Requested: {reqDate}
                        </span>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-2.5 px-4">
                        <a 
                          href={`tel:${lead.phone}`} 
                          className="text-blue-400 hover:underline font-mono text-xs font-semibold block"
                        >
                          {lead.phone}
                        </a>
                        <a 
                          href={`mailto:${lead.email}`} 
                          className="text-slate-400 hover:text-blue-400 text-[11px] block truncate transition-colors mt-0.5"
                        >
                          {lead.email}
                        </a>
                      </td>

                      {/* City */}
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-300 text-xs font-medium">
                          <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>{lead.city || "Not Specified"}</span>
                        </span>
                      </td>

                      {/* Pipeline Status Select */}
                      <td className="py-2.5 px-4 text-center">
                        <select
                          disabled={loadingId === lead.id}
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold uppercase border focus:outline-none cursor-pointer bg-[#0f172a] ${
                            lead.status === "PENDING"
                              ? "border-amber-500/40 text-amber-400"
                              : lead.status === "APPROVED"
                              ? "border-emerald-500/40 text-emerald-400"
                              : lead.status === "DEMO_SCHEDULED"
                              ? "border-blue-500/40 text-blue-400"
                              : lead.status === "CONTACTED"
                              ? "border-indigo-500/40 text-indigo-400"
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

                      {/* Quick Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "APPROVED" && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenProvisionModal(lead)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-xs border-none"
                            >
                              <Store className="h-3 w-3" />
                              <span>Provision Store</span>
                            </Button>
                          )}

                          <a
                            href={getWhatsAppLink(lead.phone, lead.ownerName, lead.storeName)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer inline-flex items-center gap-1 shadow-xs border-none"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d1527] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Showing {filteredLeads.length} of {leads.length} demo request leads</span>
          <span className="font-medium text-slate-500">Inbound Organic & Paid Marketing Pipeline</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PROVISION STORE FROM DEMO LEAD                                     */}
      {/* ========================================================================= */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-xl w-full text-white shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Convert Lead to Provisioned Store</h3>
                  <p className="text-[11px] text-slate-400">Pre-filled with lead details from {selectedLead.storeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleProvisionFromLeadSubmit} className="p-5 space-y-4">
              {/* Store details */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block border-b border-slate-800/80 pb-1">
                  1. Store Organization & Initial Branch
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Store / Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={formOrgName}
                      onChange={(e) => setFormOrgName(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Initial Outlet Name</label>
                    <input
                      type="text"
                      value={formOutletName}
                      onChange={(e) => setFormOutletName(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Phone Number (10 Digits)</label>
                    <input
                      type="text"
                      maxLength={10}
                      inputMode="numeric"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">City / Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Credentials */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block border-b border-slate-800/80 pb-1">
                  2. Store Owner Login Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formOwnerName}
                      onChange={(e) => setFormOwnerName(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={formOwnerEmail}
                      onChange={(e) => setFormOwnerEmail(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Password * (Min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={formOwnerPassword}
                        onChange={(e) => setFormOwnerPassword(e.target.value)}
                        className="w-full h-8 pl-3 pr-8 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        className="w-full h-8 pl-3 pr-8 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan settings */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 block border-b border-slate-800/80 pb-1">
                  3. Plan & Validity
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Plan</label>
                    <select
                      value={formPlan}
                      onChange={(e) => setFormPlan(e.target.value as any)}
                      className="w-full h-8 px-2.5 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white font-bold cursor-pointer"
                    >
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                      <option value="TRIAL">TRIAL (14 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Validity (Months)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      disabled={formPlan === "TRIAL"}
                      value={formValidityMonths}
                      onChange={(e) => setFormValidityMonths(parseInt(e.target.value) || 12)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Max Outlets Quota</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formMaxShops}
                      onChange={(e) => setFormMaxShops(parseInt(e.target.value) || 5)}
                      className="w-full h-8 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                  className="h-8 px-3 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isProvisioning}
                  className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5"
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Store className="h-3.5 w-3.5" />
                      <span>Approve & Provision Store</span>
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
