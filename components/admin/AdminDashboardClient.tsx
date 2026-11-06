"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Store, 
  Users, 
  CreditCard, 
  DollarSign, 
  ArrowRight,
  TrendingUp,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  Building2,
  Clock,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Phone,
  Mail,
  Send,
  MessageSquare,
  Activity,
  Megaphone,
  Download,
  Eye,
  EyeOff,
  Cpu,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import AdminBroadcastModal from "./AdminBroadcastModal";
import { 
  extendSubscription, 
  toggleStoreSuspension, 
  provisionNewTenantStore,
  exportSaaSTelemetryAction 
} from "@/services/admin.service";
import { toast } from "sonner";

interface PlatformStats {
  totalOrganizations: number;
  totalShops: number;
  activeSubscriptions: number;
  pendingLeads: number;
  approvedLeads: number;
  totalPlatformRevenue: number;
  totalInvoicesCount: number;
  monthGmv: number;
  monthInvoicesCount: number;
  todayGmv: number;
  todayInvoicesCount: number;
  totalPrescriptionsCount: number;
  whatsappMessagesCount: number;
  gstinLookupsCount: number;
  totalAddonCost: number;
  expiringSubscriptionsCount: number;
  mrr: number;
  arr: number;
  planDistribution: {
    enterprise: number;
    pro: number;
    basic: number;
    trial: number;
  };
}

interface AdminDashboardClientProps {
  stats: PlatformStats;
  recentOrganizations: any[];
  expiringSubscriptions: any[];
  activityPulse: any[];
}

type FilterStatus = "ALL" | "ACTIVE" | "TRIAL" | "EXPIRING" | "SUSPENDED";

