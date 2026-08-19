"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Receipt,
  ExternalLink,
  User,
  Phone,
  Calendar,
  Store,
  CreditCard,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Check,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Wrench,
  Truck,
  Trash2,
  Eye,
  AlertCircle
} from "lucide-react";
import { submitReturnAction } from "@/actions/return.actions";

interface InvoiceItemProduct {
  id: string;
  invoiceId: string;
  inventoryId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  imageUrl: string | null;
  alreadyReturned: number;
  remainingReturnable: number;
  isFullyReturned: boolean;
}

interface InvoiceDetail {
  id: string;
  shopId: string;
  invoiceNumber: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  fulfillmentStatus: string;
  amountPaid: string;
  balanceDue: string;
  createdAt: Date;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  shopName: string;
  shopAddress: string | null;
  items: InvoiceItemProduct[];
}

type InspectionReasonType =
  | "LOOKS_NEW"
  | "MINOR_WEAR"
  | "DAMAGED"
  | "WRONG_PRODUCT"
  | "MANUFACTURING_DEFECT"
  | "WARRANTY_CLAIM";

type FinalActionType =
  | "RESTOCK_INVENTORY"
  | "REPAIR_AT_STORE"
  | "SEND_TO_VENDOR"
  | "SCRAP_DAMAGE"
  | "HOLD_FOR_INSPECTION";

interface SelectedReturnItemState {
  invoiceItemId: string;
  inventoryId: string | null;
  description: string;
  quantityReturned: number;
  maxReturnable: number;
  unitPrice: number;
  refundAmount: number;
  inspectionReason: InspectionReasonType;
  finalAction: FinalActionType;
}


const inspectionReasons: { id: InspectionReasonType; title: string; desc: string }[] = [
  { id: "LOOKS_NEW", title: "Looks New", desc: "Product is in perfect condition" },
  { id: "MINOR_WEAR", title: "Minor Wear", desc: "Slight signs of usage" },
  { id: "DAMAGED", title: "Damaged", desc: "Product is damaged / broken" },
  { id: "WRONG_PRODUCT", title: "Wrong Product", desc: "Incorrect product delivered" },
  { id: "MANUFACTURING_DEFECT", title: "Manufacturing Defect", desc: "Issue from manufacturing" },
  { id: "WARRANTY_CLAIM", title: "Warranty Claim", desc: "Under warranty claim" },
];

const finalActions: {
  id: FinalActionType;
  title: string;
  desc: string;
  colorClass: string;
  iconBg: string;
  iconColor: string;
  borderClass: string;
  icon: any;
}[] = [
  {
    id: "RESTOCK_INVENTORY",
    title: "Restock Inventory",
    desc: "Product can be sold again. Add back to inventory.",
    colorClass: "hover:border-emerald-400 bg-emerald-50/10",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    borderClass: "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20",
    icon: Store,
  },
  {
    id: "REPAIR_AT_STORE",
    title: "Repair at Store",
    desc: "Needs repair or service at store before restocking.",
    colorClass: "hover:border-amber-400 bg-amber-50/10",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    borderClass: "border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20",
    icon: Wrench,
  },
  {
    id: "SEND_TO_VENDOR",
    title: "Send to Vendor",
    desc: "For warranty claim or replacement from vendor.",
    colorClass: "hover:border-blue-400 bg-blue-50/10",
    iconBg: "bg-blue-600",
    iconColor: "text-white",
    borderClass: "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20",
    icon: Truck,
  },
  {
    id: "SCRAP_DAMAGE",
    title: "Scrap / Damage",
    desc: "Product is beyond repair. Do not add to inventory.",
    colorClass: "hover:border-rose-400 bg-rose-50/10",
    iconBg: "bg-rose-500",
    iconColor: "text-white",
    borderClass: "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20",
    icon: Trash2,
  },
  {
    id: "HOLD_FOR_INSPECTION",
    title: "Hold for Inspection",
    desc: "Requires manager approval or further inspection.",
    colorClass: "hover:border-purple-400 bg-purple-50/10",
    iconBg: "bg-purple-600",
    iconColor: "text-white",
    borderClass: "border-purple-600 bg-purple-50/20 ring-2 ring-purple-600/20",
    icon: Eye,
  },
];

