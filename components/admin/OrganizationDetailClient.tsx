"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, 
  Store, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  CreditCard, 
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  Plus,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Check,
  Cpu,
  TrendingUp,
  Receipt,
  DollarSign,
  ShieldCheck,
  Infinity as InfinityIcon,
  Save,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  toggleStoreSuspension, 
  addShopOutletToOrganization, 
  deleteShopOutlet 
} from "@/services/admin.service";
import { updateTenantSubscriptionAction } from "@/actions/admin-subscription.actions";
import OrganizationAddonsCard from "./OrganizationAddonsCard";
import { formatCurrency } from "@/lib/utils";

interface OrganizationDetailClientProps {
  data: {
    organization: {
      id: string;
      name: string;
      slug: string | null;
      createdAt: any;
      onboardingCompleted?: boolean;
    };
    subscription: {
      plan: string | null;
      status: string | null;
      currentPeriodStart: any;
      currentPeriodEnd: any;
      maxShops?: number;
      maxUsers?: number;
      billingCycle?: string | null;
      notes?: string | null;
    };
    owner: {
      fullName: string;
      email: string;
      createdAt: any;
    };
    shops: Array<{
      id: string;
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      isActive: boolean;
      createdAt: any;
      managerName?: string;
      managerEmail?: string;
    }>;
    billingStats?: {
      totalRevenue: number;
      totalInvoicesCount: number;
      totalPrescriptions: number;
      totalCustomers: number;
      recentInvoices: Array<{
        id: string;
        invoiceNumber: string;
        total: string;
        status: string;
        paymentMethod?: string | null;
        createdAt: any;
      }>;
    };
  };
}

type ActiveTab = "outlets" | "subscription" | "addons" | "telemetry";

