"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Clock,
  IndianRupee,
  CalendarDays,
  ShoppingBag,
  PlusCircle,
  Receipt,
  Edit3,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VendorModal } from "@/components/shop/VendorModal";
import {
  toggleVendorStatusAction,
  deleteVendorAction,
} from "@/actions/vendor.actions";
import type { Vendor, VendorCategory } from "@/types";
import type {
  VendorDetailAnalytics,
  VendorOrderDetail,
} from "@/services/vendor.service";

interface VendorDetailClientProps {
  vendor: Vendor;
  analytics: VendorDetailAnalytics;
  initialOrders: VendorOrderDetail[];
  shopId: string;
  shopName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FRAMES: "Frames & Eyewear",
  LENSES: "Ophthalmic Lenses",
  CONTACT_LENSES: "Contact Lenses",
  ACCESSORIES: "Accessories",
  LAB_MACHINERY: "Machinery & Equipment",
  GENERAL: "General / Multi-Line",
};

// SVG WhatsApp Icon
function WhatsAppIcon({ className = "w-4 h-4 fill-current" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.48-.002 9.932-4.448 9.935-9.923.001-2.652-1.03-5.143-2.905-7.018C16.426 1.79 13.931.758 11.28.758c-5.478 0-9.93 4.447-9.934 9.925-.001 1.84.482 3.633 1.4 5.207L1.687 22.3l6.59-1.737zM18.82 15.09c-.317-.159-1.88-.93-2.171-1.036-.29-.105-.503-.158-.714.159-.211.318-.82 1.036-1.006 1.248-.185.213-.37.24-.688.082-1.815-.91-2.997-1.615-4.14-3.582-.28-.487.323-.452.923-1.65.1-.2.05-.375-.025-.533-.075-.16-.625-1.507-.856-2.07-.225-.544-.452-.47-.62-.478-.153-.008-.33-.008-.507-.008-.178 0-.468.067-.714.34-.246.273-.94.92-.94 2.247 0 1.327.962 2.607 1.096 2.785.134.178 1.895 2.898 4.59 4.067.64.278 1.14.444 1.53.567.644.205 1.23.176 1.693.107.518-.077 1.58-.646 1.802-1.24.22-.593.22-1.102.155-1.21-.065-.108-.24-.159-.556-.32z" />
    </svg>
  );
}