export function NewReturnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchByPhone, setSearchByPhone] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Return Flow States
  const [returnType, setReturnType] = useState<"SELECTED_PRODUCTS" | "ENTIRE_INVOICE">("SELECTED_PRODUCTS");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  // Selected item being configured (for SELECTED_PRODUCTS mode)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Map of configured return items: itemId -> item details
  const [configuredItems, setConfiguredItems] = useState<Record<string, SelectedReturnItemState>>({});

  // Active form selections for currently selected item
  const [activeQty, setActiveQty] = useState<number>(1);
  const [activeReason, setActiveReason] = useState<InspectionReasonType>("DAMAGED");
  const [activeAction, setActiveAction] = useState<FinalActionType>("RESTOCK_INVENTORY");
  const [staffNotes, setStaffNotes] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-fill invoice if passed via URL param (?invoiceId=xxx or ?invoiceNumber=xxx)
  useEffect(() => {
    const invId = searchParams.get("invoiceId");
    const invNum = searchParams.get("invoiceNumber");
    if (invId) {
      fetchInvoiceById(invId);
    } else if (invNum) {
      setSearchQuery(invNum);
      handleSearchInvoice(invNum);
    }
  }, [searchParams]);

  // Debounced autocomplete search
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/returns/search-invoices?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setAutocompleteResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectInvoiceFromDropdown = (inv: any) => {
    setSearchQuery(inv.invoiceNumber);
    setShowDropdown(false);
    fetchInvoiceById(inv.id);
  };

  const handleSearchInvoice = async (queryToUse?: string) => {
    const q = queryToUse || searchQuery;
    if (!q.trim()) {
      toast.error("Please enter an invoice number or phone number.");
      return;
    }

    setInvoiceLoading(true);
    setShowDropdown(false);
    try {
      const res = await fetch(`/api/returns/search-invoices?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          await fetchInvoiceById(data[0].id);
        } else {
          toast.error("No matching invoice found for this shop.");
        }
      } else {
        toast.error("Failed to lookup invoice.");
      }
    } catch (err) {
      console.error("Invoice search error:", err);
      toast.error("Network error while searching invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchInvoiceById = async (id: string) => {
    setInvoiceLoading(true);
    try {
      // Dynamic import / server call emulation
      const res = await fetch(`/api/returns/get-invoice?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        // Automatically select the first returnable item
        const firstReturnable = data.items?.find((i: InvoiceItemProduct) => i.remainingReturnable > 0);
        if (firstReturnable) {
          initiateItemSelection(firstReturnable, data);
        }
        toast.success(`Loaded invoice ${data.invoiceNumber}`);
      } else {
        toast.error("Could not load invoice details.");
      }
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      toast.error("Error loading invoice items.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const initiateItemSelection = (item: InvoiceItemProduct, currentInvoice?: InvoiceDetail) => {
    setSelectedItemId(item.id);
    const existing = configuredItems[item.id];
    if (existing) {
      setActiveQty(existing.quantityReturned);
      setActiveReason(existing.inspectionReason);
      setActiveAction(existing.finalAction);
    } else {
      setActiveQty(1);
      setActiveReason("DAMAGED");
      setActiveAction("RESTOCK_INVENTORY");
    }
  };

  const handleToggleItemCheckbox = (item: InvoiceItemProduct) => {
    if (item.remainingReturnable <= 0) {
      toast.error("This item has already been fully returned.");
      return;
    }

    if (selectedItemId === item.id) {
      // If clicking already selected item, keep selected or toggle
      return;
    }

    initiateItemSelection(item);
  };

  // Sync active configured item whenever activeQty, activeReason, or activeAction changes
  useEffect(() => {
    if (!invoice || !selectedItemId) return;
    const currentItem = invoice.items.find((i) => i.id === selectedItemId);
    if (!currentItem) return;

    const unitPriceNum = parseFloat(currentItem.unitPrice || "0");
    const refundAmountNum = unitPriceNum * activeQty;

    setConfiguredItems((prev) => ({
      ...prev,
      [selectedItemId]: {
        invoiceItemId: currentItem.id,
        inventoryId: currentItem.inventoryId,
        description: currentItem.description,
        quantityReturned: activeQty,
        maxReturnable: currentItem.remainingReturnable,
        unitPrice: unitPriceNum,
        refundAmount: refundAmountNum,
        inspectionReason: activeReason,
        finalAction: activeAction,
      },
    }));
  }, [selectedItemId, activeQty, activeReason, activeAction, invoice]);

  // Handle return type change (Selected Products vs Entire Invoice)
  const handleReturnTypeChange = (type: "SELECTED_PRODUCTS" | "ENTIRE_INVOICE") => {
    setReturnType(type);
    if (type === "ENTIRE_INVOICE" && invoice) {
      // Configure ALL returnable items automatically
      const newConfig: Record<string, SelectedReturnItemState> = {};
      invoice.items.forEach((it) => {
        if (it.remainingReturnable > 0) {
          const unitPriceNum = parseFloat(it.unitPrice || "0");
          newConfig[it.id] = {
            invoiceItemId: it.id,
            inventoryId: it.inventoryId,
            description: it.description,
            quantityReturned: it.remainingReturnable,
            maxReturnable: it.remainingReturnable,
            unitPrice: unitPriceNum,
            refundAmount: unitPriceNum * it.remainingReturnable,
            inspectionReason: "LOOKS_NEW",
            finalAction: "RESTOCK_INVENTORY",
          };
        }
      });
      setConfiguredItems(newConfig);
      toast.info("Configured all eligible invoice items for complete return.");
    }
  };

  // Stepper controls
  const handleQtyChange = (delta: number) => {
    if (!selectedItemId || !invoice) return;
    const currentItem = invoice.items.find((i) => i.id === selectedItemId);
    if (!currentItem) return;

    setActiveQty((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > currentItem.remainingReturnable) {
        toast.error(`Maximum returnable quantity is ${currentItem.remainingReturnable}`);
        return currentItem.remainingReturnable;
      }
      return next;
    });
  };

  // Submit Return Handler
  const handleSubmit = (isDraft: boolean = false) => {
    if (!invoice) {
      toast.error("Please search and select an invoice first.");
      return;
    }

    const itemsToSubmit = Object.values(configuredItems);
    if (itemsToSubmit.length === 0) {
      toast.error("Please select at least one product to return.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          invoiceId: invoice.id,
          returnType,
          items: itemsToSubmit,
          notes: staffNotes.trim() || undefined,
          isDraft,
        };

        const res = await submitReturnAction(payload);
        if (res.success && "returnNumber" in res) {
          toast.success(
            isDraft
              ? `Return draft saved: ${res.returnNumber}`
              : `Return processed successfully: ${res.returnNumber}`
          );
          router.push(`/shop/returns`);
        } else if (!res.success && "error" in res) {
          toast.error(res.error || "Failed to process return.");
        }

      } catch (err: any) {
        console.error("Submission error:", err);
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  const selectedProduct = invoice?.items.find((i) => i.id === selectedItemId);
  const totalReturnRefundSum = Object.values(configuredItems).reduce(
    (sum, it) => sum + it.refundAmount,
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 select-none text-slate-800">
      
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <Link href="/shop/dashboard" className="hover:text-slate-600">Dashboard</Link>
          <span>›</span>
          <Link href="/shop/returns" className="hover:text-slate-600">Returns</Link>
          <span>›</span>
          <span className="text-slate-800 font-bold">New Return</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Product Returns
        </h1>
      </div>

      {/* 1. Step 1: Find Invoice & Return Type Header Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* Left 2 Cols: Find Invoice Search Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-[#2563eb] text-xs font-extrabold">1</span>
              Find Invoice
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Search invoice to view purchased products
            </p>
          </div>

          <div className="relative" ref={searchContainerRef}>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchInvoice();
                    }
                  }}
                  placeholder={
                    searchByPhone
                      ? "Enter Customer Mobile Number (e.g. 9876543210)..."
                      : "Enter Invoice Number (e.g. INV-1-2026-0001)..."
                  }
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[#2563eb] animate-spin" />
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSearchInvoice()}
                disabled={invoiceLoading}
                className="h-10 px-6 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {invoiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </div>

            {/* Live Autocomplete Dropdown */}
            {showDropdown && autocompleteResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto animate-in fade-in duration-150">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching Invoices ({autocompleteResults.length})
                </div>
                {autocompleteResults.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => handleSelectInvoiceFromDropdown(inv)}
                    className="w-full text-left p-3 hover:bg-blue-50/50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-[#2563eb]">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {inv.customerName} • Phone: {inv.customerPhone || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-slate-900 block">
                        ₹{parseFloat(inv.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span>You can also search by</span>
            <button
              type="button"
              onClick={() => {
                setSearchByPhone(!searchByPhone);
                setSearchQuery("");
              }}
              className="text-[#2563eb] hover:underline font-bold cursor-pointer bg-transparent border-none p-0"
            >
              {searchByPhone ? "Invoice Number" : "Customer Mobile Number"}
            </button>
          </div>
        </div>

        {/* Right 1 Col: Return Type Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Return Type</h2>
            <RotateCcw className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-2">
            {/* Option 1: Selected Products */}
            <div
              onClick={() => handleReturnTypeChange("SELECTED_PRODUCTS")}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                returnType === "SELECTED_PRODUCTS"
                  ? "border-[#2563eb] bg-blue-50/30 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                returnType === "SELECTED_PRODUCTS" ? "border-[#2563eb]" : "border-slate-300"
              }`}>
                {returnType === "SELECTED_PRODUCTS" && (
                  <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Return Selected Product(s)
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Choose specific products from invoice
                </span>
              </div>
            </div>

            {/* Option 2: Entire Invoice */}
            <div
              onClick={() => handleReturnTypeChange("ENTIRE_INVOICE")}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                returnType === "ENTIRE_INVOICE"
                  ? "border-[#2563eb] bg-blue-50/30 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                returnType === "ENTIRE_INVOICE" ? "border-[#2563eb]" : "border-slate-300"
              }`}>
                {returnType === "ENTIRE_INVOICE" && (
                  <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Return Entire Invoice
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Return all products from this invoice
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 2: Invoice Details Header Card (Visible once invoice loaded) */}
      {invoice && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 font-black">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Invoice # {invoice.invoiceNumber}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                    {invoice.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Associated branch: <strong className="text-slate-700">{invoice.shopName}</strong>
                </p>
              </div>
            </div>

            <Link
              href={`/shop/invoices/${invoice.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shrink-0"
            >
              <span>View Invoice</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>

          {/* Invoice Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <User className="h-3 w-3" /> Customer
              </span>
              <span className="text-xs font-extrabold text-slate-900 block truncate" title={invoice.customerName}>
                {invoice.customerName}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Phone className="h-3 w-3" /> Mobile
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                {invoice.customerPhone || "N/A"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Invoice Date
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Store className="h-3 w-3" /> Store
              </span>
              <span className="text-xs font-bold text-slate-800 block truncate">
                {invoice.shopName}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment Method
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                {invoice.paymentMethod || "CASH"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Total Amount
              </span>
              <span className="text-sm font-extrabold text-[#2563eb] block">
                ₹{parseFloat(invoice.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Step 3: Products in Invoice */}
      {invoice && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-[#2563eb] text-xs font-extrabold">3</span>
              Products in Invoice
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Select the product(s) you want to return
            </p>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {invoice.items.map((item) => {
              const isSelected = selectedItemId === item.id;
              const isConfigured = !!configuredItems[item.id];
              const isFullyReturned = item.isFullyReturned;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleItemCheckbox(item)}
                  className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                    isFullyReturned
                      ? "opacity-50 border-slate-100 bg-slate-50 cursor-not-allowed"
                      : isSelected
                      ? "border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]"
                      : isConfigured
                      ? "border-emerald-400 bg-emerald-50/10 hover:border-emerald-500"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-[#2563eb] bg-[#2563eb]"
                              : isConfigured
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-slate-300"
                          }`}
                        >
                          {(isSelected || isConfigured) && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-tight">
                          {item.description}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Type</span>
                        <span className="font-semibold text-slate-700">{item.category || "General"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Specification</span>
                        <span className="font-semibold text-slate-700 truncate block">
                          {item.brand || item.model || "Standard"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Qty Sold</span>
                        <span className="font-semibold text-slate-700">{item.quantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Price</span>
                        <span className="font-extrabold text-slate-900">
                          ₹{parseFloat(item.unitPrice).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                    {isFullyReturned ? (
                      <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        Already Returned
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Returnable: {item.remainingReturnable}
                      </span>
                    )}

                    {isConfigured && (
                      <span className="text-[10px] font-extrabold text-[#2563eb]">
                        Returning: {configuredItems[item.id].quantityReturned}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Product Stepper Bar */}
          {selectedProduct && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    SELECTED PRODUCT
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {selectedProduct.description}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedProduct.category || "Product"} • Sold Qty: {selectedProduct.quantity} • Unit Price: ₹
                    {parseFloat(selectedProduct.unitPrice).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-700">Returnable Quantity:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={activeQty <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-extrabold text-slate-900">
                    {activeQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={activeQty >= selectedProduct.remainingReturnable}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-bold">
                  of {selectedProduct.remainingReturnable}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Step 4 & 5: Return Inspection Reason & Choose Final Action */}
      {invoice && selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          
          {/* Step 4: Return Inspection */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-[#2563eb] text-xs font-extrabold">4</span>
                Return Inspection
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Select the reason for return
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inspectionReasons.map((reason) => {
                const isSelected = activeReason === reason.id;
                return (
                  <div
                    key={reason.id}
                    onClick={() => setActiveReason(reason.id)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "border-[#2563eb] bg-blue-50/20 shadow-xs"
                        : "border-slate-200/80 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-[#2563eb]" : "border-slate-300"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#2563eb]" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {reason.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {reason.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 5: Choose Final Action */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-[#2563eb] text-xs font-extrabold">5</span>
                Choose Final Action
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                What would you like to do with this product?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {finalActions.map((act) => {
                const isSelected = activeAction === act.id;
                return (
                  <div
                    key={act.id}
                    onClick={() => setActiveAction(act.id)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-center gap-2.5 ${
                      isSelected ? act.borderClass : `border-slate-200/80 ${act.colorClass} bg-white`
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl ${act.iconBg} ${act.iconColor} flex items-center justify-center shadow-xs`}
                      >
                        <act.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                          {act.title}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-medium block mt-0.5 leading-tight">
                          {act.desc}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Staff Notes Textarea */}
      {invoice && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Internal Staff Remarks & Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="Add internal remarks about return condition, customer feedback, or replacement notes..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] focus:bg-white transition-all resize-none"
          />
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 sm:px-8 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/shop/returns")}
              className="h-10 px-5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer bg-white"
            >
              Cancel
            </button>

            {invoice && (
              <div className="text-xs text-slate-500 font-semibold">
                Total Refund Credit:{" "}
                <strong className="text-sm font-extrabold text-[#2563eb]">
                  ₹{totalReturnRefundSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[11px] text-slate-400 ml-1">
                  ({Object.keys(configuredItems).length} item(s) selected)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isPending || !invoice}
              className="h-10 px-5 rounded-xl border border-[#2563eb] text-[#2563eb] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 bg-white"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isPending || !invoice || Object.keys(configuredItems).length === 0}
              className="h-10 px-6 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Submit Return"
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
