"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Store, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  Plus, 
  DollarSign,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  ShieldCheck,
  KeyRound,
  Loader2,
  X,
  MapPin,
  Check,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extendSubscription, toggleStoreSuspension, provisionNewTenantStore } from "@/services/admin.service";

interface AdminOrganizationsClientProps {
  organizations: any[];
}

export default function AdminOrganizationsClient({ organizations: initialOrgs }: AdminOrganizationsClientProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrgs);

  // Extension modal state
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(1);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Provision New Store Modal State
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
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

  const handleOpenExtendModal = (org: any) => {
    setSelectedOrg(org);
    setExtensionMonths(1);
    setAdminNotes("");
  };

  const handleApplyExtension = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);

    try {
      const res = await extendSubscription(selectedOrg.id, extensionMonths, adminNotes);
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, currentPeriodEnd: res.newPeriodEnd, status: "ACTIVE" }
            : o
        )
      );
      toast.success(`Subscription extended by +${extensionMonths} month(s) for ${selectedOrg.name}`);
      setSelectedOrg(null);
    } catch (err: any) {
      console.error("Failed to extend subscription:", err);
      toast.error(err?.message || "Failed to extend subscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspension = async (orgId: string) => {
    try {
      const res = await toggleStoreSuspension(orgId);
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, status: res.newStatus } : o))
      );
      toast.success(`Store organization status updated to ${res.newStatus}`);
    } catch (err: any) {
      console.error("Failed to toggle suspension:", err);
      toast.error(err?.message || "Failed to toggle suspension.");
    }
  };

  const handleProvisionStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formOrgName.trim()) {
      toast.error("Store / Organization name is required.");
      return;
    }
    if (!formOwnerName.trim()) {
      toast.error("Owner full name is required.");
      return;
    }
    if (!formOwnerEmail.trim() || !formOwnerEmail.includes("@")) {
      toast.error("A valid owner login email is required.");
      return;
    }
    if (formPhone.trim() && formPhone.replace(/\D/g, "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (formOwnerPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
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

      if (res.success && res.organization) {
        setOrgs((prev) => [res.organization, ...prev]);
        toast.success(`Store "${formOrgName.trim()}" provisioned successfully! Owner account ready.`);
        setIsAddStoreModalOpen(false);

        // Reset fields
        setFormOrgName("");
        setFormOutletName("");
        setFormPhone("");
        setFormAddress("");
        setFormOwnerName("");
        setFormOwnerEmail("");
        setFormOwnerPassword("");
        setFormConfirmPassword("");
        setFormAdminNotes("");
        setFormPlan("PRO");
        setFormValidityMonths(12);
        setFormMaxShops(5);
      } else {
        toast.error(res.error || "Failed to provision store.");
      }
    } catch (err: any) {
      console.error("Provisioning error:", err);
      toast.error(err?.message || "An unexpected error occurred during store provisioning.");
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] p-5 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Tenant Store Organizations & Subscriptions
            </h1>
          </div>
          <p className="text-xs font-normal text-slate-400 mt-1">
            Click any row to inspect store outlets, subscription logs, and administrative controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-slate-300 bg-[#070b13] px-3.5 py-2 rounded-xl border border-slate-800/80 shrink-0">
            Total Organizations: <span className="text-white font-bold">{orgs.length}</span>
          </div>

          <Button
            type="button"
            onClick={() => setIsAddStoreModalOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 border-none cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Store</span>
          </Button>
        </div>
      </div>


      {/* Datatable */}
      <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b13] border-b border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Organization & Slug</th>
                <th className="px-4 py-3">Owner Details</th>
                <th className="px-4 py-3 text-center">Plan & Outlets</th>
                <th className="px-4 py-3 text-center">Subscription End</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Subscription Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-normal">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 font-medium">
                    No store organizations provisioned yet.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const endStr = org.currentPeriodEnd
                    ? new Date(org.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "N/A";

                  const isSuspended = org.status === "SUSPENDED";

                  return (
                    <tr 
                      key={org.id} 
                      onClick={() => router.push(`/admin/organizations/${org.id}`)}
                      className="hover:bg-[#131b2e] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white block group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Slug: {org.slug}
                        </span>
                        {org.notes && (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5 max-w-[200px] truncate" title={org.notes}>
                            Notes: {org.notes}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-slate-200 block font-medium">{org.ownerName}</span>
                        <span className="text-slate-400 text-[11px] block">{org.ownerEmail}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/20 block w-fit mx-auto mb-1">
                          {org.plan || "PRO"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          {org.shopsCount} Store Outlet(s)
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-200 font-medium block">{endStr}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                          isSuspended
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {org.status || "ACTIVE"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            onClick={() => handleOpenExtendModal(org)}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-xs border-none"
                          >
                            + Add Months
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleToggleSuspension(org.id)}
                            variant="outline"
                            className={`h-7 px-2.5 text-[11px] font-medium rounded-lg cursor-pointer ${
                              isSuspended
                                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                            }`}
                          >
                            {isSuspended ? "Resume" : "Pause"}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => router.push(`/admin/organizations/${org.id}`)}
                            variant="outline"
                            className="h-7 px-2 text-[11px] font-medium border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extension Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-6 max-w-md w-full space-y-5 text-white shadow-2xl">
            <div className="border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold tracking-tight">
                Extend Subscription: {selectedOrg.name}
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Add validity months and log manual Cash/UPI payment details
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Select Months to Add
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        extensionMonths === m
                          ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                          : "bg-[#070b13] text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      +{m} {m === 1 ? "Mo" : "Mos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Payment / Admin Log Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g., Received ₹15,000 via GPay on Jul 21"
                  className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
              <Button
                type="button"
                onClick={() => setSelectedOrg(null)}
                variant="outline"
                className="h-8 px-3 text-xs font-medium border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleApplyExtension}
                className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-sm border-none"
              >
                {isSubmitting ? "Saving..." : "Apply Extension"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROVISION NEW TENANT STORE                                         */}
      {/* ========================================================================= */}
      {isAddStoreModalOpen && (
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
                    Provision New Tenant Store
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">
                    Create retail brand organization, owner auth login credentials, and subscription.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddStoreModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleProvisionStoreSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
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
                      placeholder="e.g. Vision Care Optical"
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
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
                      placeholder="e.g. Main Showroom"
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
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
                        placeholder="9876543210"
                        className="w-full pl-11 pr-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono"
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
                      placeholder="e.g. Shop 12, MG Road, Pune"
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
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
                      placeholder="e.g. Rahul Verma"
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
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
                      placeholder="owner@store.com"
                      className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Owner Password (8+ chars) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formOwnerPassword}
                        onChange={(e) => setFormOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 pl-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono"
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
                        className="w-full pr-10 pl-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono"
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
                    placeholder="e.g. Received ₹4,999 annual payment via UPI. Approved offline."
                    className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80 sticky bottom-0 bg-[#0d1424]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddStoreModalOpen(false)}
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