export function VendorDetailClient({
  vendor: initialVendor,
  analytics,
  initialOrders,
  shopId,
  shopName,
}: VendorDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [vendor, setVendor] = useState<Vendor>(initialVendor);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // WhatsApp Dropdown state
  const [isWaDropdownOpen, setIsWaDropdownOpen] = useState(false);
  const waDropdownRef = useRef<HTMLDivElement>(null);

  // Delete & Archive modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close WhatsApp dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (waDropdownRef.current && !waDropdownRef.current.contains(event.target as Node)) {
        setIsWaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Helper relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "No inward orders yet";
    try {
      const date = new Date(dateStr);
      const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays} days ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    } catch {
      return "";
    }
  };

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // WhatsApp Message Dispatcher
  const handleSendWhatsApp = (templateType: "INQUIRY" | "DISPATCH" | "STATEMENT" | "DIRECT") => {
    setIsWaDropdownOpen(false);
    const cleanPhone = vendor.phone?.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please add a valid 10-digit phone number for this vendor to send WhatsApp messages.");
      return;
    }

    const contactName = vendor.contactPerson || vendor.name;
    let message = "";

    switch (templateType) {
      case "INQUIRY":
        message = `Hello ${contactName}, this is ${shopName}. We would like to inquire about your latest stock availability, catalogs, and new frame/lens pricing. Kindly share details.`;
        break;
      case "DISPATCH":
        message = `Hello ${contactName}, this is ${shopName}. We are checking on the dispatch and delivery status of our recent purchase order. Please provide the tracking or dispatch details.`;
        break;
      case "STATEMENT":
        message = `Hello ${contactName}, this is ${shopName}. Could you please send our updated account statement and ledger balance for our accounts reconciliation?`;
        break;
      case "DIRECT":
      default:
        message = `Hello ${contactName}, this is ${shopName} regarding our optical inventory supply.`;
        break;
    }

    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodedMsg}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Archive / Reactivate Handler
  const handleToggleArchive = () => {
    startTransition(async () => {
      const newStatus = !vendor.isActive;
      const res = await toggleVendorStatusAction(vendor.id, newStatus);
      if (res.success && res.vendor) {
        setVendor(res.vendor);
        toast.success(res.message);
      } else {
        toast.error(res.message || "Failed to update vendor status");
      }
    });
  };

  // Delete Handler
  const handleDeleteVendor = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteVendorAction(vendor.id);
      if (res.success) {
        toast.success(res.message);
        router.push("/shop/purchases/vendors");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("An error occurred while deleting the vendor.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-16 select-none text-slate-800 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      {/* ─── Breadcrumb & Top Action Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/purchases/vendors"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs"
            title="Back to Vendors Directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/shop/purchases/vendors"
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Vendors
              </Link>
              <span className="text-slate-300 text-xs">/</span>
              <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                {vendor.name}
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {vendor.name}
              </h1>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {CATEGORY_LABELS[vendor.category] || "General"}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  vendor.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {vendor.isActive ? "Active" : "Archived"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WhatsApp Multi-Template Dropdown */}
          <div className="relative" ref={waDropdownRef}>
            <button
              type="button"
              onClick={() => setIsWaDropdownOpen((prev) => !prev)}
              className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200/80 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Send WhatsApp Message"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
              <span>WhatsApp</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
            </button>

            {isWaDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Quick WhatsApp Templates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("INQUIRY")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Stock &amp; Catalog Inquiry</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("DISPATCH")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Order Dispatch Status</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("STATEMENT")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Statement &amp; Ledger Request</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp("DIRECT")}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                  <span>Open Direct Chat</span>
                </button>
              </div>
            )}
          </div>

          {/* Direct Call Button */}
          {vendor.phone && (
            <a
              href={`tel:+91${vendor.phone.replace(/\D/g, "")}`}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Call Supplier"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Call</span>
            </a>
          )}

          {/* Edit Vendor Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1 text-slate-600" />
            <span>Edit</span>
          </Button>

          {/* Record Purchase Bill CTA */}
          <Link
            href={`/shop/purchases/new?vendorId=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}`}
            className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Receipt className="h-4 w-4" />
            <span>Record Bill</span>
          </Link>
        </div>
      </div>

      {/* ─── Vendor Profile & Business Information ───────────────────────── */}
      <Card className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Col 1: Contact Person & Phone */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Contact Person &amp; Phone
            </span>
            <div className="text-xs font-bold text-slate-900">
              {vendor.contactPerson || "Not specified"}
            </div>
            <div className="text-xs font-mono text-slate-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{vendor.phone || "No phone added"}</span>
            </div>
            {vendor.email && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{vendor.email}</span>
              </div>
            )}
          </div>

          {/* Col 2: Tax Identity */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tax Registration
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {vendor.gstin || "Unregistered (No GSTIN)"}
              </span>
              {vendor.gstin && (
                <button
                  type="button"
                  onClick={() => handleCopy(vendor.gstin!, "GSTIN")}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                  title="Copy GSTIN"
                >
                  {copiedField === "GSTIN" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            {vendor.panNumber && (
              <div className="text-[11px] text-slate-500 font-mono">
                PAN: <span className="font-semibold text-slate-700">{vendor.panNumber}</span>
              </div>
            )}
          </div>

          {/* Col 3: Credit Period Terms */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Credit Terms
            </span>
            <div>
              {vendor.creditPeriodDays && vendor.creditPeriodDays > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{vendor.creditPeriodDays} Days Net</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500">
                  None / Cash (Immediate)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Payment timeline from invoice date
            </p>
          </div>

          {/* Col 4: Supply Location & Address */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Location &amp; Address
            </span>
            <div className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
              {[vendor.address, vendor.city, vendor.state, vendor.pincode]
                .filter(Boolean)
                .join(", ") || "No address provided"}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Real Analytics KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Total Procurement Spend */}
        <div className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Total Spend</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight font-mono">
            {formatINR(analytics.totalSpend)}
          </div>
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 truncate">
            Total inward supply
          </p>
        </div>

        {/* KPI 2: Total Purchase Bills Count */}
        <div className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Purchase Bills</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {analytics.totalPurchaseCount}
          </div>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
            {analytics.completedCount} completed, {analytics.draftCount} draft
          </p>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Average Bill Size</span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight font-mono">
            {formatINR(analytics.averageOrderValue)}
          </div>
          <p className="text-[10px] font-semibold text-purple-600 mt-0.5 truncate">
            Average per inward purchase
          </p>
        </div>

        {/* KPI 4: Last Purchase Date */}
        <div className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">Last Inward Date</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 tracking-tight truncate">
            {formatDate(analytics.lastPurchaseDate)}
          </div>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
            {formatRelativeTime(analytics.lastPurchaseDate)}
          </p>
        </div>
      </div>

      {/* ─── Complete Purchase Order History ─────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Purchase Bills &amp; Inward Orders
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Complete inward purchase history recorded from this supplier.
            </p>
          </div>

          <Link
            href={`/shop/purchases/new?vendorId=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}`}
            className="h-8 px-3 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Inward Stock</span>
          </Link>
        </div>

        <div className="border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3 w-28">Invoice #</th>
                  <th className="py-2.5 px-3 w-32">Date</th>
                  <th className="py-2.5 px-3 text-center w-24">Items Qty</th>
                  <th className="py-2.5 px-3 w-32">Tax Mode</th>
                  <th className="py-2.5 px-4 text-right w-36">Total Value (₹)</th>
                  <th className="py-2.5 px-3 text-center w-28">Status</th>
                  <th className="py-2.5 px-3 text-right w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {initialOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="font-bold text-slate-700 text-sm">No purchase orders recorded</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        You have not recorded any inward purchase bills from {vendor.name} yet.
                      </p>
                      <Link
                        href={`/shop/purchases/new?vendorId=${vendor.id}&vendorName=${encodeURIComponent(vendor.name)}`}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Record First Purchase</span>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  initialOrders.map((order, idx) => (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/shop/purchases/${order.id}`)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* S.No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Invoice # */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {order.purchaseNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-900">
                        {formatDate(order.purchaseDate)}
                      </td>

                      {/* Items */}
                      <td className="py-2.5 px-3 text-center text-slate-700">
                        {order.totalQuantity} pcs
                      </td>

                      {/* Tax Mode */}
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="text-[11px] font-semibold">
                          {order.taxRule === "INCLUDE" ? "GST Inclusive" : "GST Exclusive"}
                        </span>
                      </td>

                      {/* Net Amount */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(order.totalNetPurchase)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                            order.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/shop/purchases/${order.id}`}
                          className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Danger Zone / Supplier Lifecycle Management ─────────────────── */}
      <Card className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 shadow-2xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Supplier Lifecycle &amp; Deletion</span>
          </h3>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage vendor archiving or permanent removal from your optical database.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-rose-100">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {vendor.isActive ? "Archive Vendor" : "Reactivate Vendor"}
            </span>
            <p className="text-[11px] text-slate-500">
              {vendor.isActive
                ? "Archiving hides the supplier from active purchase selection while preserving past purchase invoices and barcode history."
                : "Reactivate this supplier to allow recording new purchase bills."}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleArchive}
            disabled={isPending}
            className="h-8.5 px-3 text-xs font-bold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            {vendor.isActive ? (
              <>
                <Archive className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>Archive Supplier</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Reactivate Supplier</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-rose-100">
          <div>
            <span className="text-xs font-bold text-rose-700 block">
              Permanently Delete Vendor
            </span>
            <p className="text-[11px] text-slate-500">
              {analytics.totalPurchaseCount > 0
                ? `Protected: This supplier has ${analytics.totalPurchaseCount} linked purchase bills. Deletion is prevented to safeguard inventory records.`
                : "Remove this vendor record permanently from your database. This action cannot be undone."}
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="h-8.5 px-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Delete Vendor</span>
          </Button>
        </div>
      </Card>

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {analytics.totalPurchaseCount > 0
                    ? "Cannot Delete Vendor"
                    : "Delete Vendor Permanently?"}
                </h4>
                <p className="text-xs text-slate-500">
                  {vendor.name}
                </p>
              </div>
            </div>

            {analytics.totalPurchaseCount > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium leading-relaxed">
                  <strong>Stock Ledger Safeguard:</strong> This supplier has{" "}
                  <strong>{analytics.totalPurchaseCount} purchase bills</strong> recorded in your system.
                  Permanently deleting this vendor would corrupt inventory batches, barcode tracking, and GST reports.
                </div>
                <p className="text-xs text-slate-600">
                  We recommend <strong>Archiving</strong> this vendor instead. They will be hidden from new purchase forms, but all historical bills remain intact.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="h-8.5 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      handleToggleArchive();
                    }}
                    className="h-8.5 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1.5" />
                    <span>Archive Vendor Instead</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong>{vendor.name}</strong>? This vendor has no linked purchase orders and will be permanently erased.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="h-8.5 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteVendor}
                    disabled={isDeleting}
                    className="h-8.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700"
                  >
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Edit Vendor Modal ───────────────────────────────────────────── */}
      <VendorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        vendorToEdit={vendor}
        onSuccess={(updated) => {
          setVendor(updated);
          setIsEditModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
