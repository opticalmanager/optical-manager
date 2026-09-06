"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extendSubscription, toggleStoreSuspension, addShopOutletToOrganization, deleteShopOutlet } from "@/services/admin.service";



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
  };
}

export default function OrganizationDetailClient({ data }: OrganizationDetailClientProps) {
  const router = useRouter();
  const { organization, owner, shops } = data;
  const [subscription, setSubscription] = useState(data.subscription);
  const [shopsList, setShopsList] = useState(shops);

  // Extension Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Outlet Modal state
  const [isAddOutletModalOpen, setIsAddOutletModalOpen] = useState(false);
  const [outletName, setOutletName] = useState("");
  const [outletAddress, setOutletAddress] = useState("");
  const [outletPhone, setOutletPhone] = useState("");
  const [outletEmail, setOutletEmail] = useState("");
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);

  const isSuspended = subscription.status === "SUSPENDED";

  const handleAddOutletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletName.trim()) {
      toast.error("Branch / Outlet name is required.");
      return;
    }
    if (outletPhone.trim() && outletPhone.replace(/\D/g, "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
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
      console.error("Failed to add shop outlet:", err);
      toast.error(err?.message || "Failed to add store outlet.");
    } finally {
      setIsAddingOutlet(false);
    }
  };

  // Delete Shop Modal state
  const [selectedShopForDelete, setSelectedShopForDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingShop, setIsDeletingShop] = useState(false);

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
        toast.success(`Store outlet "${selectedShopForDelete.name}" and its associated data have been permanently deleted.`);
        setSelectedShopForDelete(null);
        setDeleteConfirmText("");
      } else {
        toast.error(res.error || "Failed to delete store outlet.");
      }
    } catch (err: any) {
      console.error("Failed to delete shop:", err);
      toast.error(err?.message || "An unexpected error occurred while deleting the shop.");
    } finally {
      setIsDeletingShop(false);
    }
  };

  const handleApplyExtension = async () => {

    setIsSubmitting(true);
    try {
      const res = await extendSubscription(organization.id, extensionMonths, adminNotes);
      setSubscription((prev) => ({
        ...prev,
        currentPeriodEnd: res.newPeriodEnd,
        status: "ACTIVE",
        notes: adminNotes 
          ? `${prev.notes ? prev.notes + "\n" : ""}[${new Date().toISOString().split("T")[0]}] Added +${extensionMonths}m: ${adminNotes}`
          : prev.notes
      }));
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to extend subscription:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspension = async () => {
    try {
      const res = await toggleStoreSuspension(organization.id);
      setSubscription((prev) => ({ ...prev, status: res.newStatus }));
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  const joinedDateStr = new Date(organization.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const periodEndStr = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "N/A";

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none animate-in fade-in duration-200">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/organizations" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Tenant Stores</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-500">
          ID: {organization.id}
        </span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-[#0d1424] border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {organization.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
              isSuspended
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {subscription.status || "ACTIVE"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal flex items-center gap-2">
            <span>Slug: <strong className="text-slate-300 font-medium">{organization.slug}</strong></span>
            <span>•</span>
            <span>Joined {joinedDateStr}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Extend Subscription</span>
          </Button>

          <Button
            type="button"
            onClick={handleToggleSuspension}
            variant="outline"
            className={`h-9 px-3.5 text-xs font-medium rounded-xl cursor-pointer transition-all ${
              isSuspended
                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            {isSuspended ? "Resume Store Access" : "Pause Store Access"}
          </Button>
        </div>
      </div>

      {/* 4 Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Plan & Expiry */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Plan Tier</span>
            <CreditCard className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white uppercase">
              {subscription.plan || "PRO"}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Expires: <span className="text-slate-200 font-medium">{periodEndStr}</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Outlet Seats */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Store Outlets</span>
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {shops.length} <span className="text-xs font-normal text-slate-400">/ {subscription.maxShops || 5} Max Seats</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical branches configured
            </p>
          </div>
        </div>

        {/* Metric 3: Owner Contact */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Account Owner</span>
            <User className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white truncate">
              {owner.fullName}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {owner.email}
            </p>
          </div>
        </div>

        {/* Metric 4: Billing Cycle */}
        <div className="bg-[#0d1424] border border-slate-800/80 p-5 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Billing Frequency</span>
            <Calendar className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {subscription.billingCycle || "MONTHLY"}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              B2B SaaS Managed Account
            </p>
          </div>
        </div>
      </div>

      {/* Physical Outlets Table */}
      <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Physical Store Outlets ({shopsList.length})
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              List of configured branch locations and assigned store managers
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsAddOutletModalOpen(true)}
            className="h-8 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Store Outlet</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070b13] border-b border-slate-800/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Branch Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Branch Manager</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Joined Date</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-normal">
              {shopsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                    No physical store branches configured yet.
                  </td>
                </tr>
              ) : (
                shopsList.map((shop) => (
                  <tr key={shop.id} className="hover:bg-[#131b2e] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white block">
                        {shop.name}
                      </span>
                      {shop.phone && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-500" /> {shop.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[220px] truncate">
                      {shop.address || <span className="text-slate-500 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-200 font-medium block">{shop.managerName}</span>
                      <span className="text-slate-400 text-[11px] block">{shop.managerEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                        shop.isActive 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {shop.isActive ? "ACTIVE" : "PAUSED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {new Date(shop.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedShopForDelete(shop);
                          setDeleteConfirmText("");
                        }}
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-medium border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                        title={`Delete store outlet ${shop.name}`}
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


      {/* Admin Notes & Extension Log */}
      {subscription.notes && (
        <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white">Subscription & Payment Log History</h3>
          </div>
          <pre className="text-xs font-mono text-slate-300 bg-[#070b13] p-3.5 rounded-xl border border-slate-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {subscription.notes}
          </pre>
        </div>
      )}

      {/* Extension Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-slate-800/80 rounded-2xl p-6 max-w-md w-full space-y-5 text-white shadow-2xl">
            <div className="border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold tracking-tight">
                Extend Subscription: {organization.name}
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Select validity duration and record payment notes
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
                  Payment Log / Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g., Extended subscription +3 months after payment receipt"
                  className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
      {/* MODAL: ADD STORE OUTLET                                                   */}
      {/* ========================================================================= */}
      {isAddOutletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-slate-800/90 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Add Physical Store Outlet
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    New branch location for {organization.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOutletModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddOutletSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Branch / Outlet Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  placeholder="e.g. Phoenix Mall Branch"
                  className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Branch Mobile / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={outletPhone}
                    onChange={(e) => setOutletPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault();
                    }}
                    placeholder="9876543210"
                    className="w-full pl-11 pr-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Branch Contact Email
                </label>
                <input
                  type="email"
                  value={outletEmail}
                  onChange={(e) => setOutletEmail(e.target.value)}
                  placeholder="branch@store.com"
                  className="w-full px-3.5 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  value={outletAddress}
                  onChange={(e) => setOutletAddress(e.target.value)}
                  placeholder="e.g. Shop 24, First Floor, Phoenix Mall"
                  className="w-full p-3 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOutletModalOpen(false)}
                  className="h-8 px-3 text-xs font-medium border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingOutlet}
                  className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5"
                >
                  {isAddingOutlet ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Store Outlet</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE STORE OUTLET (REQUIRES "CONFIRM" VERIFICATION)             */}
      {/* ========================================================================= */}
      {selectedShopForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#0d1424] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Delete Store Outlet
                  </h3>
                  <p className="text-[11px] text-rose-400 font-medium">
                    Permanent data erasure for {selectedShopForDelete.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedShopForDelete(null);
                  setDeleteConfirmText("");
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Callout */}
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-200">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                This action is destructive and irreversible!
              </p>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Deleting <strong className="text-white underline">{selectedShopForDelete.name}</strong> will permanently erase all inventory stock, customer invoices, prescriptions, orders, appointments, and receipts associated <strong>ONLY with this shop outlet</strong>.
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Organization details and other shop outlets in <strong>{organization.name}</strong> will remain completely intact.
              </p>
            </div>

            {/* Confirmation Input Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Type <span className="font-mono font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">CONFIRM</span> to authorize deletion:
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className="w-full px-3.5 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 font-mono tracking-wider font-bold uppercase"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedShopForDelete(null);
                  setDeleteConfirmText("");
                }}
                className="h-8 px-3 text-xs font-medium border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={deleteConfirmText.trim().toUpperCase() !== "CONFIRM" || isDeletingShop}
                onClick={handleConfirmDeleteShop}
                className="h-8 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isDeletingShop ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Outlet...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Store Outlet</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


