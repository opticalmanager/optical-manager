"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { updateFullOrderAction } from "@/actions/order.actions";
import type { OrderForEditData } from "@/services/order.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  History,
  UserCheck,
  Truck,
  Receipt,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Package,
  Check,
  Pencil,
  AlertTriangle
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export interface EditableLineItem {
  id?: string;
  inventoryId: string | null;
  description: string;
  sku: string;
  quantity: number | "";
  unitPrice: number | "";
  discountPercent: number | "";
  discountAmount: number | "";
  cgstPercent: number | "";
  cgstAmount: number;
  sgstPercent: number | "";
  sgstAmount: number;
  igstPercent: number | "";
  igstAmount: number;
  taxableSubtotal: number;
  rowTotal: number;
  currentStock: number | null;
  searchQuery: string;
  suggestions: any[];
  showDropdown: boolean;
  isSearching: boolean;
}

function formatDateTimeLocal(d: Date = new Date()): string {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditOrderForm({ initialData }: { initialData: OrderForEditData }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer State
  const [fullName, setFullName] = useState(initialData.customer.fullName || "");
  const [phone, setPhone] = useState(initialData.customer.phone || "");
  const [email, setEmail] = useState(initialData.customer.email || "");
  const [address, setAddress] = useState(initialData.customer.address || "");
  const [city, setCity] = useState(initialData.customer.city || "");
  const [stateName, setStateName] = useState(initialData.customer.state || "");
  const [pincode, setPincode] = useState(initialData.customer.pincode || "");

  // Order & Staff Attribution State
  const [soldBy, setSoldBy] = useState(initialData.invoice.soldBy || "");
  const [billingDateTime, setBillingDateTime] = useState(
    formatDateTimeLocal(initialData.invoice.createdAt)
  );
  const [fulfillmentStatus, setFulfillmentStatus] = useState<
    "PROCESSING" | "READY" | "DELIVERED" | "ON_HOLD"
  >(
    (initialData.invoice.fulfillmentStatus as any) || "PROCESSING"
  );
  const [deliveryPreset, setDeliveryPreset] = useState<string>("CUSTOM");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    initialData.invoice.estimatedDelivery || ""
  );
  const [notes, setNotes] = useState(initialData.invoice.notes || "");
  const [specialInstructions, setSpecialInstructions] = useState(
    initialData.invoice.specialInstructions || ""
  );

  // Line Items State
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    return initialData.lineItems.map((item) => {
      const qty = item.quantity;
      const price = parseFloat(item.unitPrice) || 0;
      const discPct = parseFloat(item.discountPercent) || 0;
      const discAmt = parseFloat(item.discountAmount) || 0;
      const cgstPct = parseFloat(item.cgstPercent) || 0;
      const sgstPct = parseFloat(item.sgstPercent) || 0;
      const igstPct = parseFloat(item.igstPercent) || 0;
      const taxable = Math.max(0, qty * price - discAmt);
      const cgstAmt = parseFloat(item.cgstAmount) || taxable * (cgstPct / 100);
      const sgstAmt = parseFloat(item.sgstAmount) || taxable * (sgstPct / 100);
      const igstAmt = parseFloat(item.igstAmount) || taxable * (igstPct / 100);
      const total = taxable + cgstAmt + sgstAmt + igstAmt;

      return {
        id: item.id,
        inventoryId: item.inventoryId,
        description: item.description,
        sku: item.sku || "",
        quantity: qty,
        unitPrice: price,
        discountPercent: discPct,
        discountAmount: discAmt,
        cgstPercent: cgstPct,
        cgstAmount: cgstAmt,
        sgstPercent: sgstPct,
        sgstAmount: sgstAmt,
        igstPercent: igstPct,
        igstAmount: igstAmt,
        taxableSubtotal: taxable,
        rowTotal: total,
        currentStock: item.currentStock ?? null,
        searchQuery: item.description,
        suggestions: [],
        showDropdown: false,
        isSearching: false,
      };
    });
  });

  // Payment Settlement State
  const initialBalance = parseFloat(initialData.invoice.balanceDue);
  const [paymentType, setPaymentType] = useState<"FULL" | "PARTIAL">(
    initialBalance <= 0.05 ? "FULL" : "PARTIAL"
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "UPI" | "BANK_TRANSFER"
  >(
    (initialData.invoice.paymentMethod as any) || "CASH"
  );
  const [partialAmountPaid, setPartialAmountPaid] = useState<number | "">(
    parseFloat(initialData.invoice.amountPaid) || 0
  );

  // Financial Calculations
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = typeof item.quantity === "number" ? item.quantity : 0;
    const price = typeof item.unitPrice === "number" ? item.unitPrice : 0;
    return sum + qty * price;
  }, 0);

  const totalDiscount = lineItems.reduce((sum, item) => {
    return sum + (typeof item.discountAmount === "number" ? item.discountAmount : 0);
  }, 0);

  const totalCgst = lineItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSgst = lineItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIgst = lineItems.reduce((sum, item) => sum + item.igstAmount, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const taxableSubtotal = Math.max(0, subtotal - totalDiscount);
  const grandTotal = Math.max(0, taxableSubtotal + totalTax);

  // Computed Amount Paid & Balance Due
  const effectiveAmountPaid =
    paymentType === "FULL"
      ? grandTotal
      : typeof partialAmountPaid === "number"
      ? Math.min(grandTotal, Math.max(0, partialAmountPaid))
      : 0;

  const effectiveBalanceDue = Math.max(0, grandTotal - effectiveAmountPaid);

  // Delivery preset handler
  const handleDeliveryPreset = (days: number, label: string) => {
    setDeliveryPreset(label);
    const d = new Date(billingDateTime);
    d.setDate(d.getDate() + days);
    setEstimatedDelivery(d.toISOString().split("T")[0]);
    if (days > 0 && fulfillmentStatus === "DELIVERED") {
      setFulfillmentStatus("PROCESSING");
    } else if (days === 0) {
      setFulfillmentStatus("DELIVERED");
    }
  };

  // Line Item Update Logic with Bi-Directional Discounts and Tax Sync
  const updateLineItem = (index: number, updates: Partial<EditableLineItem>) => {
    setLineItems((prev) => {
      const next = [...prev];
      const cur = { ...next[index], ...updates };

      const qty = typeof cur.quantity === "number" ? Math.max(0, cur.quantity) : 0;
      const price = typeof cur.unitPrice === "number" ? Math.max(0, cur.unitPrice) : 0;
      const lineSubtotal = qty * price;

      // Handle Discount sync
      let discAmt = typeof cur.discountAmount === "number" ? cur.discountAmount : 0;
      let discPct = typeof cur.discountPercent === "number" ? cur.discountPercent : 0;

      if (updates.discountPercent !== undefined) {
        discPct = Math.max(0, Math.min(100, typeof updates.discountPercent === "number" ? updates.discountPercent : 0));
        discAmt = (lineSubtotal * discPct) / 100;
      } else if (updates.discountAmount !== undefined) {
        discAmt = Math.max(0, Math.min(lineSubtotal, typeof updates.discountAmount === "number" ? updates.discountAmount : 0));
        discPct = lineSubtotal > 0 ? (discAmt / lineSubtotal) * 100 : 0;
      } else if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        // Price/Qty changed, maintain percentage if defined
        if (discPct > 0) {
          discAmt = (lineSubtotal * discPct) / 100;
        } else {
          discAmt = Math.min(discAmt, lineSubtotal);
        }
      }

      cur.discountPercent = Number(discPct.toFixed(2));
      cur.discountAmount = Number(discAmt.toFixed(2));

      const taxable = Math.max(0, lineSubtotal - discAmt);
      cur.taxableSubtotal = taxable;

      // Calculate Taxes
      const cgstRate = typeof cur.cgstPercent === "number" ? Math.max(0, cur.cgstPercent) : 0;
      const sgstRate = typeof cur.sgstPercent === "number" ? Math.max(0, cur.sgstPercent) : 0;
      const igstRate = typeof cur.igstPercent === "number" ? Math.max(0, cur.igstPercent) : 0;

      cur.cgstAmount = taxable * (cgstRate / 100);
      cur.sgstAmount = taxable * (sgstRate / 100);
      cur.igstAmount = taxable * (igstRate / 100);

      cur.rowTotal = taxable + cur.cgstAmount + cur.sgstAmount + cur.igstAmount;

      next[index] = cur;
      return next;
    });
  };

  // Add Product Item Row
  const handleAddItemRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        inventoryId: null,
        description: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        taxableSubtotal: 0,
        rowTotal: 0,
        currentStock: null,
        searchQuery: "",
        suggestions: [],
        showDropdown: false,
        isSearching: false,
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index: number) => {
    if (lineItems.length === 1) {
      toast.error("An order must contain at least one item.");
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Autocomplete search for product item
  const handleSearchProduct = async (index: number, query: string) => {
    updateLineItem(index, { searchQuery: query, isSearching: true, showDropdown: true });

    if (!query || query.length < 1) {
      updateLineItem(index, { suggestions: [], isSearching: false });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        updateLineItem(index, { suggestions: Array.isArray(data) ? data : [], isSearching: false });
      } else {
        updateLineItem(index, { suggestions: [], isSearching: false });
      }
    } catch (e) {
      updateLineItem(index, { suggestions: [], isSearching: false });
    }
  };

  // Select item from suggestions
  const handleSelectProduct = (index: number, product: any) => {
    const taxRate = parseFloat(product.taxRate || "0");
    const halfTax = taxRate > 0 ? Number((taxRate / 2).toFixed(2)) : 0;
    const price = parseFloat(product.retailPrice || "0");

    updateLineItem(index, {
      inventoryId: product.id,
      description: `${product.brand ? product.brand + " " : ""}${product.name || ""}${product.model ? " (" + product.model + ")" : ""}`.trim(),
      sku: product.sku || "",
      unitPrice: price,
      cgstPercent: halfTax,
      sgstPercent: halfTax,
      igstPercent: 0,
      currentStock: product.quantity ?? null,
      searchQuery: `${product.brand ? product.brand + " " : ""}${product.name || ""}`.trim(),
      showDropdown: false,
      suggestions: [],
    });
  };

  // Submit Order Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Customer Full Name is required.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description.trim()) {
        toast.error(`Item #${i + 1} has an empty description.`);
        return;
      }
      const qty = typeof item.quantity === "number" ? item.quantity : 0;
      if (qty <= 0) {
        toast.error(`Item #${i + 1} (${item.description}) must have quantity > 0.`);
        return;
      }
      const price = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      if (price < 0) {
        toast.error(`Item #${i + 1} cannot have a negative price.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        orderId: initialData.order.id,
        customer: {
          fullName: fullName.trim(),
          phone: cleanPhone,
          email: email.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateName.trim() || null,
          pincode: pincode.trim() || null,
        },
        soldBy: soldBy.trim() || null,
        createdAt: billingDateTime,
        estimatedDelivery: estimatedDelivery || null,
        fulfillmentStatus,
        notes: notes.trim() || null,
        specialInstructions: specialInstructions.trim() || null,
        items: lineItems.map((item) => ({
          inventoryId: item.inventoryId || null,
          description: item.description.trim(),
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
          discountPercent: typeof item.discountPercent === "number" ? item.discountPercent : 0,
          discountAmount: typeof item.discountAmount === "number" ? item.discountAmount : 0,
          cgstPercent: typeof item.cgstPercent === "number" ? item.cgstPercent : 0,
          cgstAmount: Number(item.cgstAmount.toFixed(2)),
          sgstPercent: typeof item.sgstPercent === "number" ? item.sgstPercent : 0,
          sgstAmount: Number(item.sgstAmount.toFixed(2)),
          igstPercent: typeof item.igstPercent === "number" ? item.igstPercent : 0,
          igstAmount: Number(item.igstAmount.toFixed(2)),
        })),
        paymentType,
        paymentMethod,
        amountPaid: effectiveAmountPaid,
        balanceDue: effectiveBalanceDue,
      };

      const res = await updateFullOrderAction(payload);

      if (res.success) {
        toast.success("Order and invoice successfully updated!");
        router.refresh();
        router.push("/shop/orders");
      } else {
        toast.error(res.message || "Failed to update order.");
      }
    } catch (err: any) {
      console.error("Submit order edit error:", err);
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Header Block & Navigation */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/shop/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Orders
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-[#0a52c3]">
              {initialData.order.orderNumber}
            </span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Pencil className="h-5 w-5 text-amber-600" />
            Edit Order: {initialData.order.orderNumber}
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0a52c3] border border-blue-100">
              <Receipt className="h-3 w-3" />
              Invoice: {initialData.invoice.invoiceNumber}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                initialBalance <= 0.05
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {initialBalance <= 0.05 ? "PAID IN FULL" : "PARTIALLY PAID"}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Truck className="h-3 w-3 text-slate-500" />
              {initialData.invoice.fulfillmentStatus}
            </span>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/shop/orders"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0a52c3] hover:bg-[#08429e] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Order Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Customer & Patient Details (Section 01) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="h-4 w-4 text-[#0a52c3]" />
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
            01. Customer & Patient Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="h-9 text-xs font-semibold"
              required
            />
          </div>

          {/* Mobile Phone */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Mobile Phone (10 Digits) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                +91
              </span>
              <Input
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                }}
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-9 text-xs font-semibold pl-11"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Street Address
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat / House / Street"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              City
            </label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* State */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              State
            </label>
            <select
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Pincode */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pincode
            </label>
            <Input
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPincode(val);
              }}
              placeholder="400001"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-9 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 3. Order Metadata & Staff Attribution (Section 02) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
            02. Order Schedule & Staff Attribution
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Sold By Staff Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-[#0a52c3]" />
              Sold By (Salesperson)
            </label>
            <Input
              value={soldBy}
              onChange={(e) => setSoldBy(e.target.value)}
              placeholder="e.g. Rahul Sharma / Staff Name"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* Billing Date & Time */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              Order / Invoice Date & Time
            </label>
            <Input
              type="datetime-local"
              value={billingDateTime}
              onChange={(e) => setBillingDateTime(e.target.value)}
              className="h-9 text-xs font-semibold"
              required
            />
          </div>

          {/* Fulfillment Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              Fulfillment Status
            </label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value as any)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="PROCESSING">UNDER PROCESSING</option>
              <option value="READY">READY FOR PICKUP</option>
              <option value="DELIVERED">DELIVERED TO PATIENT</option>
              <option value="ON_HOLD">ON HOLD / VERIFICATION</option>
            </select>
          </div>

          {/* Estimated Delivery Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Estimated Delivery Date
            </label>
            <Input
              type="date"
              value={estimatedDelivery}
              onChange={(e) => {
                setEstimatedDelivery(e.target.value);
                setDeliveryPreset("CUSTOM");
              }}
              className="h-9 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Delivery Presets Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Delivery Presets:
          </span>
          {[
            { label: "Same Day (0D)", days: 0 },
            { label: "1 Day", days: 1 },
            { label: "2 Days", days: 2 },
            { label: "3 Days", days: 3 },
            { label: "5 Days", days: 5 },
            { label: "7 Days", days: 7 },
          ].map((preset) => (
            <button
              type="button"
              key={preset.label}
              onClick={() => handleDeliveryPreset(preset.days, preset.label)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                deliveryPreset === preset.label
                  ? "bg-[#0a52c3] text-white border-[#0a52c3] shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Notes & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Order Notes & Remarks
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Frame adjustment requested on delivery."
              className="h-9 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Special Instructions
            </label>
            <Input
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Use high-index 1.67 lenses with blue-cut coating."
              className="h-9 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 4. Products & Line Items (Section 03) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
              03. Products, Prescription Items & Taxes
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddItemRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0a52c3] hover:bg-blue-100 font-bold text-xs border border-blue-200 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item Row</span>
          </button>
        </div>

        {/* High-density Line Items Table */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/70 border-b border-slate-200 tracking-wider">
                <th className="px-3 py-2.5 w-10 text-center">#</th>
                <th className="px-3 py-2.5 min-w-[280px]">Product / Prescription Item</th>
                <th className="px-3 py-2.5 w-20 text-center">Qty</th>
                <th className="px-3 py-2.5 w-28 text-right">Price (₹)</th>
                <th className="px-2 py-2.5 w-20 text-center bg-blue-50/40">Disc %</th>
                <th className="px-2 py-2.5 w-24 text-right bg-blue-50/40">Disc ₹</th>
                <th className="px-2 py-2.5 w-20 text-center bg-indigo-50/40">CGST %</th>
                <th className="px-2 py-2.5 w-20 text-center bg-emerald-50/40">SGST %</th>
                <th className="px-2 py-2.5 w-20 text-center bg-purple-50/40">IGST %</th>
                <th className="px-3 py-2.5 w-28 text-right font-extrabold text-slate-900">Total (₹)</th>
                <th className="px-2 py-2.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  {/* # Index */}
                  <td className="px-3 py-2.5 text-center font-bold text-slate-400 text-xs">
                    {idx + 1}
                  </td>

                  {/* Product Search & Description */}
                  <td className="px-3 py-2.5 relative">
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(idx, { description: val });
                            handleSearchProduct(idx, val);
                          }}
                          placeholder="Search product by SKU / name or type custom..."
                          className="h-8 text-xs font-semibold pr-7"
                          required
                        />
                        {item.isSearching && (
                          <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2.5 text-slate-400" />
                        )}
                      </div>

                      {/* Item Badges (SKU & Current Stock) */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {item.sku && (
                          <span className="font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                            SKU: {item.sku}
                          </span>
                        )}
                        {item.currentStock !== null && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              item.currentStock <= 2
                                ? "bg-rose-50 text-rose-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            Stock: {item.currentStock} units
                          </span>
                        )}
                      </div>

                      {/* Autocomplete Dropdown */}
                      {item.showDropdown && item.suggestions.length > 0 && (
                        <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1 text-xs">
                          {item.suggestions.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => handleSelectProduct(idx, p)}
                              className="w-full text-left p-2 hover:bg-blue-50 rounded-lg flex items-center justify-between transition-all"
                            >
                              <div>
                                <p className="font-bold text-slate-900">
                                  {p.brand ? `${p.brand} ` : ""}
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  SKU: {p.sku || "N/A"} • Stock: {p.quantity} units
                                </p>
                              </div>
                              <span className="font-extrabold text-xs text-emerald-700">
                                {formatCurrency(parseFloat(p.retailPrice || "0"))}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Qty */}
                  <td className="px-3 py-2.5 text-center">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                        updateLineItem(idx, { quantity: val });
                      }}
                      className="h-8 text-xs font-bold text-center w-16 mx-auto"
                      required
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="px-3 py-2.5 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                        updateLineItem(idx, { unitPrice: val });
                      }}
                      className="h-8 text-xs font-bold text-right w-24 ml-auto"
                      required
                    />
                  </td>

                  {/* DISC % */}
                  <td className="px-2 py-2.5 text-center bg-blue-50/20">
                    <div className="relative inline-block w-16">
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          updateLineItem(idx, { discountPercent: val });
                        }}
                        className="h-8 text-[11px] font-bold text-center pr-4"
                      />
                      <span className="absolute right-1.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>

                  {/* DISC ₹ */}
                  <td className="px-2 py-2.5 text-right bg-blue-50/20">
                    <div className="relative inline-block w-22">
                      <span className="absolute left-1.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.discountAmount}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          updateLineItem(idx, { discountAmount: val });
                        }}
                        className="h-8 text-[11px] font-bold text-right pl-4"
                      />
                    </div>
                  </td>

                  {/* CGST % */}
                  <td className="px-2 py-2.5 text-center bg-indigo-50/20">
                    <div className="space-y-0.5">
                      <div className="relative inline-block w-16">
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={50}
                          value={item.cgstPercent}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLineItem(idx, { cgstPercent: val });
                          }}
                          className="h-7 text-[11px] font-bold text-center border-indigo-200"
                        />
                      </div>
                      <span className="block text-[9px] font-extrabold text-indigo-600">
                        {formatCurrency(item.cgstAmount)}
                      </span>
                    </div>
                  </td>

                  {/* SGST % */}
                  <td className="px-2 py-2.5 text-center bg-emerald-50/20">
                    <div className="space-y-0.5">
                      <div className="relative inline-block w-16">
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={50}
                          value={item.sgstPercent}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLineItem(idx, { sgstPercent: val });
                          }}
                          className="h-7 text-[11px] font-bold text-center border-emerald-200"
                        />
                      </div>
                      <span className="block text-[9px] font-extrabold text-emerald-600">
                        {formatCurrency(item.sgstAmount)}
                      </span>
                    </div>
                  </td>

                  {/* IGST % */}
                  <td className="px-2 py-2.5 text-center bg-purple-50/20">
                    <div className="space-y-0.5">
                      <div className="relative inline-block w-16">
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={50}
                          value={item.igstPercent}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateLineItem(idx, { igstPercent: val });
                          }}
                          className="h-7 text-[11px] font-bold text-center border-purple-200"
                        />
                      </div>
                      <span className="block text-[9px] font-extrabold text-purple-600">
                        {formatCurrency(item.igstAmount)}
                      </span>
                    </div>
                  </td>

                  {/* Row Total */}
                  <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 text-xs">
                    {formatCurrency(item.rowTotal)}
                  </td>

                  {/* Delete Row Action */}
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Item Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Payment Settlement & Financial Summary (Section 04) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Payment Configuration (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="h-4 w-4 text-[#0a52c3]" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
              04. Payment Settlement & Accounting
            </h2>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Payment Status Option
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("FULL")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentType === "FULL"
                    ? "bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-emerald-800">
                    Paid in Full
                  </span>
                  {paymentType === "FULL" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Settles entire invoice (Zero balance). Regenerates Tax Invoice.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType("PARTIAL");
                  if (typeof partialAmountPaid !== "number" || partialAmountPaid <= 0) {
                    setPartialAmountPaid(Number((grandTotal / 2).toFixed(2)));
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentType === "PARTIAL"
                    ? "bg-amber-50/80 border-amber-500 shadow-xs ring-1 ring-amber-500"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-amber-800">
                    Partial Advance Payment
                  </span>
                  {paymentType === "PARTIAL" && (
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Collect partial advance. Regenerates updated Payment Receipt.
                </p>
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "CASH", label: "Cash" },
                { id: "UPI", label: "UPI / QR" },
                { id: "CARD", label: "Card POS" },
                { id: "BANK_TRANSFER", label: "Bank Transfer" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? "bg-[#0a52c3] text-white border-[#0a52c3] shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid & Balance Due */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Amount Paid (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={grandTotal}
                disabled={paymentType === "FULL"}
                value={paymentType === "FULL" ? grandTotal.toFixed(2) : partialAmountPaid}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                  setPartialAmountPaid(val);
                }}
                className={`h-10 text-sm font-extrabold ${
                  paymentType === "FULL"
                    ? "bg-slate-50 text-emerald-700"
                    : "text-slate-900 border-amber-300"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Balance Due (₹)
              </label>
              <div
                className={`h-10 px-3 rounded-md border flex items-center font-extrabold text-sm ${
                  effectiveBalanceDue <= 0.05
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {formatCurrency(effectiveBalanceDue)}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Card (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Financial Totals Breakdown
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span>Items Subtotal</span>
              <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-rose-600 font-semibold">
              <span>Discount</span>
              <span className="font-bold">- {formatCurrency(totalDiscount)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 font-semibold pt-1 border-t border-slate-100">
              <span>Taxable Subtotal</span>
              <span className="font-bold text-slate-900">{formatCurrency(taxableSubtotal)}</span>
            </div>

            {totalCgst > 0 && (
              <div className="flex items-center justify-between text-indigo-700 font-semibold text-[11px]">
                <span>CGST</span>
                <span className="font-bold">+ {formatCurrency(totalCgst)}</span>
              </div>
            )}

            {totalSgst > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-semibold text-[11px]">
                <span>SGST</span>
                <span className="font-bold">+ {formatCurrency(totalSgst)}</span>
              </div>
            )}

            {totalIgst > 0 && (
              <div className="flex items-center justify-between text-purple-700 font-semibold text-[11px]">
                <span>IGST</span>
                <span className="font-bold">+ {formatCurrency(totalIgst)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-2 border-t-2 border-slate-200">
              <span>Grand Total</span>
              <span className="text-base text-[#0a52c3]">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700 font-bold text-xs pt-1">
              <span>Paid Today</span>
              <span>{formatCurrency(effectiveAmountPaid)}</span>
            </div>

            <div className="flex items-center justify-between text-rose-600 font-bold text-xs">
              <span>Remaining Balance</span>
              <span>{formatCurrency(effectiveBalanceDue)}</span>
            </div>
          </div>

          {/* Action Button inside Summary */}
          <div className="pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0a52c3] hover:bg-[#08429e] text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Order & Invoices...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Order & Update Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 6. History of Updates (Audit Log) (Section 06) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
              05. History of Updates & Audit Trail
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              {initialData.history.length} audit record{initialData.history.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            Tracked automatically per shop change
          </span>
        </div>

        {initialData.history.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {initialData.history.map((record) => {
              const dateStr = new Date(record.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={record.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{record.userName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                          record.userRole === "OWNER" || record.userRole === "SUPER_ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {record.userRole}
                      </span>
                      <span className="text-slate-400 font-semibold text-[11px]">• {dateStr}</span>
                    </div>

                    <p className="text-slate-600 font-semibold">{record.summary}</p>
                  </div>

                  {record.snapshot?.updated && (
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">Total:</span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {formatCurrency(parseFloat(record.snapshot.updated.total || "0"))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-1 text-slate-400">
            <ShieldCheck className="h-7 w-7 mx-auto text-emerald-500/80 mb-1" />
            <p className="font-bold text-xs text-slate-700">
              Original Order (No modifications yet)
            </p>
            <p className="text-[11px]">
              Created on{" "}
              {new Date(initialData.order.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              • Any future edits will be automatically logged and timestamped here.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