export default function OrganizationDetailClient({ data }: OrganizationDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveTab) || "outlets";

  const { organization, owner, shops, billingStats } = data;
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [subscription, setSubscription] = useState(data.subscription);
  const [shopsList, setShopsList] = useState(shops);

  // ── Tab 2: Subscription Form State ──
  const [formPlan, setFormPlan] = useState<"TRIAL" | "BASIC" | "PRO" | "ENTERPRISE">(
    ((subscription.plan || "PRO").toUpperCase() as any) || "PRO"
  );
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "SUSPENDED">(
    subscription.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"
  );

  const initialExpiryDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toISOString().split("T")[0]
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const isInitiallyLifetime = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).getFullYear() >= 2090
    : false;

  const [formExpiryDate, setFormExpiryDate] = useState<string>(initialExpiryDate);
  const [formIsLifetime, setFormIsLifetime] = useState<boolean>(isInitiallyLifetime);
  const [formMaxShops, setFormMaxShops] = useState<number>(subscription.maxShops || 5);
  const [formMaxUsers, setFormMaxUsers] = useState<number>(subscription.maxUsers || 15);
  const [formBillingCycle, setFormBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    subscription.billingCycle === "MONTHLY" ? "MONTHLY" : "YEARLY"
  );

  // Payment Logging State
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [adminAuditNote, setAdminAuditNote] = useState<string>("");
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);

  // ── Outlet Modal States ──
  const [isAddOutletModalOpen, setIsAddOutletModalOpen] = useState(false);
  const [outletName, setOutletName] = useState("");
  const [outletAddress, setOutletAddress] = useState("");
  const [outletPhone, setOutletPhone] = useState("");
  const [outletEmail, setOutletEmail] = useState("");
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);

  // Delete Shop Modal State
  const [selectedShopForDelete, setSelectedShopForDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingShop, setIsDeletingShop] = useState(false);

  const isSuspended = subscription.status === "SUSPENDED";

  // Monogram initials
  const initials = (organization.name || "Store")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join("") || "OM";

  // Quick duration chip handler
  const handleAddMonths = (months: number) => {
    setFormIsLifetime(false);
    const baseDate = formExpiryDate && new Date(formExpiryDate) > new Date()
      ? new Date(formExpiryDate)
      : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + months);
    setFormExpiryDate(newEnd.toISOString().split("T")[0]);
    toast.info(`Expiry date shifted by +${months} month(s) to ${newEnd.toISOString().split("T")[0]}`);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSubscription(true);

    try {
      const res = await updateTenantSubscriptionAction({
        organizationId: organization.id,
        plan: formPlan,
        status: formStatus,
        expiryDate: formIsLifetime ? "PERPETUAL" : formExpiryDate,
        isLifetime: formIsLifetime,
        maxShops: formMaxShops,
        maxUsers: formMaxUsers,
        billingCycle: formBillingCycle,
        paymentMode: paymentAmount ? paymentMode : undefined,
        amountPaid: paymentAmount ? parseFloat(paymentAmount) : undefined,
        referenceNumber: paymentReference.trim() || undefined,
        adminNotes: adminAuditNote.trim() || undefined,
      });

      if (res.success) {
        setSubscription((prev) => ({
          ...prev,
          plan: formPlan,
          status: formStatus,
          currentPeriodEnd: res.newPeriodEnd,
          maxShops: formMaxShops,
          maxUsers: formMaxUsers,
          billingCycle: formBillingCycle,
          notes: res.updatedNotes || prev.notes,
        }));
        setPaymentAmount("");
        setPaymentReference("");
        setAdminAuditNote("");
        toast.success(`Subscription updated successfully for ${organization.name}!`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update subscription.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred.");
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleToggleSuspension = async () => {
    try {
      const res = await toggleStoreSuspension(organization.id);
      setSubscription((prev) => ({ ...prev, status: res.newStatus }));
      setFormStatus(res.newStatus as any);
      toast.success(`Store organization status updated to ${res.newStatus}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle status.");
    }
  };

  const handleAddOutletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletName.trim()) {
      toast.error("Branch / Outlet name is required.");
      return;
    }

    setIsAddingOutlet(true);
    try {
      const res = await addShopOutletToOrganization({
        organizationId: organization.id,
        name: outletName.trim(),
        address: outletAddress.trim(),
        phone: outletPhone.trim(),
        email: outletEmail.trim(),
      });

      if (res.success && res.shop) {
        setShopsList((prev) => [res.shop as any, ...prev]);
        toast.success(`Store branch "${outletName.trim()}" created successfully!`);
        setIsAddOutletModalOpen(false);
        setOutletName("");
        setOutletAddress("");
        setOutletPhone("");
        setOutletEmail("");
      } else {
        toast.error(res.error || "Failed to add store outlet.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to add store outlet.");
    } finally {
      setIsAddingOutlet(false);
    }
  };

  const handleConfirmDeleteShop = async () => {
    if (!selectedShopForDelete) return;

    if (deleteConfirmText.trim().toUpperCase() !== "CONFIRM") {
      toast.error('Please type "CONFIRM" to authorize deletion.');
      return;
    }

    setIsDeletingShop(true);
    try {
      const res = await deleteShopOutlet(selectedShopForDelete.id, organization.id);
      if (res.success) {
        setShopsList((prev) => prev.filter((s) => s.id !== selectedShopForDelete.id));
        toast.success(`Store outlet "${selectedShopForDelete.name}" deleted.`);
        setSelectedShopForDelete(null);
        setDeleteConfirmText("");
      } else {
        toast.error(res.error || "Failed to delete store outlet.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while deleting the shop.");
    } finally {
      setIsDeletingShop(false);
    }
  };

  const joinedDateStr = new Date(organization.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const isLifetimeExpiry = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).getFullYear() >= 2090 
    : false;

  const periodEndStr = isLifetimeExpiry
    ? "Lifetime Perpetual License"
    : subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "No Expiry Set";

  const daysRemaining = useMemo(() => {
    if (!subscription.currentPeriodEnd || isLifetimeExpiry) return null;
    return Math.ceil(
      (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }, [subscription.currentPeriodEnd, isLifetimeExpiry]);

  return (
    <div className="space-y-5 max-w-[1520px] mx-auto select-none animate-in fade-in duration-200">
      {/* ── Top Breadcrumb & ID ── */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/organizations" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>← Back to Tenant Stores</span>
        </Link>

        <span className="text-[10px] font-mono text-slate-500 bg-[#111827] px-2 py-1 rounded-md border border-slate-800">
          ID: {organization.id}
        </span>
      </div>

      {/* ── Main Header Banner ── */}
      <div className="bg-[#111827] border border-slate-800/80 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md border border-blue-400/20">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {organization.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isSuspended
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {subscription.status || "ACTIVE"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {subscription.plan || "PRO"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal flex flex-wrap items-center gap-2">
              <span className="font-mono bg-slate-800/80 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700/50">
                slug: {organization.slug}
              </span>
              <span>•</span>
              <span>Owner: <strong className="text-slate-300">{owner.fullName}</strong> ({owner.email})</span>
              <span>•</span>
              <span>Joined {joinedDateStr}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleToggleSuspension}
            variant="outline"
            className={`h-8.5 px-3.5 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
              isSuspended
                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            {isSuspended ? "Resume Store Access" : "Pause Store Access"}
          </Button>
        </div>
      </div>

      {/* ── De-congested 4-Tab Navigation Bar ── */}
      <div className="flex items-center gap-1.5 bg-[#111827] p-1.5 rounded-2xl border border-slate-800/80 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("outlets")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "outlets"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Outlets &amp; Branches ({shopsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subscription")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "subscription"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Subscription &amp; License Suite</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("addons")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "addons"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Add-on Modules &amp; APIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("telemetry")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "telemetry"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Live Store Telemetry</span>
        </button>
      </div>

      {/* ── TAB 1: Outlets & Branches ── */}
      {activeTab === "outlets" && (
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-400" />
                <span>Physical Store Branches ({shopsList.length} of {subscription.maxShops || 5} Max Seats)</span>
              </h2>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                Branch retail locations, contact numbers, and assigned store managers
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsAddOutletModalOpen(true)}
              className="h-8 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Store Outlet</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0f172a] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Branch Name</th>
                  <th className="py-2.5 px-4 font-bold">Address</th>
                  <th className="py-2.5 px-4 font-bold">Branch Manager</th>
                  <th className="py-2.5 px-4 text-center font-bold">Status</th>
                  <th className="py-2.5 px-4 text-center font-bold">Joined Date</th>
                  <th className="py-2.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal text-slate-300">
                {shopsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                      No physical store branches configured yet.
                    </td>
                  </tr>
                ) : (
                  shopsList.map((shop) => (
                    <tr key={shop.id} className="hover:bg-[#162032] transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-white block">
                          {shop.name}
                        </span>
                        {shop.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="h-3 w-3 text-slate-500" /> {shop.phone}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-[220px] truncate">
                        {shop.address || <span className="text-slate-500 italic">Not set</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-slate-200 font-semibold block">{shop.managerName || "Unassigned"}</span>
                        <span className="text-slate-400 text-[11px] block">{shop.managerEmail || "N/A"}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block border ${
                          shop.isActive 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {shop.isActive ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-400">
                        {new Date(shop.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedShopForDelete(shop);
                            setDeleteConfirmText("");
                          }}
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-semibold border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 rounded-lg cursor-pointer inline-flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Subscription & License Suite ── */}
      {activeTab === "subscription" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Hero License Status Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CURRENT PLAN</span>
              <div className="text-xl font-extrabold text-white mt-1 uppercase">{subscription.plan || "PRO"}</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{subscription.billingCycle || "ANNUAL"} cycle</span>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">LICENSE VALIDITY</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">{periodEndStr}</div>
              {daysRemaining !== null && (
                <span className={`text-[11px] font-bold block mt-0.5 ${
                  daysRemaining < 0 ? "text-rose-400" : daysRemaining <= 14 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {daysRemaining < 0 ? `Expired (${Math.abs(daysRemaining)}d ago)` : `${daysRemaining} days remaining`}
                </span>
              )}
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">OUTLETS QUOTA</span>
              <div className="text-xl font-extrabold text-white mt-1">{shopsList.length} / {subscription.maxShops || 5} Stores</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Physical branches allowed</span>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">STATUS</span>
              <div className="text-xl font-extrabold mt-1">
                <span className={`px-2 py-0.5 rounded text-sm ${
                  isSuspended ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                }`}>
                  {subscription.status || "ACTIVE"}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">Account access state</span>
            </div>
          </div>

          {/* Subscription & License Editor Card */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                  <span>Modify Plan, Validity &amp; Payment Records</span>
                </h2>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  Upgrade from trial to paid, set custom expiry dates, lifetime license, or log payment transactions
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-5">
              {/* 1. Plan Tier Cards */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Plan Tier Selection
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["TRIAL", "BASIC", "PRO", "ENTERPRISE"] as const).map((p) => {
                    const isSelected = formPlan === p;
                    const priceLabel = p === "TRIAL" ? "14 Days Free" : p === "BASIC" ? "₹999 / mo" : p === "PRO" ? "₹2,499 / mo" : "₹4,999 / mo";
                    return (
                      <div
                        key={p}
                        onClick={() => setFormPlan(p)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 shadow-md scale-[1.01]"
                            : "bg-[#0f172a] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{p}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono mt-1">{priceLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Status & Lifetime Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Account Access Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus("ACTIVE")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        formStatus === "ACTIVE"
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-500"
                          : "bg-[#0f172a] text-slate-400 border-slate-800"
                      }`}
                    >
                      ACTIVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus("SUSPENDED")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        formStatus === "SUSPENDED"
                          ? "bg-rose-600/20 text-rose-400 border-rose-500"
                          : "bg-[#0f172a] text-slate-400 border-slate-800"
                      }`}
                    >
                      SUSPENDED
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Perpetual / Lifetime License
                  </label>
                  <div
                    onClick={() => setFormIsLifetime(!formIsLifetime)}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      formIsLifetime
                        ? "bg-purple-600/20 text-purple-300 border-purple-500"
                        : "bg-[#0f172a] text-slate-400 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <InfinityIcon className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-bold">Lifetime Perpetual License</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      formIsLifetime ? "bg-purple-600 border-purple-500 text-white" : "border-slate-700"
                    }`}>
                      {formIsLifetime && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Validity Duration & Date Picker */}
              {!formIsLifetime && (
                <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Extend Duration or Pick Exact Expiry Date
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 3, 6, 12, 24].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleAddMonths(m)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#111827] border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white cursor-pointer"
                        >
                          +{m >= 12 ? `${m/12} Yr` : `${m} Mo`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Set Exact Expiry Date</span>
                      <input
                        type="date"
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Billing Cycle</span>
                      <select
                        value={formBillingCycle}
                        onChange={(e: any) => setFormBillingCycle(e.target.value)}
                        className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="YEARLY">ANNUAL / YEARLY</option>
                        <option value="MONTHLY">MONTHLY</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Max Store Branch Outlets Allowed
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formMaxShops}
                    onChange={(e) => setFormMaxShops(Number(e.target.value))}
                    className="w-full h-8.5 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Max Staff Users Allowed
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={formMaxUsers}
                    onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                    className="w-full h-8.5 px-3 text-xs bg-[#0f172a] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* 5. Payment Audit Log (Optional) */}
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Log Payment Transaction (Appended to Audit Ledger)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Amount Received (₹)</span>
                    <input
                      type="number"
                      placeholder="e.g. 24999"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Payment Method</span>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="NEFT/RTGS">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CARD">Credit/Debit Card</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Reference / UTR #</span>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref #4938210"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full h-8 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Admin Audit Notes</span>
                  <input
                    type="text"
                    placeholder="e.g. Annual renewal payment for Delhi branch"
                    value={adminAuditNote}
                    onChange={(e) => setAdminAuditNote(e.target.value)}
                    className="w-full h-8 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={isSavingSubscription}
                  className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingSubscription ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving License...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save License Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Chronological Audit Notes History */}
          {subscription.notes && (
            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Subscription &amp; Payment History</h3>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-[#0f172a] p-3.5 rounded-xl border border-slate-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {subscription.notes}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Add-on Modules & APIs ── */}
      {activeTab === "addons" && (
        <div className="space-y-4 animate-in fade-in">
          <OrganizationAddonsCard organizationId={organization.id} />
        </div>
      )}

      {/* ── TAB 4: Live Store Telemetry ── */}
      {activeTab === "telemetry" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL STORE GMV</span>
              <div className="text-2xl font-extrabold text-white font-mono mt-1">
                {formatCurrency(billingStats?.totalRevenue || 0)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Across all branch registers</span>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">INVOICES BILLED</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {billingStats?.totalInvoicesCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Total retail invoices cut</span>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CLINICAL PRESCRIPTIONS</span>
              <div className="text-2xl font-extrabold text-purple-400 mt-1">
                {billingStats?.totalPrescriptions || 0}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Refractions &amp; Rx records</span>
            </div>

            <div className="bg-[#111827] border border-slate-800/80 p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">REGISTERED PATIENTS</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {billingStats?.totalCustomers || 0}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Active customer profiles</span>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-400" />
                  <span>Recent Billed Invoices</span>
                </h3>
                <p className="text-xs text-slate-400">Latest retail transactions processed by this store</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0f172a] border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Invoice Number</th>
                    <th className="py-2.5 px-4 font-bold">Amount</th>
                    <th className="py-2.5 px-4 font-bold">Payment Method</th>
                    <th className="py-2.5 px-4 text-center font-bold">Status</th>
                    <th className="py-2.5 px-4 text-right font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {!billingStats?.recentInvoices || billingStats.recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                        No invoices billed yet by this store.
                      </td>
                    </tr>
                  ) : (
                    billingStats.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#162238]/60 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-extrabold text-white">
                          {formatCurrency(parseFloat(inv.total || "0"))}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {inv.paymentMethod}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-[11px]">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Outlet Modal ── */}
      {isAddOutletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Add New Store Branch</h3>
                <p className="text-[11px] text-slate-400">{organization.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddOutletModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOutletSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Extension Branch"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Branch Phone</label>
                <input
                  type="text"
                  placeholder="98XXXXXXXX"
                  value={outletPhone}
                  onChange={(e) => setOutletPhone(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Shop No, Market, City"
                  value={outletAddress}
                  onChange={(e) => setOutletAddress(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Branch Contact Email</label>
                <input
                  type="email"
                  placeholder="branch@store.com"
                  value={outletEmail}
                  onChange={(e) => setOutletEmail(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOutletModalOpen(false)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingOutlet}
                  className="text-xs h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {isAddingOutlet ? "Creating..." : "Create Branch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Shop Modal ── */}
      {selectedShopForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-5 select-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Confirm Branch Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShopForDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-300">
                Are you sure you want to delete branch <strong className="text-white font-bold">{selectedShopForDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-400">
                This will cascade-delete inventory, staff credentials, and invoices assigned specifically to this outlet.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Type <span className="font-mono text-white">CONFIRM</span> to authorize:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full h-8 px-3 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono uppercase"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedShopForDelete(null)}
                  className="text-xs h-8 px-3 rounded-xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeletingShop || deleteConfirmText.trim().toUpperCase() !== "CONFIRM"}
                  onClick={handleConfirmDeleteShop}
                  className="text-xs h-8 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  {isDeletingShop ? "Deleting..." : "Delete Branch"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
