"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  FileText,
  User,
  Package,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Hash,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { updateShopDocumentSeriesAction } from "@/actions/shop.actions";
import {
  formatDocumentNumber,
  DEFAULT_DOCUMENT_SERIES,
  getIndianFinancialYear,
} from "@/utils/document-series";
import type {
  DocumentSequenceConfig,
  DocumentSeriesSettings as DocumentSeriesSettingsType,
} from "@/db/schema/shops";

interface DocumentSeriesSettingsProps {
  shopId: string;
  shopName?: string;
  shopNumber?: number;
  initialSeries?: DocumentSeriesSettingsType | null;
  onSaved?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

type SeriesSection = "invoice" | "customer" | "order";

export function DocumentSeriesSettings({
  shopId,
  shopName,
  shopNumber = 1,
  initialSeries,
  onSaved,
  onCancel,
  isModal = false,
}: DocumentSeriesSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<SeriesSection>("invoice");

  // State for Invoice Series
  const [invConfig, setInvConfig] = useState<DocumentSequenceConfig>({
    prefix: initialSeries?.invoice?.prefix ?? DEFAULT_DOCUMENT_SERIES.invoice.prefix,
    separator: typeof initialSeries?.invoice?.separator === "string" ? initialSeries.invoice.separator : DEFAULT_DOCUMENT_SERIES.invoice.separator,
    includeYear: initialSeries?.invoice?.includeYear ?? DEFAULT_DOCUMENT_SERIES.invoice.includeYear,
    yearFormat: initialSeries?.invoice?.yearFormat ?? DEFAULT_DOCUMENT_SERIES.invoice.yearFormat,
    includeShopCode: initialSeries?.invoice?.includeShopCode ?? DEFAULT_DOCUMENT_SERIES.invoice.includeShopCode,
    paddingDigits: initialSeries?.invoice?.paddingDigits ?? DEFAULT_DOCUMENT_SERIES.invoice.paddingDigits,
    nextNumber: initialSeries?.invoice?.nextNumber ?? DEFAULT_DOCUMENT_SERIES.invoice.nextNumber,
    suffix: initialSeries?.invoice?.suffix ?? DEFAULT_DOCUMENT_SERIES.invoice.suffix,
  });

  // State for Customer/Patient ID Series
  const [custConfig, setCustConfig] = useState<DocumentSequenceConfig>({
    prefix: initialSeries?.customer?.prefix ?? DEFAULT_DOCUMENT_SERIES.customer.prefix,
    separator: typeof initialSeries?.customer?.separator === "string" ? initialSeries.customer.separator : DEFAULT_DOCUMENT_SERIES.customer.separator,
    includeYear: initialSeries?.customer?.includeYear ?? DEFAULT_DOCUMENT_SERIES.customer.includeYear,
    yearFormat: initialSeries?.customer?.yearFormat ?? DEFAULT_DOCUMENT_SERIES.customer.yearFormat,
    includeShopCode: initialSeries?.customer?.includeShopCode ?? DEFAULT_DOCUMENT_SERIES.customer.includeShopCode,
    paddingDigits: initialSeries?.customer?.paddingDigits ?? DEFAULT_DOCUMENT_SERIES.customer.paddingDigits,
    nextNumber: initialSeries?.customer?.nextNumber ?? DEFAULT_DOCUMENT_SERIES.customer.nextNumber,
    suffix: initialSeries?.customer?.suffix ?? DEFAULT_DOCUMENT_SERIES.customer.suffix,
  });

  // State for Order Series
  const [orderMatchInvoice, setOrderMatchInvoice] = useState<boolean>(
    initialSeries?.order?.matchInvoice ?? DEFAULT_DOCUMENT_SERIES.order.matchInvoice
  );
  const [ordConfig, setOrdConfig] = useState<DocumentSequenceConfig>({
    prefix: initialSeries?.order?.prefix ?? DEFAULT_DOCUMENT_SERIES.order.prefix,
    separator: typeof initialSeries?.order?.separator === "string" ? initialSeries.order.separator : DEFAULT_DOCUMENT_SERIES.order.separator,
    includeYear: initialSeries?.order?.includeYear ?? DEFAULT_DOCUMENT_SERIES.order.includeYear,
    yearFormat: initialSeries?.order?.yearFormat ?? DEFAULT_DOCUMENT_SERIES.order.yearFormat,
    includeShopCode: initialSeries?.order?.includeShopCode ?? DEFAULT_DOCUMENT_SERIES.order.includeShopCode,
    paddingDigits: initialSeries?.order?.paddingDigits ?? DEFAULT_DOCUMENT_SERIES.order.paddingDigits,
    nextNumber: initialSeries?.order?.nextNumber ?? DEFAULT_DOCUMENT_SERIES.order.nextNumber,
    suffix: initialSeries?.order?.suffix ?? DEFAULT_DOCUMENT_SERIES.order.suffix,
  });

  // Zero-latency live previews
  const previewDate = useMemo(() => new Date(), []);

  const invoicePreview = useMemo(() => {
    const num = Number(invConfig.nextNumber) > 0 ? Number(invConfig.nextNumber) : 1;
    return formatDocumentNumber(invConfig, num, shopNumber, previewDate);
  }, [invConfig, shopNumber, previewDate]);

  const customerPreview = useMemo(() => {
    const num = Number(custConfig.nextNumber) > 0 ? Number(custConfig.nextNumber) : 1;
    return formatDocumentNumber(custConfig, num, shopNumber, previewDate);
  }, [custConfig, shopNumber, previewDate]);

  const orderPreview = useMemo(() => {
    if (orderMatchInvoice) return invoicePreview;
    const num = Number(ordConfig.nextNumber) > 0 ? Number(ordConfig.nextNumber) : 1;
    return formatDocumentNumber(ordConfig, num, shopNumber, previewDate);
  }, [orderMatchInvoice, invoicePreview, ordConfig, shopNumber, previewDate]);

  // GST 16-character rule check for tax invoices (CGST Rule 46(b))
  const isInvoiceGstCompliant = invoicePreview.length <= 16;

  // Sanitized prefix input handler (letters, numbers, hyphens, slashes only)
  const handlePrefixChange = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<DocumentSequenceConfig>>
  ) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9\-_/]/g, "");
    setter((prev) => ({ ...prev, prefix: cleaned }));
  };

  // Safe numeric input handler: allows clearing / backspacing freely to type any new number
  const handleNumericInput = (
    val: string,
    field: "nextNumber" | "paddingDigits",
    setter: React.Dispatch<React.SetStateAction<DocumentSequenceConfig>>
  ) => {
    const digitsOnly = val.replace(/[^0-9]/g, "");
    setter((prev) => ({
      ...prev,
      [field]: digitsOnly === "" ? ("" as any) : parseInt(digitsOnly, 10),
    }));
  };

  // Reset to default on blur only if user leaves the field completely blank
  const handleNumericBlur = (
    field: "nextNumber" | "paddingDigits",
    setter: React.Dispatch<React.SetStateAction<DocumentSequenceConfig>>,
    defaultVal = 1
  ) => {
    setter((prev) => ({
      ...prev,
      [field]: Number(prev[field]) > 0 ? Number(prev[field]) : defaultVal,
    }));
  };

  // Submit Handler
  const handleSave = () => {
    if (!shopId) {
      toast.error("Shop identifier is required.");
      return;
    }

    if (!invConfig.prefix.trim()) {
      toast.error("Invoice prefix cannot be empty.");
      setActiveSection("invoice");
      return;
    }

    if (!custConfig.prefix.trim()) {
      toast.error("Customer ID prefix cannot be empty.");
      setActiveSection("customer");
      return;
    }

    if (!orderMatchInvoice && !ordConfig.prefix.trim()) {
      toast.error("Order prefix cannot be empty.");
      setActiveSection("order");
      return;
    }

    if (invoicePreview.length > 16) {
      toast.warning(
        "Notice: Invoice number exceeds Central GST Rule 46 limit of 16 characters. Consider shortening prefix or padding."
      );
    }

    startTransition(async () => {
      try {
        const res = await updateShopDocumentSeriesAction(shopId, {
          invoice: {
            ...invConfig,
            nextNumber: Number(invConfig.nextNumber) > 0 ? Number(invConfig.nextNumber) : 1,
            paddingDigits: Number(invConfig.paddingDigits) >= 0 ? Number(invConfig.paddingDigits) : 4,
          },
          customer: {
            ...custConfig,
            nextNumber: Number(custConfig.nextNumber) > 0 ? Number(custConfig.nextNumber) : 1,
            paddingDigits: Number(custConfig.paddingDigits) >= 0 ? Number(custConfig.paddingDigits) : 4,
          },
          order: {
            ...ordConfig,
            nextNumber: Number(ordConfig.nextNumber) > 0 ? Number(ordConfig.nextNumber) : 1,
            paddingDigits: Number(ordConfig.paddingDigits) >= 0 ? Number(ordConfig.paddingDigits) : 4,
            matchInvoice: orderMatchInvoice,
          },
        });

        if (res?.success) {
          toast.success(res.message || "Document numbering series saved successfully!");
          onSaved?.();
        } else {
          toast.error(res?.message || "Failed to update series.");
        }
      } catch (err: any) {
        console.error("Save series error:", err);
        toast.error(err?.message || "An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Informational Callout: Seamless Migration & Safe Past Data */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            Migrating from Marg, Tally, OptoTech, or another legacy CRM?
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              Safe Migration
            </span>
          </p>
          <p className="text-blue-700 leading-relaxed text-[11px]">
            You can continue your existing sequence seamlessly. Simply specify your custom prefix and next starting serial number.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] font-semibold text-blue-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Past invoices and patient IDs are permanently locked and will never be altered.
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Smart anti-collision math automatically protects against duplicate numbers.
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 Interactive KPI Selection Cards (AGENTS.md Rule 3 Standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Invoices */}
        <button
          type="button"
          onClick={() => setActiveSection("invoice")}
          className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
            activeSection === "invoice"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01] bg-white ring-1 ring-[#2563eb]/20"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Tax Invoices
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isInvoiceGstCompliant
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              {invoicePreview.length}/16 Chars
            </span>
          </div>
          <div className="mt-1 font-mono text-sm font-extrabold text-slate-900 truncate">
            {invoicePreview}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
            Prefix: {invConfig.prefix || "(None)"} • Next: #{invConfig.nextNumber || 1}
          </p>
        </button>

        {/* Card 2: Customers */}
        <button
          type="button"
          onClick={() => setActiveSection("customer")}
          className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
            activeSection === "customer"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01] bg-white ring-1 ring-[#2563eb]/20"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Customer / Patient ID
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              Unique ID
            </span>
          </div>
          <div className="mt-1 font-mono text-sm font-extrabold text-slate-900 truncate">
            {customerPreview}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
            Prefix: {custConfig.prefix || "(None)"} • Next: #{custConfig.nextNumber || 1}
          </p>
        </button>

        {/* Card 3: Orders */}
        <button
          type="button"
          onClick={() => setActiveSection("order")}
          className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
            activeSection === "order"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01] bg-white ring-1 ring-[#2563eb]/20"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-purple-600" />
              Workshop Order #
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                orderMatchInvoice
                  ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {orderMatchInvoice ? "Synced with Invoice" : "Separate Series"}
            </span>
          </div>
          <div className="mt-1 font-mono text-sm font-extrabold text-slate-900 truncate">
            {orderPreview}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
            {orderMatchInvoice ? "Matches Invoice Number" : `Prefix: ${ordConfig.prefix || "(None)"} • Next: #${ordConfig.nextNumber || 1}`}
          </p>
        </button>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Section Header & Live Preview Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {activeSection === "invoice" && (
                <>
                  <FileText className="w-4 h-4 text-blue-600" />
                  Tax Invoice Numbering Series
                </>
              )}
              {activeSection === "customer" && (
                <>
                  <User className="w-4 h-4 text-indigo-600" />
                  Customer & Patient Registration ID Series
                </>
              )}
              {activeSection === "order" && (
                <>
                  <Package className="w-4 h-4 text-purple-600" />
                  Workshop Job Order Number Series
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeSection === "invoice" &&
                "Configures consecutive tax invoice numbers. Compliant with Central GST Rule 46(b)."}
              {activeSection === "customer" &&
                "Assigns clean registration identifiers for optical patients across billing and prescriptions."}
              {activeSection === "order" &&
                "Job slip numbering for optical lab processing. Can mirror invoice numbers or run independently."}
            </p>
          </div>

          {/* Live Preview Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Next Preview:
            </span>
            <span className="font-mono text-xs font-black text-slate-900">
              {activeSection === "invoice" && invoicePreview}
              {activeSection === "customer" && customerPreview}
              {activeSection === "order" && orderPreview}
            </span>
          </div>
        </div>

        {/* SECTION 1: INVOICE CONFIGURATION */}
        {activeSection === "invoice" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Prefix */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Series Prefix <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invConfig.prefix}
                    onChange={(e) => handlePrefixChange(e.target.value, setInvConfig)}
                    placeholder="e.g. INV or OM"
                    maxLength={8}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Letters, numbers, &apos;-&apos; or &apos;/&apos;</p>
              </div>

              {/* Separator */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Separator Character</label>
                <select
                  value={invConfig.separator}
                  onChange={(e) => setInvConfig((prev) => ({ ...prev, separator: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="/">Forward Slash (/)</option>
                  <option value="">None (No separator)</option>
                </select>
                <p className="text-[10px] text-slate-400">Divider between prefix and serial</p>
              </div>

              {/* Year Format */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Year / Financial Year</label>
                <select
                  value={invConfig.includeYear ? invConfig.yearFormat : "NONE"}
                  onChange={(e) => {
                    const val = e.target.value as "YYYY" | "YY" | "FY" | "NONE";
                    if (val === "NONE") {
                      setInvConfig((prev) => ({ ...prev, includeYear: false, yearFormat: "NONE" }));
                    } else {
                      setInvConfig((prev) => ({ ...prev, includeYear: true, yearFormat: val }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="YYYY">Calendar Year (e.g. {previewDate.getFullYear()})</option>
                  <option value="YY">Short Year (e.g. {String(previewDate.getFullYear()).slice(-2)})</option>
                  <option value="FY">Indian FY (e.g. {getIndianFinancialYear(previewDate)})</option>
                  <option value="NONE">Do Not Include Year</option>
                </select>
                <p className="text-[10px] text-slate-400">Appends current tax / calendar period</p>
              </div>

              {/* Next Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Next Starting Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={invConfig.nextNumber ?? ""}
                  onChange={(e) => handleNumericInput(e.target.value, "nextNumber", setInvConfig)}
                  onBlur={() => handleNumericBlur("nextNumber", setInvConfig, 1)}
                  placeholder="e.g. 1051"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">Continue directly from past software</p>
              </div>

              {/* Number Padding */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Digit Padding (Leading Zeros)</label>
                <select
                  value={invConfig.paddingDigits}
                  onChange={(e) =>
                    setInvConfig((prev) => ({ ...prev, paddingDigits: parseInt(e.target.value, 10) }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value={4}>4 digits (e.g. 0001 - Standard)</option>
                  <option value={3}>3 digits (e.g. 001)</option>
                  <option value={5}>5 digits (e.g. 00001)</option>
                  <option value={6}>6 digits (e.g. 000001)</option>
                  <option value={0}>No padding (e.g. 1, 42, 501)</option>
                </select>
                <p className="text-[10px] text-slate-400">Maintains uniform character length</p>
              </div>

              {/* Suffix (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Custom Suffix (Optional)</label>
                <input
                  type="text"
                  value={invConfig.suffix || ""}
                  onChange={(e) =>
                    setInvConfig((prev) => ({
                      ...prev,
                      suffix: e.target.value.toUpperCase().replace(/[^A-Z0-9\-_/]/g, ""),
                    }))
                  }
                  placeholder="e.g. /RET or -A"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">Optional trailing text tag</p>
              </div>
            </div>

            {/* Shop Code Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Include Store Number in Invoice Series
                </span>
                <span className="text-[11px] text-slate-400">
                  Adds the store index (e.g. &quot;{shopNumber}&quot;) to distinguish invoices across multiple branches.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInvConfig((prev) => ({ ...prev, includeShopCode: !prev.includeShopCode }))}
                className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors cursor-pointer ${
                  invConfig.includeShopCode ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform ${
                    invConfig.includeShopCode ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* GST Rule 46 Warning / Compliance Badge */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                isInvoiceGstCompliant
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                  : "bg-amber-50/70 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {isInvoiceGstCompliant ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {isInvoiceGstCompliant ? (
                    <>
                      <strong>Central GST Compliant:</strong> Formatted invoice number is{" "}
                      <strong>{invoicePreview.length} characters</strong> (max permissible is 16 under CGST Rule 46).
                    </>
                  ) : (
                    <>
                      <strong>Warning:</strong> Formatted invoice number is{" "}
                      <strong>{invoicePreview.length} characters</strong>, exceeding the statutory CGST Rule 46(b)
                      limit of 16 characters. Please reduce prefix length or padding.
                    </>
                  )}
                </span>
              </div>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-800 text-[11px] border border-slate-200 shrink-0">
                {invoicePreview}
              </span>
            </div>
          </div>
        )}

        {/* SECTION 2: CUSTOMER / PATIENT ID CONFIGURATION */}
        {activeSection === "customer" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Prefix */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Customer ID Prefix <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={custConfig.prefix}
                  onChange={(e) => handlePrefixChange(e.target.value, setCustConfig)}
                  placeholder="e.g. OP or PAT or CUST"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">Prefix identifying registered patients</p>
              </div>

              {/* Separator */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Separator Character</label>
                <select
                  value={custConfig.separator}
                  onChange={(e) => setCustConfig((prev) => ({ ...prev, separator: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="/">Forward Slash (/)</option>
                  <option value="">None (No separator)</option>
                </select>
                <p className="text-[10px] text-slate-400">Divider between prefix and serial</p>
              </div>

              {/* Year Format */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Year in Customer ID</label>
                <select
                  value={custConfig.includeYear ? custConfig.yearFormat : "NONE"}
                  onChange={(e) => {
                    const val = e.target.value as "YYYY" | "YY" | "FY" | "NONE";
                    if (val === "NONE") {
                      setCustConfig((prev) => ({ ...prev, includeYear: false, yearFormat: "NONE" }));
                    } else {
                      setCustConfig((prev) => ({ ...prev, includeYear: true, yearFormat: val }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="YYYY">Calendar Year (e.g. {previewDate.getFullYear()})</option>
                  <option value="YY">Short Year (e.g. {String(previewDate.getFullYear()).slice(-2)})</option>
                  <option value="FY">Indian FY (e.g. {getIndianFinancialYear(previewDate)})</option>
                  <option value="NONE">Do Not Include Year (Clean Serial)</option>
                </select>
                <p className="text-[10px] text-slate-400">Whether patient ID includes reg year</p>
              </div>

              {/* Next Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Next Starting Serial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={custConfig.nextNumber ?? ""}
                  onChange={(e) => handleNumericInput(e.target.value, "nextNumber", setCustConfig)}
                  onBlur={() => handleNumericBlur("nextNumber", setCustConfig, 1)}
                  placeholder="e.g. 5001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">Continue your patient registration counter</p>
              </div>

              {/* Number Padding */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Digit Padding</label>
                <select
                  value={custConfig.paddingDigits}
                  onChange={(e) =>
                    setCustConfig((prev) => ({ ...prev, paddingDigits: parseInt(e.target.value, 10) }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value={4}>4 digits (e.g. 0001 - Standard)</option>
                  <option value={3}>3 digits (e.g. 001)</option>
                  <option value={5}>5 digits (e.g. 00001)</option>
                  <option value={6}>6 digits (e.g. 000001)</option>
                  <option value={0}>No padding (e.g. 1, 42, 501)</option>
                </select>
                <p className="text-[10px] text-slate-400">Uniform patient card formatting</p>
              </div>

              {/* Suffix (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Custom Suffix (Optional)</label>
                <input
                  type="text"
                  value={custConfig.suffix || ""}
                  onChange={(e) =>
                    setCustConfig((prev) => ({
                      ...prev,
                      suffix: e.target.value.toUpperCase().replace(/[^A-Z0-9\-_/]/g, ""),
                    }))
                  }
                  placeholder="e.g. /P or -VIP"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">Optional patient classification tag</p>
              </div>
            </div>

            {/* Shop Code Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Include Store Number in Customer ID
                </span>
                <span className="text-[11px] text-slate-400">
                  Embeds the home branch number (e.g. &quot;{shopNumber}&quot;) into the patient registration ID.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustConfig((prev) => ({ ...prev, includeShopCode: !prev.includeShopCode }))}
                className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors cursor-pointer ${
                  custConfig.includeShopCode ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform ${
                    custConfig.includeShopCode ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: ORDER CONFIGURATION */}
        {activeSection === "order" && (
          <div className="space-y-4">
            {/* Sync with Invoice Number Switch */}
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-700" />
                  Match Order # Directly to Invoice # (Recommended for Single-Slip Labs)
                </span>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  When enabled, spectacle orders automatically inherit the exact invoice number (e.g.{" "}
                  <code className="bg-white/80 px-1 py-0.2 rounded font-mono font-bold">{invoicePreview}</code>).
                  Eliminates confusing dual numbers for customers and opticians.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderMatchInvoice(!orderMatchInvoice)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 mt-0.5 ${
                  orderMatchInvoice ? "bg-purple-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                    orderMatchInvoice ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            {/* Independent Order Series (if not matching invoice) */}
            {!orderMatchInvoice && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Prefix */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Order Prefix <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ordConfig.prefix}
                      onChange={(e) => handlePrefixChange(e.target.value, setOrdConfig)}
                      placeholder="e.g. ORD or JOB"
                      maxLength={8}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                    <p className="text-[10px] text-slate-400">Prefix identifying workshop jobs</p>
                  </div>

                  {/* Separator */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Separator Character</label>
                    <select
                      value={ordConfig.separator}
                      onChange={(e) => setOrdConfig((prev) => ({ ...prev, separator: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    >
                      <option value="-">Hyphen (-)</option>
                      <option value="/">Forward Slash (/)</option>
                      <option value="">None (No separator)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Divider between prefix and serial</p>
                  </div>

                  {/* Year Format */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Year in Order #</label>
                    <select
                      value={ordConfig.includeYear ? ordConfig.yearFormat : "NONE"}
                      onChange={(e) => {
                        const val = e.target.value as "YYYY" | "YY" | "FY" | "NONE";
                        if (val === "NONE") {
                          setOrdConfig((prev) => ({ ...prev, includeYear: false, yearFormat: "NONE" }));
                        } else {
                          setOrdConfig((prev) => ({ ...prev, includeYear: true, yearFormat: val }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    >
                      <option value="YYYY">Calendar Year (e.g. {previewDate.getFullYear()})</option>
                      <option value="YY">Short Year (e.g. {String(previewDate.getFullYear()).slice(-2)})</option>
                      <option value="FY">Indian FY (e.g. {getIndianFinancialYear(previewDate)})</option>
                      <option value="NONE">Do Not Include Year</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Whether job slip includes year</p>
                  </div>

                  {/* Next Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Next Starting Order # <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ordConfig.nextNumber ?? ""}
                      onChange={(e) => handleNumericInput(e.target.value, "nextNumber", setOrdConfig)}
                      onBlur={() => handleNumericBlur("nextNumber", setOrdConfig, 1)}
                      placeholder="e.g. 501"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                    <p className="text-[10px] text-slate-400">Order serial start</p>
                  </div>

                  {/* Number Padding */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Digit Padding</label>
                    <select
                      value={ordConfig.paddingDigits}
                      onChange={(e) =>
                        setOrdConfig((prev) => ({ ...prev, paddingDigits: parseInt(e.target.value, 10) }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    >
                      <option value={4}>4 digits (e.g. 0001)</option>
                      <option value={3}>3 digits (e.g. 001)</option>
                      <option value={5}>5 digits (e.g. 00001)</option>
                      <option value={0}>No padding (e.g. 1, 42, 501)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Padding length</p>
                  </div>

                  {/* Suffix (Optional) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Custom Suffix (Optional)</label>
                    <input
                      type="text"
                      value={ordConfig.suffix || ""}
                      onChange={(e) =>
                        setOrdConfig((prev) => ({
                          ...prev,
                          suffix: e.target.value.toUpperCase().replace(/[^A-Z0-9\-_/]/g, ""),
                        }))
                      }
                      placeholder="e.g. -LAB"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                    />
                    <p className="text-[10px] text-slate-400">Workshop identifier tag</p>
                  </div>
                </div>

                {/* Shop Code Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Include Store Number in Order Series
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Adds the store index (e.g. &quot;{shopNumber}&quot;) to distinguish orders across branches.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrdConfig((prev) => ({ ...prev, includeShopCode: !prev.includeShopCode }))}
                    className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors cursor-pointer ${
                      ordConfig.includeShopCode ? "bg-purple-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform ${
                        ordConfig.includeShopCode ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-collision protected • Changes take effect on next issued document</span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Series...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Series</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