export default function AdminDashboardClient({ 
  stats, 
  recentOrganizations,
  expiringSubscriptions = [],
  activityPulse = []
}: AdminDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRenewalsView = searchParams.get("view") === "renewals";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>(isRenewalsView ? "EXPIRING" : "ALL");
  const [activeKpiKey, setActiveKpiKey] = useState<"mrr" | "stores" | "expiring" | "gmv">(isRenewalsView ? "expiring" : "stores");

  // Modals
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Store Extension Modal State
  const [selectedOrgForExtension, setSelectedOrgForExtension] = useState<any | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(1);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

  // Form state for new store
  const [formOrgName, setFormOrgName] = useState("");
  const [formOutletName, setFormOutletName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formOwnerEmail, setFormOwnerEmail] = useState("");
  const [formOwnerPassword, setFormOwnerPassword] = useState("");
  const [formPlan, setFormPlan] = useState<"TRIAL" | "BASIC" | "PRO" | "ENTERPRISE">("PRO");
  const [formValidityMonths, setFormValidityMonths] = useState<number>(12);

  // Status counts
  const statusCounts = useMemo(() => {
    let active = 0;
    let trial = 0;
    let suspended = 0;

    recentOrganizations.forEach((o) => {
      const s = (o.status || "ACTIVE").toUpperCase();
      const plan = (o.plan || "").toUpperCase();
      if (s === "SUSPENDED") {
        suspended++;
      } else if (plan === "TRIAL") {
        trial++;
      } else {
        active++;
      }
    });

    return { active, trial, suspended };
  }, [recentOrganizations]);

  // Zero-latency filtered list
  const filteredOrganizations = useMemo(() => {
    return recentOrganizations.filter((org) => {
      // 1. Status Filter
      if (selectedStatus === "ACTIVE") {
        if (org.status === "SUSPENDED" || (org.plan || "").toUpperCase() === "TRIAL") return false;
      } else if (selectedStatus === "TRIAL") {
        if ((org.plan || "").toUpperCase() !== "TRIAL") return false;
      } else if (selectedStatus === "EXPIRING") {
        const isExpiring = expiringSubscriptions.some((e) => e.organizationId === org.id);
        if (!isExpiring) return false;
      } else if (selectedStatus === "SUSPENDED") {
        if (org.status !== "SUSPENDED") return false;
      }

      // 2. Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (org.name || "").toLowerCase();
      const slug = (org.slug || "").toLowerCase();
      const owner = (org.ownerName || "").toLowerCase();
      const email = (org.ownerEmail || "").toLowerCase();

      return (
        name.includes(q) ||
        slug.includes(q) ||
        owner.includes(q) ||
        email.includes(q)
      );
    });
  }, [recentOrganizations, selectedStatus, searchQuery, expiringSubscriptions]);

  const handleKpiCardClick = (key: "mrr" | "stores" | "expiring" | "gmv") => {
    setActiveKpiKey(key);
    if (key === "stores") {
      setSelectedStatus("ALL");
    } else if (key === "mrr") {
      setSelectedStatus("ACTIVE");
    } else if (key === "expiring") {
      setSelectedStatus("EXPIRING");
    } else if (key === "gmv") {
      setSelectedStatus("ALL");
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

  const handleQuickExtendSubmit = async () => {
    if (!selectedOrgForExtension) return;
    try {
      setIsSubmittingExtension(true);
      const res = await extendSubscription(selectedOrgForExtension.id, extensionMonths, adminNotes);
      if (res?.success) {
        toast.success(`Successfully added +${extensionMonths} month(s) to ${selectedOrgForExtension.name}!`);
        setSelectedOrgForExtension(null);
        router.refresh();
      } else {
        toast.error("Failed to extend subscription.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to extend subscription.");
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  const handleProvisionStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrgName.trim() || !formOwnerName.trim() || !formOwnerEmail.trim() || !formOwnerPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsProvisioning(true);
      const res = await provisionNewTenantStore({
        organizationName: formOrgName.trim(),
        initialShopName: formOutletName.trim() || undefined,
        ownerName: formOwnerName.trim(),
        ownerEmail: formOwnerEmail.trim(),
        ownerPassword: formOwnerPassword,
        phone: formPhone.trim() || undefined,
        plan: formPlan,
        validityMonths: formValidityMonths,
      });

      if (res.success) {
        toast.success(`Store "${formOrgName.trim()}" successfully provisioned!`);
        setIsAddStoreModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to provision store.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[1520px] mx-auto select-none animate-in fade-in duration-200">
      {/* ── Top Executive Command Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                SYSTEM LIVE & SECURED
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              NEON PG LATENCY &lt; 40ms
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            B2B SaaS Multi-Tenant Infrastructure, Financial Telemetry &amp; Subscription Churn Prevention
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/leads">
            <Button 
              variant="outline"
              className="h-8.5 px-3 text-xs font-semibold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs"
            >
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Pending Leads</span>
              {stats.pendingLeads > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {stats.pendingLeads}
                </span>
              )}
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={() => setIsBroadcastOpen(true)}
            className="h-8.5 px-3 text-xs font-semibold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Megaphone className="h-3.5 w-3.5 text-purple-400" />
            <span>Broadcast</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-8.5 px-3 text-xs font-semibold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </Button>

          <Button 
            onClick={() => setIsAddStoreModalOpen(true)}
            className="h-8.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5 transition-all border-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Provision Store</span>
          </Button>
        </div>
      </div>

      {/* ── Row 1: 4 High-Density SaaS Financial & Health Cards (Rule 1 & Rule 3 Compliant) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Estimated MRR & ARR */}
        <div 
          onClick={() => handleKpiCardClick("mrr")}
          className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-lg ${
            activeKpiKey === "mrr"
              ? "border-2 border-blue-500 bg-[#162238] shadow-md scale-[1.01]"
              : "bg-[#111827] border border-slate-800/80 hover:border-slate-700/80 hover:bg-[#131d2e]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ESTIMATED MRR
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatCurrency(stats.mrr)} <span className="text-xs font-sans text-slate-400 font-semibold">/mo</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
              <span>ARR: <strong className="text-slate-300 font-mono">{formatCurrency(stats.arr)}</strong></span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {stats.planDistribution.enterprise} Ent • {stats.planDistribution.pro} Pro
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Outlets & Chains */}
        <div 
          onClick={() => handleKpiCardClick("stores")}
          className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-lg ${
            activeKpiKey === "stores"
              ? "border-2 border-blue-500 bg-[#162238] shadow-md scale-[1.01]"
              : "bg-[#111827] border border-slate-800/80 hover:border-slate-700/80 hover:bg-[#131d2e]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ACTIVE OUTLETS
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {stats.totalShops} <span className="text-xs font-semibold text-slate-400">Stores</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Across {stats.totalOrganizations} chains ({statusCounts.trial} trial accounts)
            </p>
          </div>
        </div>

        {/* Card 3: Renewals Radar (Expiring in <= 14d) */}
        <div 
          onClick={() => handleKpiCardClick("expiring")}
          className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-lg ${
            activeKpiKey === "expiring"
              ? "border-2 border-amber-500 bg-[#2b2111] shadow-md scale-[1.01]"
              : "bg-[#111827] border border-slate-800/80 hover:border-slate-700/80 hover:bg-[#131d2e]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              RENEWALS RADAR (≤ 14d)
            </span>
            <div className={`p-2 rounded-lg ${
              stats.expiringSubscriptionsCount > 0 
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{stats.expiringSubscriptionsCount}</span>
              {stats.expiringSubscriptionsCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Follow-up Due
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Healthy
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {stats.expiringSubscriptionsCount > 0 
                ? "Click to view urgent renewals"
                : "All subscriptions up to date"}
            </p>
          </div>
        </div>

        {/* Card 4: Platform Volume (GMV) */}
        <div 
          onClick={() => handleKpiCardClick("gmv")}
          className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-lg ${
            activeKpiKey === "gmv"
              ? "border-2 border-blue-500 bg-[#162238] shadow-md scale-[1.01]"
              : "bg-[#111827] border border-slate-800/80 hover:border-slate-700/80 hover:bg-[#131d2e]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PLATFORM VOLUME (GMV)
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatCurrency(stats.totalPlatformRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              This Month: <strong className="text-slate-300 font-mono">{formatCurrency(stats.monthGmv)}</strong> ({stats.monthInvoicesCount} bills)
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 2: Operational Velocity Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0d1527] p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2.5 px-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Invoices Today</span>
            <span className="text-xs font-extrabold text-white truncate block">
              {stats.todayInvoicesCount} bills ({formatCurrency(stats.todayGmv)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800/80">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Prescriptions</span>
            <span className="text-xs font-extrabold text-white truncate block">
              {stats.totalPrescriptionsCount} Clinical Rx
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800/80">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">WhatsApp Messages</span>
            <span className="text-xs font-extrabold text-white truncate block">
              {stats.whatsappMessagesCount} Dispatches
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 border-l border-slate-800/80">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">GSTIN Lookups</span>
            <span className="text-xs font-extrabold text-white truncate block">
              {stats.gstinLookupsCount} Calls ({formatCurrency(stats.totalAddonCost)})
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Expiring Subscriptions Radar (Urgent Churn Prevention) ── */}
      {expiringSubscriptions.length > 0 && (
        <div className="bg-[#1c160c] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Expiring Subscriptions Radar</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {expiringSubscriptions.length} Stores Due
                  </span>
                </h2>
                <p className="text-xs text-amber-200/70 font-normal">
                  Tenant stores expiring in the next 14 days requiring proactive follow-up or renewal
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3.5">
            {expiringSubscriptions.map((sub) => {
              const waMessage = `Hi ${sub.ownerName || "Sir/Madam"}, your Optical Manager subscription for ${sub.orgName} is due for renewal on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Please let us know if you need assistance extending your license.`;
              const cleanPhone = (sub.ownerPhone || "").replace(/[^0-9]/g, "");

              return (
                <div 
                  key={sub.id}
                  className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white truncate">{sub.orgName}</h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sub.ownerName} • {sub.ownerEmail}
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                        {sub.daysRemaining === 0 ? "Expires Today" : `${sub.daysRemaining}d left`}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>Period End: {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(waMessage)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button 
                          variant="outline" 
                          className="w-full h-7 text-[11px] font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Send className="h-3 w-3" />
                          <span>WhatsApp Reminder</span>
                        </Button>
                      </a>
                    )}
                    <Button 
                      onClick={() => {
                        setSelectedOrgForExtension({ id: sub.organizationId, name: sub.orgName });
                        setExtensionMonths(1);
                      }}
                      className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
                    >
                      Extend
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Row 4: Split Layout — Platform Activity Pulse (30%) + Tenant Chains Data Ledger (70%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Platform Activity Pulse (4 cols) */}
        <div className="lg:col-span-4 bg-[#111827] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Platform Activity Pulse</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              {activityPulse.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No recent platform events recorded yet.
                </div>
              ) : (
                activityPulse.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          item.badgeColor === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          item.badgeColor === "amber" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}>
                          {item.badge}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Audit trail auto-refreshed</span>
            <Link href="/admin/organizations" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              <span>View All Chains</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right Column: Tenant Store Chains Ledger (8 cols) */}
        <div className="lg:col-span-8 bg-[#111827] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Table Controls Header */}
          <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a]">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>Tenant Store Chains ({filteredOrganizations.length})</span>
              </h2>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                Monitoring tenant chains, physical outlets, and subscription status
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-60">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store, slug, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0d1527] flex flex-wrap items-center gap-1.5">
            {(["ALL", "ACTIVE", "TRIAL", "EXPIRING", "SUSPENDED"] as FilterStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedStatus === st
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {st === "EXPIRING" ? "EXPIRING SOON" : st}
              </button>
            ))}
          </div>

          {/* High-Density Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-[#0f172a]">
                  <th className="py-2.5 px-4">Organization Name</th>
                  <th className="py-2.5 px-4">Owner Contact</th>
                  <th className="py-2.5 px-3 text-center">Outlets</th>
                  <th className="py-2.5 px-3 text-center">Plan</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No tenant stores matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org) => {
                    const isExp = expiringSubscriptions.some((e) => e.organizationId === org.id);
                    return (
                      <tr key={org.id} className="hover:bg-[#162238]/60 transition-colors group">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-400 font-bold text-[11px] flex items-center justify-center border border-blue-500/20 shrink-0">
                              {org.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{org.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">slug: {org.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-slate-200 block truncate">{org.ownerName}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{org.ownerEmail}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {org.shopsCount ?? 1} Store(s)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {org.plan || "PRO"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isExp ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              EXPIRING
                            </span>
                          ) : org.status === "SUSPENDED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setSelectedOrgForExtension({ id: org.id, name: org.name });
                                setExtensionMonths(1);
                              }}
                              className="h-6.5 px-2 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              Extend
                            </Button>
                            <Link href={`/admin/organizations/${org.id}`}>
                              <Button
                                variant="outline"
                                className="h-6.5 px-2.5 text-[10px] font-bold border-slate-700/80 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <span>Manage</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
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
      </div>

      {/* ── Provision Store Modal ── */}
      {isAddStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none">
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

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Owner Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
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

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Plan Tier</label>
                  <select
                    value={formPlan}
                    onChange={(e: any) => setFormPlan(e.target.value)}
                    className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value="PRO">PRO (₹2,499/mo)</option>
                    <option value="ENTERPRISE">ENTERPRISE (₹4,999/mo)</option>
                    <option value="BASIC">BASIC (₹999/mo)</option>
                    <option value="TRIAL">TRIAL (14 Days Free)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Validity</label>
                  <select
                    value={formValidityMonths}
                    onChange={(e) => setFormValidityMonths(Number(e.target.value))}
                    className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value={12}>1 Year (12 Mo)</option>
                    <option value={6}>6 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={1}>1 Month</option>
                  </select>
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

      {/* ── Quick Extend Subscription Modal ── */}
      {selectedOrgForExtension && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Extend Subscription
                </h2>
                <p className="text-[11px] text-slate-400">{selectedOrgForExtension.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOrgForExtension(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Select Extension Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        extensionMonths === m
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-[#111827] text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      +{m} Mo
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Admin Audit Note</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI ref #938210"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedOrgForExtension(null)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmittingExtension}
                  onClick={handleQuickExtendSubmit}
                  className="text-xs h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {isSubmittingExtension ? "Extending..." : "Confirm Extension"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <AdminBroadcastModal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} />
    </div>
  );
}
