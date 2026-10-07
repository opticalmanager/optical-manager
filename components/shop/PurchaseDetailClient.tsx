"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Printer,
  Edit3,
  Trash2,
  Save,
  X,
  Plus,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Package,
  Layers,
  ChevronDown,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updatePurchaseAction, deletePurchaseAction } from "@/actions/purchase.actions";
import { BarcodeDesignerModal } from "@/components/shop/BarcodeDesignerModal";
import { PurchaseBulkBarcodeModal } from "@/components/shop/PurchaseBulkBarcodeModal";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";
import type { CategoryItem } from "@/services/category.service";

interface VendorInfo {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface PurchaseDetailClientProps {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  vendor: VendorInfo | null;
  categories: CategoryItem[];
  vendors: VendorInfo[];
  shopId: string;
}

export function PurchaseDetailClient({
  order,
  items: initialItems,
  vendor: initialVendor,
  categories,
  vendors,
  shopId,
}: PurchaseDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode state: "VIEW" vs "EDIT"
  const [isEditing, setIsEditing] = useState(false);

  // Editable Header State
  const [purchaseNumber, setPurchaseNumber] = useState(order.purchaseNumber);
  const [purchaseDate, setPurchaseDate] = useState(String(order.purchaseDate));
  const [vendorId, setVendorId] = useState(order.vendorId || "");
  const [vendorName, setVendorName] = useState(order.vendorName || "");
  const [vendorGstin, setVendorGstin] = useState(initialVendor?.gstin || "");
  const [taxRule, setTaxRule] = useState<"EXCLUDE" | "INCLUDE">(
    (order.taxRule as "EXCLUDE" | "INCLUDE") || "EXCLUDE"
  );
  const [taxType, setTaxType] = useState(order.taxType || "SGST_CGST");
  const [status, setStatus] = useState<"COMPLETED" | "DRAFT" | "CANCELLED">(order.status);
  const [notes, setNotes] = useState(order.notes || "");
  const [roundOff, setRoundOff] = useState(Number(order.roundOff) || 0);

  // Editable Items State
  const [items, setItems] = useState<PurchaseOrderItem[]>(initialItems);

  // Single Item Barcode Modal State
  const [singleBarcodeItem, setSingleBarcodeItem] = useState<{
    id: string;
    name: string;
    category: string;
    brand: string | null;
    model: string | null;
    sku: string | null;
    productCode?: string | null;
    price: string | null;
    quantity?: number;
  } | null>(null);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Print All Barcodes Modal State
  const [showBulkBarcodeModal, setShowBulkBarcodeModal] = useState(false);

  // Category Color Badges
  const getCategoryBadge = (cat?: string | null) => {
    switch (cat?.toUpperCase()) {
      case "FRAME":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "SUNGLASS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "OPHTHALMIC_LENS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CONTACT_LENS":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "ACCESSORY":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatCategoryName = (cat?: string | null) => {
    if (!cat) return "Generic";
    return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatINR = (val: string | number | null | undefined) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
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

  // ─── Recalculate row in edit mode ──────────────────────────────────────────
  const recalculateRow = (
    row: PurchaseOrderItem,
    field: "purchasePrice" | "basePrice" | "gstPercent" | "quantity",
    value: number
  ): PurchaseOrderItem => {
    let updated = { ...row };

    if (field === "purchasePrice") {
      updated.purchasePrice = String(value);
      const gstRate = Number(updated.gstPercent) || 0;
      const base = gstRate > 0 ? value / (1 + gstRate / 100) : value;
      updated.basePrice = String(Number(base.toFixed(2)));
    } else if (field === "basePrice") {
      updated.basePrice = String(value);
      const gstRate = Number(updated.gstPercent) || 0;
      const pCost = value * (1 + gstRate / 100);
      updated.purchasePrice = String(Number(pCost.toFixed(2)));
    } else if (field === "gstPercent") {
      updated.gstPercent = String(value);
      const base = Number(updated.basePrice) || 0;
      const pCost = base * (1 + value / 100);
      updated.purchasePrice = String(Number(pCost.toFixed(2)));
    } else if (field === "quantity") {
      updated.quantity = Math.max(1, value);
    }

    const qty = updated.quantity;
    const baseP = Number(updated.basePrice) || 0;
    const gstP = Number(updated.gstPercent) || 0;
    const pCost = Number(updated.purchasePrice) || 0;

    updated.unitPrice = updated.purchasePrice;
    updated.totalPurchasePrice = String(Number((pCost * qty).toFixed(2)));

    if (taxType === "IGST") {
      updated.igstPercent = String(gstP);
      updated.igstAmount = String(Number((baseP * (gstP / 100) * qty).toFixed(2)));
      updated.cgstPercent = "0";
      updated.cgstAmount = "0";
      updated.sgstPercent = "0";
      updated.sgstAmount = "0";
    } else {
      const halfRate = Number((gstP / 2).toFixed(2));
      const halfAmt = Number((baseP * (halfRate / 100) * qty).toFixed(2));
      updated.cgstPercent = String(halfRate);
      updated.cgstAmount = String(halfAmt);
      updated.sgstPercent = String(halfRate);
      updated.sgstAmount = String(halfAmt);
      updated.igstPercent = "0";
      updated.igstAmount = "0";
    }

    return updated;
  };

  // Summary Totals
  const calculatedTotals = useMemo(() => {
    let totalQty = 0;
    let totalBase = 0;
    let totalGst = 0;
    let totalPurch = 0;

    items.forEach((item) => {
      const q = item.quantity || 0;
      totalQty += q;
      totalBase += Number(item.basePrice) * q || 0;
      const gstAmt =
        taxType === "IGST"
          ? Number(item.igstAmount) || 0
          : (Number(item.cgstAmount) || 0) + (Number(item.sgstAmount) || 0);
      totalGst += gstAmt;
      totalPurch += Number(item.totalPurchasePrice) || 0;
    });

    const net = Number((totalPurch + roundOff).toFixed(2));
    return {
      totalQuantity: totalQty,
      totalBasePrice: totalBase,
      totalGstAmount: totalGst,
      totalPurchase: totalPurch,
      totalNetPurchase: net,
    };
  }, [items, taxType, roundOff]);

  // ─── Single Item Barcode Open ────────────────────────────────────────────
  const handleOpenSingleBarcode = (it: PurchaseOrderItem) => {
    const fallbackSku = it.category
      ? `${it.category.slice(0, 3).toUpperCase()}-GEN-00001`
      : "FRM-GEN-00001";
    setSingleBarcodeItem({
      id: it.inventoryId || it.id,
      name: it.productName,
      category: it.category || "FRAME",
      brand: null,
      model: null,
      sku: it.productCode || fallbackSku,
      productCode: it.productCode || null,
      price: it.retailPrice && Number(it.retailPrice) > 0 ? String(it.retailPrice) : String(it.purchasePrice),
      quantity: it.quantity || 1,
    });
  };

  // ─── Save Changes in Edit Mode ───────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!purchaseNumber.trim()) {
      toast.error("Invoice / Bill number is required.");
      return;
    }
    if (!vendorName.trim()) {
      toast.error("Supplier / Vendor name is required.");
      return;
    }
    if (items.length === 0) {
      toast.error("At least one product item is required.");
      return;
    }

    startTransition(async () => {
      const payload: any = {
        purchaseNumber: purchaseNumber.trim(),
        purchaseDate,
        vendorId: vendorId || undefined,
        vendorName: vendorName.trim(),
        vendorGstin: vendorGstin.trim() || undefined,
        taxRule,
        taxType,
        status,
        roundOff,
        notes: notes.trim() || undefined,
        items: items.map((it, idx) => ({
          inventoryId: it.inventoryId || undefined,
          serialNumber: idx + 1,
          productName: it.productName,
          productCode: it.productCode || undefined,
          category: it.category || undefined,
          details: it.details || undefined,
          unitPrice: Number(it.purchasePrice) || 0,
          basePrice: Number(it.basePrice) || 0,
          hsnCode: it.hsnCode || undefined,
          gstPercent: Number(it.gstPercent) || 0,
          cgstPercent: Number(it.cgstPercent) || 0,
          cgstAmount: Number(it.cgstAmount) || 0,
          sgstPercent: Number(it.sgstPercent) || 0,
          sgstAmount: Number(it.sgstAmount) || 0,
          igstPercent: Number(it.igstPercent) || 0,
          igstAmount: Number(it.igstAmount) || 0,
          purchasePrice: Number(it.purchasePrice) || 0,
          quantity: Number(it.quantity) || 1,
          totalPurchasePrice: Number(it.totalPurchasePrice) || 0,
          retailPrice: Number(it.retailPrice) || 0,
        })),
      };

      const res = await updatePurchaseAction(order.id, payload);
      if (res.success) {
        toast.success(res.message);
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  // ─── Delete Purchase ─────────────────────────────────────────────────────
  const handleDeletePurchase = () => {
    startTransition(async () => {
      const res = await deletePurchaseAction(order.id);
      if (res.success) {
        toast.success(res.message);
        setShowDeleteModal(false);
        router.push("/shop/purchases");
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-4 pb-16 select-none text-slate-800 max-w-[1400px] mx-auto animate-in fade-in duration-150">
      {/* ─── Top Navigation & Action Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/purchases"
            className="h-8.5 w-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
            title="Back to Purchase Ledger"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Purchase #{purchaseNumber}
              </h1>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide",
                  status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : status === "DRAFT"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                )}
              >
                {status}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Purchased on {formatDate(purchaseDate)} · Recorded in store inventory
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Print All Barcodes Button (Modern Vibrant Theme) */}
          <button
            onClick={() => setShowBulkBarcodeModal(true)}
            className="h-8.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Barcode className="h-4 w-4 text-blue-200" />
            <span>Print All Barcodes</span>
          </button>

          {/* Edit Mode Toggle */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-8.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                disabled={isPending}
                onClick={handleSaveEdit}
                className="h-8.5 px-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setItems(initialItems);
                  setPurchaseNumber(order.purchaseNumber);
                  setPurchaseDate(String(order.purchaseDate));
                  setVendorName(order.vendorName || "");
                  setTaxRule((order.taxRule as any) || "EXCLUDE");
                  setTaxType(order.taxType || "SGST_CGST");
                }}
                className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="h-8.5 px-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Delete Purchase"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Card 1: Vendor & Invoice Details ───────────────────────────── */}
      <Card className="p-4 border border-slate-200/80 bg-white rounded-xl shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Building2 className="h-4 w-4 text-[#2563eb]" />
            <span>Supplier & Bill Information</span>
          </div>
          {isEditing && (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              Editing Enabled
            </span>
          )}
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Vendor Name</span>
              <span className="font-bold text-slate-900 text-sm">{vendorName || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Vendor GSTIN</span>
              <span className="font-mono font-bold text-slate-800">{vendorGstin || "Unregistered"}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Invoice Number</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                {purchaseNumber}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Purchase Date</span>
              <span className="font-bold text-slate-800">{formatDate(purchaseDate)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">GST Computation</span>
              <span className="font-bold text-slate-800">
                {taxRule === "INCLUDE" ? "GST Inclusive" : "GST Exclusive"} ({taxType === "IGST" ? "IGST" : "CGST + SGST"})
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Notes / Remarks</span>
              <span className="text-slate-600 italic">{notes || "None"}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Vendor Name</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Vendor GSTIN</label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Invoice #</label>
              <input
                type="text"
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Tax Rule</label>
              <select
                value={taxRule}
                onChange={(e) => setTaxRule(e.target.value as any)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              >
                <option value="EXCLUDE">GST Exclusive</option>
                <option value="INCLUDE">GST Inclusive</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Tax Type</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              >
                <option value="SGST_CGST">CGST + SGST (Intra-State)</option>
                <option value="IGST">IGST (Inter-State)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              >
                <option value="COMPLETED">COMPLETED (Inventory Stocked)</option>
                <option value="DRAFT">DRAFT (Pending Approval)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bill remarks..."
                className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb]"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ─── Card 2: Products Inward Table (12 Columns) ─────────────────── */}
      <div className="border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#2563eb]" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Inward Products ({items.length} items)
            </span>
          </div>
          {isEditing && (
            <button
              onClick={() => {
                const newRow: PurchaseOrderItem = {
                  id: `new-${Date.now()}`,
                  purchaseOrderId: order.id,
                  inventoryId: null,
                  shopId,
                  organizationId: order.organizationId,
                  serialNumber: items.length + 1,
                  productName: "New Product",
                  productCode: "",
                  category: "FRAME",
                  details: null,
                  unitPrice: "0.00",
                  basePrice: "0.00",
                  hsnCode: "9003",
                  gstPercent: "12.00",
                  cgstPercent: "6.00",
                  cgstAmount: "0.00",
                  sgstPercent: "6.00",
                  sgstAmount: "0.00",
                  igstPercent: "0.00",
                  igstAmount: "0.00",
                  purchasePrice: "0.00",
                  quantity: 1,
                  totalPurchasePrice: "0.00",
                  retailPrice: "0.00",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                setItems((prev) => [...prev, newRow]);
              }}
              className="h-7 px-2.5 rounded-lg bg-[#2563eb] text-white text-[11px] font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add Row</span>
            </button>
          )}
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-2.5">Product &amp; Code</th>
                <th className="py-2.5 px-2 text-center w-28">Category &amp; HSN</th>
                <th className="py-2.5 px-2 text-center w-16">Qty</th>
                <th className="py-2.5 px-2.5 text-right w-36">Rate (₹)</th>
                <th className="py-2.5 px-2.5 text-right w-28">Total (₹)</th>
                <th className="py-2.5 px-2.5 text-right w-24">Retail MRP</th>
                <th className="py-2.5 px-2 text-center w-12">{isEditing ? "Del" : "Tag"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {items.map((it, idx) => {
                return (
                  <tr key={it.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. S.No */}
                    <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* 2. Product Name & Code */}
                    <td className="py-2 px-2.5 min-w-0">
                      {!isEditing ? (
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 text-xs truncate" title={it.productName}>
                            {it.productName}
                          </span>
                          {it.productCode && (
                            <span className="font-mono text-[10px] text-slate-400">
                              Code: {it.productCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Product Name"
                            value={it.productName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, productName: val } : r))
                              );
                            }}
                            className="w-full h-7 px-2 rounded border border-slate-200 bg-white font-semibold text-xs text-slate-800"
                          />
                          <input
                            type="text"
                            placeholder="Product Code / SKU"
                            value={it.productCode || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, productCode: val } : r))
                              );
                            }}
                            className="w-full h-6 px-1.5 rounded border border-slate-200 bg-white font-mono text-[11px] text-slate-700"
                          />
                        </div>
                      )}
                    </td>

                    {/* 3. Category & HSN */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {!isEditing ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              getCategoryBadge(it.category)
                            )}
                          >
                            {formatCategoryName(it.category)}
                          </span>
                          {it.hsnCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              HSN: {it.hsnCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <select
                            value={it.category || "FRAME"}
                            onChange={(e) => {
                              const catVal = e.target.value;
                              const matchedCat = categories.find((c) => c.code === catVal);
                              const gstRate = matchedCat?.igstPercent ? Number(matchedCat.igstPercent) : 12;
                              setItems((prev) =>
                                prev.map((r, i) => {
                                  if (i !== idx) return r;
                                  const updated = {
                                    ...r,
                                    category: catVal,
                                    hsnCode: matchedCat?.hsnCode || r.hsnCode,
                                    gstPercent: String(gstRate),
                                  };
                                  return recalculateRow(
                                    updated,
                                    "purchasePrice",
                                    Number(updated.purchasePrice) || 0
                                  );
                                })
                              );
                            }}
                            className="w-full h-7 px-1 rounded border border-slate-200 bg-white text-[11px] font-semibold"
                          >
                            {categories.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="HSN"
                            value={it.hsnCode || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, hsnCode: val } : r))
                              );
                            }}
                            className="w-full h-6 px-1 text-center rounded border border-slate-200 bg-white font-mono text-[10px]"
                          />
                        </div>
                      )}
                    </td>

                    {/* 4. Quantity */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {!isEditing ? (
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                          {it.quantity} pcs
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setItems((prev) =>
                              prev.map((r, i) =>
                                i === idx ? recalculateRow(r, "quantity", val) : r
                              )
                            );
                          }}
                          className="w-14 h-7 text-center rounded border border-slate-200 bg-white font-bold text-xs"
                        />
                      )}
                    </td>

                    {/* 5. Unit Rate (Purchase Cost & Base Split) */}
                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                      {!isEditing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {formatINR(it.purchasePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Base: {formatINR(it.basePrice)} · {it.gstPercent}%
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cost"
                            value={it.purchasePrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setItems((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? recalculateRow(r, "purchasePrice", val) : r
                                )
                              );
                            }}
                            className="w-20 h-7 text-right rounded border border-blue-200 bg-blue-50/30 font-bold text-xs"
                          />
                          <div className="text-[10px] text-slate-400 text-right">
                            Base: {formatINR(it.basePrice)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 6. Total Cost */}
                    <td className="py-2 px-2.5 text-right whitespace-nowrap font-extrabold text-slate-900 text-xs sm:text-sm">
                      {formatINR(it.totalPurchasePrice)}
                    </td>

                    {/* 7. Retail Price */}
                    <td className="py-2 px-2.5 text-right whitespace-nowrap font-bold text-emerald-700">
                      {!isEditing ? (
                        <span>{formatINR(it.retailPrice)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="MRP"
                          value={it.retailPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, retailPrice: val } : r))
                            );
                          }}
                          className="w-20 h-7 text-right rounded border border-slate-200 bg-white font-semibold text-xs text-emerald-700"
                        />
                      )}
                    </td>

                    {/* 8. Barcode Print / Delete Action */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {!isEditing ? (
                        <button
                          onClick={() => handleOpenSingleBarcode(it)}
                          className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-600 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                          title={`Design & Print Barcode (${it.quantity} pcs)`}
                        >
                          <Barcode className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setItems((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="h-6 w-6 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer mx-auto"
                          title="Remove item"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Card 3: Summary Totals Card ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Notes & Tax Split Details */}
        <Card className="p-4 border border-slate-200/80 bg-white rounded-xl shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              <Receipt className="h-4 w-4 text-[#2563eb]" />
              <span>Tax Breakdown & Accounting</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 mt-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold">Calculation Rule</span>
                <span className="font-bold text-slate-800">
                  {taxRule === "INCLUDE" ? "GST Inclusive Pricing" : "GST Exclusive Pricing"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold">Tax Regime</span>
                <span className="font-bold text-slate-800">
                  {taxType === "IGST" ? "Integrated GST (IGST)" : "Central + State GST (CGST + SGST)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold">Total Unit Quantity</span>
                <span className="font-bold text-slate-800">{calculatedTotals.totalQuantity} Units</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2563eb] shrink-0" />
            <span>
              All inward inventory stock movements are synced in real-time with retail catalog and cost tracking.
            </span>
          </div>
        </Card>

        {/* Right: Net Payable Summary Table */}
        <Card className="p-4 border border-slate-200/80 bg-white rounded-xl shadow-2xs space-y-2">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            Valuation Summary
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Base Price (Taxable)</span>
              <span className="font-semibold text-slate-900">{formatINR(calculatedTotals.totalBasePrice)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total GST Amount</span>
              <span className="font-semibold text-slate-900">{formatINR(calculatedTotals.totalGstAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Gross Purchase</span>
              <span className="font-semibold text-slate-900">{formatINR(calculatedTotals.totalPurchase)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Round Off Adjustment</span>
              {!isEditing ? (
                <span className="font-semibold text-slate-900">{formatINR(roundOff)}</span>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={roundOff}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                  className="w-20 h-6 text-right rounded border border-slate-200 bg-white text-xs font-semibold"
                />
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">Net Purchase Value</span>
                <span className="text-[10px] text-slate-400 font-semibold">Total supplier billed amount</span>
              </div>
              <span className="text-xl font-extrabold text-[#2563eb]">
                {formatINR(calculatedTotals.totalNetPurchase)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Single Item Barcode Designer Modal ─────────────────────────── */}
      {singleBarcodeItem && (
        <BarcodeDesignerModal
          isOpen={singleBarcodeItem !== null}
          onClose={() => setSingleBarcodeItem(null)}
          item={singleBarcodeItem}
          initialQuantity={singleBarcodeItem.quantity || 1}
        />
      )}

      {/* ─── Batch Barcode Modal ────────────────────────────────────────── */}
      {showBulkBarcodeModal && (
        <PurchaseBulkBarcodeModal
          isOpen={showBulkBarcodeModal}
          onClose={() => setShowBulkBarcodeModal(false)}
          invoiceNumber={purchaseNumber}
          products={items.map((it) => {
            const fallbackSku = it.category
              ? `${it.category.slice(0, 3).toUpperCase()}-GEN-00001`
              : "FRM-GEN-00001";
            return {
              id: it.id,
              name: it.productName,
              sku: it.productCode || fallbackSku,
              productCode: it.productCode || null,
              category: it.category || "FRAME",
              price: it.retailPrice && Number(it.retailPrice) > 0 ? String(it.retailPrice) : String(it.purchasePrice),
              quantity: it.quantity || 1,
            };
          })}
        />
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Purchase Invoice?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete bill <span className="font-bold text-slate-800">#{purchaseNumber}</span>?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-800 space-y-1">
              <p className="font-bold">Important Notice:</p>
              <p>
                If this purchase was <span className="font-bold uppercase">COMPLETED</span>, all {calculatedTotals.totalQuantity} inward product units will be automatically reversed from your shop inventory and logged as stock deduction.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setShowDeleteModal(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleDeletePurchase}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
