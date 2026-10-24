"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  FileSpreadsheet,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowUpRight,
  Receipt,
  Phone,
  Mail,
  MessageCircle,
  Eye,
  Edit3,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  IndianRupee,
  Glasses,
  Zap,
  MoreVertical,
  ShieldCheck,
  Archive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VendorModal } from "@/components/shop/VendorModal";
import {
  getVendorsAction,
  toggleVendorStatusAction,
} from "@/actions/vendor.actions";
import type { VendorWithStats, VendorKPIs } from "@/services/vendor.service";
import type { Vendor, VendorCategory } from "@/types";

interface VendorDirectoryClientProps {
  initialVendors: VendorWithStats[];
  initialTotalCount: number;
  kpis: VendorKPIs;
  shopId: string;
}

const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<string, string> = {
  FRAMES: "Frames & Eyewear",
  LENSES: "Ophthalmic Lenses",
  CONTACT_LENSES: "Contact Lenses",
  ACCESSORIES: "Accessories",
  LAB_MACHINERY: "Machinery",
  GENERAL: "General / Multi",
};

// Deterministic avatar colors based on string hash
const getAvatarColors = (name: string) => {
  const colors = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function VendorDirectoryClient({
  initialVendors,
  initialTotalCount,
  kpis,
  shopId,
}: VendorDirectoryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Data & Pagination states
  const [vendorsList, setVendorsList] = useState<VendorWithStats[]>(initialVendors);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [activeKpiFilter, setActiveKpiFilter] = useState<"ALL" | "FRAMES" | "LENSES">("ALL");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);

  // Copy GSTIN state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Helper currency formatter
  const formatINR = (val: string | number | null | undefined) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper date formatter
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Filter application handler
  const applyFilters = (overrides?: {
    page?: number;
    search?: string;
    category?: string;
    status?: "ACTIVE" | "INACTIVE" | "ALL";
    kpiFilter?: "ALL" | "FRAMES" | "LENSES";
  }) => {
    const targetPage = overrides?.page ?? 1;
    const search = overrides?.search !== undefined ? overrides.search : searchQuery;
    let category = overrides?.category !== undefined ? overrides.category : categoryFilter;
    const status = overrides?.status !== undefined ? overrides.status : statusFilter;
    const kpi = overrides?.kpiFilter !== undefined ? overrides.kpiFilter : activeKpiFilter;

    if (kpi === "FRAMES") {
      category = "FRAMES";
    } else if (kpi === "LENSES") {
      category = "LENSES";
    }

    startTransition(async () => {
      const res = await getVendorsAction({
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        search: search.trim() || undefined,
        category: category !== "ALL" ? category : undefined,
        status: status,
      });

      if (res.success) {
        setVendorsList(res.vendors);
        setTotalCount(res.totalCount);
        setCurrentPage(targetPage);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleKpiCardClick = (type: "ALL" | "FRAMES" | "LENSES") => {
    if (activeKpiFilter === type) {
      setActiveKpiFilter("ALL");
      setCategoryFilter("ALL");
      applyFilters({ kpiFilter: "ALL", category: "ALL", page: 1 });
    } else {
      setActiveKpiFilter(type);
      setCategoryFilter(type === "ALL" ? "ALL" : type);
      applyFilters({ kpiFilter: type, page: 1 });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ACTIVE");
    setActiveKpiFilter("ALL");
    applyFilters({ search: "", category: "ALL", status: "ACTIVE", kpiFilter: "ALL", page: 1 });
  };

  const handleCopyGstin = (e: React.MouseEvent, gstin: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gstin);
    setCopiedId(id);
    toast.success("GSTIN copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setVendorToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (vendor: VendorWithStats) => {
    const nextStatus = !vendor.isActive;
    const res = await toggleVendorStatusAction(vendor.id, nextStatus);
    if (res.success) {
      toast.success(res.message);
      setVendorsList((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, isActive: nextStatus } : v))
      );
    } else {
      toast.error(res.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (vendorsList.length === 0) {
      toast.error("No vendors to export.");
      return;
    }

    const headers = [
      "Vendor Name",
      "Category",
      "Contact Person",
      "Phone",
      "Email",
      "GSTIN",
      "PAN Number",
      "Address",
      "City",
      "State",
      "Pincode",
      "Credit Period (Days)",
      "Total Orders",
      "Total Net Purchase (INR)",
      "Last Purchase Date",
      "Status",
    ];

    const rows = vendorsList.map((v) => [
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.category}"`,
      `"${(v.contactPerson || "").replace(/"/g, '""')}"`,
      `"${v.phone || ""}"`,
      `"${v.email || ""}"`,
      `"${v.gstin || ""}"`,
      `"${v.panNumber || ""}"`,
      `"${(v.address || "").replace(/"/g, '""')}"`,
      `"${v.city || ""}"`,
      `"${v.state || ""}"`,
      `"${v.pincode || ""}"`,
      v.creditPeriodDays ?? 30,
      v.totalPurchaseCount || 0,
      v.totalPurchaseAmount || 0,
      v.lastPurchaseDate || "",
      v.isActive ? "ACTIVE" : "INACTIVE",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Optical_Vendors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Vendor directory CSV exported successfully!");
  };

  return (
    <div className="space-y-4 pb-12 select-none text-slate-800 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      {/* ─── Top Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/purchases"
            className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs"
            title="Back to Purchase Ledger"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Vendors &amp; Suppliers Directory
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] border border-blue-100">
                {totalCount} Suppliers
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Manage frame manufacturers, Rx lens labs, contact lens distributors, and payment credit terms.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 shadow-2xs hover:bg-slate-50"
            title="Export CSV"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <Link
            href="/shop/purchases"
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-2 shadow-2xs"
          >
            <span>Purchase Ledger</span>
          </Link>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Vendor</span>
          </Button>
        </div>
      </div>

      {/* ─── Top Interactive KPI Cards (Compact & Proportional) ──────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Total Active Vendors */}
        <div
          onClick={() => handleKpiCardClick("ALL")}
          className={cn(
            "py-2.5 px-3 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "ALL" && categoryFilter === "ALL"
              ? "border-2 border-[#2563eb] shadow-xs scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Active Suppliers</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {kpis.totalVendors.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
            Registered supplier partners
          </p>
        </div>

        {/* KPI 2: Total Purchase Valuation */}
        <div
          className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white transition-all duration-150 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Procurement</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight font-mono">
            {formatINR(kpis.totalValuation)}
          </div>
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 truncate">
            Total inward supply value
          </p>
        </div>

        {/* KPI 3: Frames & Eyewear Suppliers */}
        <div
          onClick={() => handleKpiCardClick("FRAMES")}
          className={cn(
            "py-2.5 px-3 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "FRAMES"
              ? "border-2 border-[#2563eb] shadow-xs scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Frames Suppliers</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Glasses className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {kpis.framesCount.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] font-semibold text-indigo-600 mt-0.5 truncate">
            Eyewear brands &amp; manufacturers
          </p>
        </div>

        {/* KPI 4: Lens Labs & Contact Lens Partners */}
        <div
          onClick={() => handleKpiCardClick("LENSES")}
          className={cn(
            "py-2.5 px-3 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "LENSES"
              ? "border-2 border-[#2563eb] shadow-xs scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Lens &amp; Contact Labs</span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {kpis.lensesCount.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] font-semibold text-purple-600 mt-0.5 truncate">
            Rx lens &amp; contact labs
          </p>
        </div>
      </div>

      {/* ─── Search & Category Filters Bar ───────────────────────────────── */}
      <Card className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by vendor name, contact person, mobile number, or GSTIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                applyFilters({ search: e.target.value, page: 1 });
              }}
              className="h-9 pl-9 text-xs rounded-xl border-slate-200 focus:border-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryFilter(val);
                setActiveKpiFilter(val === "FRAMES" ? "FRAMES" : val === "LENSES" ? "LENSES" : "ALL");
                applyFilters({ category: val, page: 1 });
              }}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-blue-500"
            >
              <option value="ALL">All Specializations</option>
              <option value="FRAMES">Frames &amp; Eyewear</option>
              <option value="LENSES">Ophthalmic Lenses</option>
              <option value="CONTACT_LENSES">Contact Lenses</option>
              <option value="ACCESSORIES">Optical Accessories</option>
              <option value="LAB_MACHINERY">Machinery &amp; Equipment</option>
              <option value="GENERAL">General / Multi-Line</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value as "ACTIVE" | "INACTIVE" | "ALL";
                setStatusFilter(val);
                applyFilters({ status: val, page: 1 });
              }}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-blue-500"
            >
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Archived Only</option>
              <option value="ALL">All Statuses</option>
            </select>

            {/* Reset Filter Button */}
            {(searchQuery || categoryFilter !== "ALL" || statusFilter !== "ACTIVE") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── High-Density Vendor Directory Table ─────────────────────────── */}
      <div className="border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                <th className="py-2.5 px-3 text-center w-8">#</th>
                <th className="py-2.5 px-4">Vendor &amp; Specialization</th>
                <th className="py-2.5 px-4">Contact &amp; Comm</th>
                <th className="py-2.5 px-4">Tax &amp; Location</th>
                <th className="py-2.5 px-3">Credit Terms</th>
                <th className="py-2.5 px-4 text-right">Procurement Value</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {vendorsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-slate-700 text-sm">No vendors found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery || categoryFilter !== "ALL"
                        ? "No inward suppliers match your search and filter criteria."
                        : "Click '+ Add Vendor' above to register your first supplier partner."}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleOpenAddModal}
                      className="mt-3.5 h-8 px-4 rounded-xl bg-[#2563eb] text-white text-xs font-bold shadow-xs hover:bg-blue-700"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                      <span>Add First Vendor</span>
                    </Button>
                  </td>
                </tr>
              ) : (
                vendorsList.map((vendor, index) => {
                  const sNo = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const avatarColor = getAvatarColors(vendor.name);
                  const initials = vendor.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={vendor.id}
                      onDoubleClick={() => router.push(`/shop/purchases/vendors/${vendor.id}`)}
                      title="Double-click to view vendor profile"
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. S.No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {sNo}
                      </td>

                      {/* 2. Vendor Identity & Category */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg ${avatarColor.bg} ${avatarColor.border} ${avatarColor.text} border font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors block text-xs leading-tight truncate">
                              {vendor.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80">
                                {CATEGORY_LABELS[vendor.category] || "General"}
                              </span>
                              {vendor.city && (
                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                  {vendor.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Contact Person & Communication Links */}
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {vendor.contactPerson && (
                            <span className="font-semibold text-slate-800 block text-xs truncate">
                              {vendor.contactPerson}
                            </span>
                          )}
                          <div>
                            {vendor.phone ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <span className="font-mono text-slate-700 text-xs">{vendor.phone}</span>
                                <a
                                  href={`https://wa.me/91${vendor.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp Chat"
                                  className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`tel:+91${vendor.phone.replace(/\D/g, "")}`}
                                  title="Direct Call"
                                  className="text-blue-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Tax Details & State */}
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div>
                          {vendor.gstin ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-slate-800 text-[11px]">
                                {vendor.gstin}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyGstin(e, vendor.gstin!, vendor.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copy GSTIN"
                              >
                                {copiedId === vendor.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          {vendor.state && (
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {vendor.state}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Credit Terms (Only displayed if set and > 0, otherwise empty) */}
                      <td className="py-2.5 px-3">
                        {vendor.creditPeriodDays && vendor.creditPeriodDays > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{vendor.creditPeriodDays} Days</span>
                          </span>
                        ) : null}
                      </td>

                      {/* 6. Procurement Statistics */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            {formatINR(vendor.totalPurchaseAmount)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 block">
                            {vendor.totalPurchaseCount} Invoices
                          </span>
                        </div>
                      </td>

                      {/* 7. Status Pill */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            vendor.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {vendor.isActive ? "Active" : "Archived"}
                        </span>
                      </td>

                      {/* 8. Action Shortcuts */}
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/shop/purchases/new?vendorId=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}`}
                            className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563eb] text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                            title="Record Purchase Bill"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(vendor)}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Vendor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Controls ────────────────────────────────────── */}
        {totalCount > PAGE_SIZE && (
          <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)} to{" "}
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} suppliers
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isPending}
                onClick={() => applyFilters({ page: currentPage - 1 })}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <span className="font-semibold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => applyFilters({ page: currentPage + 1 })}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Vendor Modal ─────────────────────────────────────── */}
      <VendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vendorToEdit={vendorToEdit}
        onSuccess={(savedVendor) => {
          // If updated existing, update state in-place
          if (vendorToEdit) {
            setVendorsList((prev) =>
              prev.map((v) =>
                v.id === savedVendor.id
                  ? { ...v, ...savedVendor, totalPurchaseCount: v.totalPurchaseCount, totalPurchaseAmount: v.totalPurchaseAmount, lastPurchaseDate: v.lastPurchaseDate }
                  : v
              )
            );
          } else {
            // New vendor created, refresh list
            applyFilters({ page: 1 });
          }
        }}
      />
    </div>
  );
}
