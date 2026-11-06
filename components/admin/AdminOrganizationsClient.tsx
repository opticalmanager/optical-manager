"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  CreditCard,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  extendSubscription, 
  toggleStoreSuspension, 
  provisionNewTenantStore, 
  exportSaaSTelemetryAction 
} from "@/services/admin.service";

interface AdminOrganizationsClientProps {
  organizations: any[];
}

type TabMode = "chains" | "subscriptions";

export default function AdminOrganizationsClient({ organizations: initialOrgs }: AdminOrganizationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState(initialOrgs);

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabMode>(
    searchParams.get("tab") === "subscriptions" ? "subscriptions" : "chains"
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get("filter") === "expiring" ? "EXPIRING" : "ALL"
  );
  const [isExporting, setIsExporting] = useState(false);

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

  // Check URL query params on mount
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsAddStoreModalOpen(true);
    }
    if (searchParams.get("tab") === "subscriptions") {
      setActiveTab("subscriptions");
    }
    if (searchParams.get("filter") === "expiring") {
      setSelectedStatus("EXPIRING");
      setActiveTab("subscriptions");
    }
  }, [searchParams]);

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    let totalOutlets = 0;
    let activeSubs = 0;
    let trials = 0;
    let expiringSoon = 0;
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    orgs.forEach((o) => {
      totalOutlets += Number(o.shopsCount || 0);
      const isSuspended = o.status === "SUSPENDED";
      const plan = (o.plan || "").toUpperCase();

      if (!isSuspended) {
        if (plan === "TRIAL") trials++;
        else activeSubs++;
      }

      if (o.currentPeriodEnd) {
        const diff = new Date(o.currentPeriodEnd).getTime() - now;
        if (diff > 0 && diff <= thirtyDays && !isSuspended) {
          expiringSoon++;
        }
      }
    });

    return { totalOutlets, activeSubs, trials, expiringSoon };
  }, [orgs]);

  // Zero-latency search and filter
  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      // Plan filter
      if (selectedPlan !== "ALL") {
        if ((org.plan || "PRO").toUpperCase() !== selectedPlan) return false;
      }

      // Status filter
      if (selectedStatus !== "ALL") {
        const isSuspended = org.status === "SUSPENDED";
        if (selectedStatus === "ACTIVE" && isSuspended) return false;
        if (selectedStatus === "SUSPENDED" && !isSuspended) return false;
        if (selectedStatus === "EXPIRING") {
          if (!org.currentPeriodEnd || isSuspended) return false;
          const diff = new Date(org.currentPeriodEnd).getTime() - Date.now();
          if (diff <= 0 || diff > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (org.name || "").toLowerCase();
      const slug = (org.slug || "").toLowerCase();
      const owner = (org.ownerName || "").toLowerCase();
      const email = (org.ownerEmail || "").toLowerCase();

      return name.includes(q) || slug.includes(q) || owner.includes(q) || email.includes(q);
    });
  }, [orgs, selectedPlan, selectedStatus, searchQuery]);

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

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await exportSaaSTelemetryAction();
      if (res?.success && res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename || "optical_manager_telemetry.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("SaaS telemetry CSV exported successfully!");
      } else {
        toast.error("Failed to export telemetry data.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV.");
    } finally {
      setIsExporting(false);
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
        toast.success(`Store "${formOrgName.trim()}" provisioned successfully! Owner credentials ready.`);
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
      } else {
        toast.error(res.error || "Failed to provision store.");
      }
    } catch (err: any) {
      console.error("Provisioning error:", err);
      toast.error(err?.message || "Failed to provision new tenant store.");
    } finally {
      setIsProvisioning(false);
    }
  };

  const computedNewEnd = useMemo(() => {
    if (!selectedOrg) return "";
    const baseDate = selectedOrg.currentPeriodEnd
      ? new Date(selectedOrg.currentPeriodEnd)
      : new Date();
    const effectiveBase = baseDate.getTime() < Date.now() ? new Date() : baseDate;
    const target = new Date(effectiveBase);
    target.setMonth(target.getMonth() + extensionMonths);
    return target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [selectedOrg, extensionMonths]);

  return (
    <div className="space-y-5 max-w-[1520px] mx-auto select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Tenant Stores &amp; Subscriptions
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-1">
            Multi-tenant B2B optical stores, branch outlets, license plans, and subscription renewal management
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-9 px-3 text-xs font-semibold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsAddStoreModalOpen(true)}
            className="h-9 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 border-none cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add New Store</span>
          </Button>
        </div>
      </div>

      {/* KPI Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#111827] border border-slate-800/80 p-3.5 rounded-xl shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL CHAINS</span>
          <div className="text-xl font-extrabold text-white mt-1">{orgs.length} Organizations</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Across Indian retail regions</span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 p-3.5 rounded-xl shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL OUTLETS</span>
          <div className="text-xl font-extrabold text-white mt-1">{telemetry.totalOutlets} Outlets</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Physical store locations</span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 p-3.5 rounded-xl shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ACTIVE PAID</span>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">{telemetry.activeSubs} Active</div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{telemetry.trials} trial accounts</span>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 p-3.5 rounded-xl shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EXPIRING SOON</span>
          <div className="text-xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
            <span>{telemetry.expiringSoon}</span>
            {telemetry.expiringSoon > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                &lt; 30 Days
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Need renewal extension</span>
        </div>
      </div>

      {/* Main Datatable Container */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Dual Tab Switcher & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]">
          {/* Left: View Tabs */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("chains")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "chains"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Tenant Chains ({orgs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "subscriptions"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Subscriptions &amp; Billing</span>
            </button>
          </div>

          {/* Right: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store, slug, owner..."
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

            {/* Plan Selector */}
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-8 px-2.5 rounded-xl text-xs bg-[#111827] border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
              <option value="PRO">PRO</option>
              <option value="BASIC">BASIC</option>
              <option value="TRIAL">TRIAL</option>
            </select>

            {/* Status Selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2.5 rounded-xl text-xs bg-[#111827] border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING">Expiring Soon (&lt; 30d)</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f172a] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-bold">Store Organization</th>
                <th className="py-2.5 px-4 font-bold">Owner Details</th>
                <th className="py-2.5 px-4 text-center font-bold">Outlets Quota</th>
                <th className="py-2.5 px-4 text-center font-bold">Plan &amp; Renewal</th>
                <th className="py-2.5 px-4 text-center font-bold">Status</th>
                <th className="py-2.5 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No organizations found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const isSuspended = org.status === "SUSPENDED";
                  const endStr = org.currentPeriodEnd
                    ? new Date(org.currentPeriodEnd).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No Expiry";

                  const isExpiring = org.currentPeriodEnd 
                    ? new Date(org.currentPeriodEnd).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && !isSuspended
                    : false;

                  return (
                    <tr 
                      key={org.id} 
                      className="hover:bg-[#162238]/60 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/admin/organizations/${org.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xs shrink-0 shadow-xs">
                            {org.name ? org.name.slice(0, 2).toUpperCase() : "OM"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors block truncate">
                              {org.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block truncate">
                              slug: {org.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-white font-medium block truncate">{org.ownerName || "Unassigned"}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{org.ownerEmail || "N/A"}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {org.shopsCount || 0} / {org.maxShops || 5} Outlets
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {org.plan || "PRO"}
                          </span>
                          <span className={`text-[10px] font-medium ${isExpiring ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                            {endStr}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isSuspended ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            SUSPENDED
                          </span>
                        ) : isExpiring ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            EXPIRING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenExtendModal(org)}
                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            Extend
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleToggleSuspension(org.id)}
                            variant="outline"
                            className={`h-7 px-2.5 text-[11px] font-medium rounded-lg cursor-pointer ${
                              isSuspended
                                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            }`}
                          >
                            {isSuspended ? "Resume" : "Suspend"}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => router.push(`/admin/organizations/${org.id}`)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-xs border-none flex items-center gap-1"
                          >
                            <span>Manage</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Extend Subscription</h2>
                <p className="text-[11px] text-slate-400 truncate">{selectedOrg.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOrg(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Select Duration</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        extensionMonths === m
                          ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                          : "bg-[#111827] text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      +{m >= 12 ? `${m/12} Yr` : `${m} Mo`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 block">Computed Expiry Date:</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5 block">
                  {computedNewEnd}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Admin Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer verified"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedOrg(null)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApplyExtension}
                  className="text-xs h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? "Extending..." : "Apply Extension"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provision Store Modal */}
      {isAddStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Provision New Tenant Store</h2>
                  <p className="text-[11px] text-slate-400">Creates organization, initial branch outlet, and primary owner account</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddStoreModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionStoreSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Store / Chain Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Punjab Opticals"
                  value={formOrgName}
                  onChange={(e) => setFormOrgName(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Main Branch Outlet Name</label>
                <input
                  type="text"
                  placeholder="e.g. Connaught Place Branch"
                  value={formOutletName}
                  onChange={(e) => setFormOutletName(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="owner@punjabopticals.com"
                  value={formOwnerEmail}
                  onChange={(e) => setFormOwnerEmail(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Min 8 chars"
                      value={formOwnerPassword}
                      onChange={(e) => setFormOwnerPassword(e.target.value)}
                      className="w-full h-8.5 px-3 pr-8 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                      minLength={8}
                      placeholder="Repeat password"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      className="w-full h-8.5 px-3 pr-8 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Plan Tier</label>
                  <select
                    value={formPlan}
                    onChange={(e: any) => setFormPlan(e.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="BASIC">BASIC</option>
                    <option value="TRIAL">TRIAL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Validity</label>
                  <select
                    value={formValidityMonths}
                    onChange={(e) => setFormValidityMonths(Number(e.target.value))}
                    className="w-full h-8.5 px-2.5 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value={12}>1 Year</option>
                    <option value={6}>6 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={1}>1 Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Max Outlets</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formMaxShops}
                    onChange={(e) => setFormMaxShops(Number(e.target.value))}
                    className="w-full h-8.5 px-2.5 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddStoreModalOpen(false)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProvisioning}
                  className="text-xs h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {isProvisioning ? "Provisioning..." : "Provision Store"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
