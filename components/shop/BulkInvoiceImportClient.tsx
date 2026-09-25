"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Receipt,
  UserCheck,
  UserPlus,
  Building2,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Tag,
  DollarSign,
  Percent,
  Sliders,
  Eye,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseCSV,
  autoMapInvoiceCSVHeaders,
  downloadSampleInvoiceCSV,
  INVOICE_SYSTEM_FIELDS,
  type ParsedCSV,
} from "@/utils/csv-parser";
import { bulkImportInvoicesAction, type BulkInvoiceItemInput } from "@/actions/invoice.actions";

interface BulkInvoiceImportClientProps {
  shopId: string;
  shopName: string;
  existingCustomers: Array<{
    id: string;
    fullName: string;
    phone: string;
    registrationId: string | null;
  }>;
  existingInvoiceNumbers: string[];
}

interface EditableInvoiceRow {
  id: string;
  originalIndex: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerGender: string;
  customerCity: string;
  customerAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  soldBy: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxPercent: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  notes: string;
  errors: Record<string, string>;
  isValid: boolean;
  isCustomerMatch: boolean;
  matchedCustomerName?: string;
  matchedRegId?: string;
  isDuplicateInvoiceNum: boolean;
}

export function BulkInvoiceImportClient({
  shopId,
  shopName,
  existingCustomers,
  existingInvoiceNumbers,
}: BulkInvoiceImportClientProps) {
  const router = useRouter();

  // Wizard Step: 1 = Upload & Config, 2 = Mapping, 3 = Review & Fix, 4 = Ingest & Result
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File & Parser State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default Inward Settings
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER">("CASH");
  const [defaultFulfillmentStatus, setDefaultFulfillmentStatus] = useState<"DELIVERED" | "READY" | "PROCESSING">("DELIVERED");
  const [defaultDate, setDefaultDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [autoCreateCustomers, setAutoCreateCustomers] = useState(true);

  // Field Mapping State: systemFieldKey -> csvHeaderName
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // Review Table State
  const [rows, setRows] = useState<EditableInvoiceRow[]>([]);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [filterNewCustomersOnly, setFilterNewCustomersOnly] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Selected row for extended details modal
  const [selectedRowDetails, setSelectedRowDetails] = useState<EditableInvoiceRow | null>(null);

  // Ingestion Execution State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    invoicesCount: number;
    itemsCount: number;
    newCustomersCount: number;
    existingCustomersCount: number;
    totalRevenue: number;
    firstInvoiceNum?: string;
    lastInvoiceNum?: string;
    message: string;
  } | null>(null);

  // Customer phone lookup map for instant 0ms matching
  const customerPhoneMap = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string; registrationId: string | null }>();
    for (const cust of existingCustomers) {
      if (cust.phone) {
        const clean = cust.phone.replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^0/, "");
        map.set(clean, cust);
      }
    }
    return map;
  }, [existingCustomers]);

  // Existing invoice numbers set for collision check
  const existingInvoiceSet = useMemo(() => {
    const set = new Set<string>();
    for (const num of existingInvoiceNumbers) {
      if (num) {
        set.add(num.toLowerCase().trim());
      }
    }
    return set;
  }, [existingInvoiceNumbers]);

  // --- Row Validator Helper ---
  const validateRow = (
    row: Omit<EditableInvoiceRow, "errors" | "isValid" | "isCustomerMatch" | "matchedCustomerName" | "matchedRegId" | "isDuplicateInvoiceNum">
  ): {
    errors: Record<string, string>;
    isValid: boolean;
    isCustomerMatch: boolean;
    matchedCustomerName?: string;
    matchedRegId?: string;
    isDuplicateInvoiceNum: boolean;
  } => {
    const errors: Record<string, string> = {};

    // 1. Customer Name: required
    if (!row.customerName.trim()) {
      errors.customerName = "Name is required.";
    }

    // 2. Customer Phone: required 10-digit
    const cleanPhone = row.customerPhone.replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^0/, "");
    if (!cleanPhone) {
      errors.customerPhone = "Phone is required.";
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      errors.customerPhone = "Must be 10 digits.";
    }

    // Customer match check
    const matched = cleanPhone ? customerPhoneMap.get(cleanPhone) : undefined;
    const isCustomerMatch = Boolean(matched);

    // 3. Item Description: required
    if (!row.itemDescription.trim()) {
      errors.itemDescription = "Description is required.";
    }

    // 4. Quantity: required > 0
    if (row.quantity === "" || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
      errors.quantity = "Qty > 0 required.";
    }

    // 5. Total Amount: required >= 0
    if (row.totalAmount === "" || isNaN(Number(row.totalAmount)) || Number(row.totalAmount) < 0) {
      errors.totalAmount = "Valid total required.";
    }

    // 6. Invoice Number Duplicate Check
    const cleanInvNum = row.invoiceNumber.toLowerCase().trim();
    const isDuplicateInvoiceNum = cleanInvNum ? existingInvoiceSet.has(cleanInvNum) : false;
    if (isDuplicateInvoiceNum) {
      errors.invoiceNumber = "Invoice # already exists in database.";
    }

    // 7. Amount Paid
    if (row.amountPaid !== "" && (isNaN(Number(row.amountPaid)) || Number(row.amountPaid) < 0)) {
      errors.amountPaid = "Amount paid must be >= 0.";
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
      isCustomerMatch,
      matchedCustomerName: matched?.fullName,
      matchedRegId: matched?.registrationId || undefined,
      isDuplicateInvoiceNum,
    };
  };

  // --- Step 1: File Upload & Drag-and-Drop ---
  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a valid .csv file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("The selected CSV file appears to be empty or missing columns.");
        setCsvFile(null);
        return;
      }

      setParsedData(parsed);
      const autoMapped = autoMapInvoiceCSVHeaders(parsed.headers);
      setFieldMapping(autoMapped);

      toast.success(`Loaded ${parsed.totalRows} rows from ${file.name}`);
      setCurrentStep(2);
    };

    reader.onerror = () => {
      toast.error("Failed to read CSV file. Please try again.");
    };

    reader.readAsText(file);
  };

  // --- Step 2 -> 3: Transform Mapped Data into Review Rows ---
  const handleProceedToReview = () => {
    if (!parsedData) return;

    if (!fieldMapping.customerName || !fieldMapping.customerPhone || !fieldMapping.itemDescription || !fieldMapping.totalAmount) {
      toast.error("Please map the required fields: Customer Name, Phone, Item Description, and Total Amount.");
      return;
    }

    const transformedRows: EditableInvoiceRow[] = parsedData.rows.map((csvRow, idx) => {
      const getVal = (sysKey: string): string => {
        const headerName = fieldMapping[sysKey];
        if (!headerName) return "";
        const colIdx = parsedData.headers.indexOf(headerName);
        return colIdx !== -1 ? (csvRow[colIdx] || "").trim() : "";
      };

      const custName = getVal("customerName");
      const custPhone = getVal("customerPhone");
      const custEmail = getVal("customerEmail");
      const custGender = getVal("customerGender");
      const custCity = getVal("customerCity");
      const custAddress = getVal("customerAddress");

      const invoiceNum = getVal("invoiceNumber");
      const invoiceDt = getVal("invoiceDate") || defaultDate;
      const soldBy = getVal("soldBy");

      const itemDesc = getVal("itemDescription");
      const qty = getVal("quantity") || "1";
      const totalAmt = getVal("totalAmount") || "0";
      const unitRate = getVal("unitPrice") || (Number(totalAmt) > 0 && Number(qty) > 0 ? (Number(totalAmt) / Number(qty)).toFixed(2) : totalAmt);
      const discAmt = getVal("discountAmount") || "0";
      const taxPct = getVal("taxPercent") || "12";
      const taxAmt = getVal("taxAmount") || "0";

      const amtPaid = getVal("amountPaid") || totalAmt;
      const payMethod = getVal("paymentMethod") || defaultPaymentMethod;
      const payStatus = getVal("paymentStatus") || (Number(amtPaid) >= Number(totalAmt) ? "PAID" : Number(amtPaid) > 0 ? "PARTIALLY_PAID" : "PENDING");
      const fullStatus = getVal("fulfillmentStatus") || defaultFulfillmentStatus;
      const notes = getVal("notes");

      const rowCandidate = {
        id: `row-${idx}-${Date.now()}`,
        originalIndex: idx,
        customerName: custName,
        customerPhone: custPhone,
        customerEmail: custEmail,
        customerGender: custGender,
        customerCity: custCity,
        customerAddress: custAddress,
        invoiceNumber: invoiceNum,
        invoiceDate: invoiceDt,
        soldBy,
        itemDescription: itemDesc,
        quantity: qty,
        unitPrice: unitRate,
        discountAmount: discAmt,
        taxPercent: taxPct,
        taxAmount: taxAmt,
        totalAmount: totalAmt,
        amountPaid: amtPaid,
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        fulfillmentStatus: fullStatus,
        notes,
      };

      const val = validateRow(rowCandidate);

      return {
        ...rowCandidate,
        errors: val.errors,
        isValid: val.isValid,
        isCustomerMatch: val.isCustomerMatch,
        matchedCustomerName: val.matchedCustomerName,
        matchedRegId: val.matchedRegId,
        isDuplicateInvoiceNum: val.isDuplicateInvoiceNum,
      };
    });

    setRows(transformedRows);
    setCurrentStep(3);
    setCurrentPage(1);
  };

  // --- Step 3: Inline Cell Editor Handler ---
  const handleUpdateRowCell = (
    rowId: string,
    field: keyof EditableInvoiceRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        const updated = { ...r, [field]: value };
        const val = validateRow(updated);

        return {
          ...updated,
          errors: val.errors,
          isValid: val.isValid,
          isCustomerMatch: val.isCustomerMatch,
          matchedCustomerName: val.matchedCustomerName,
          matchedRegId: val.matchedRegId,
          isDuplicateInvoiceNum: val.isDuplicateInvoiceNum,
        };
      })
    );
  };

  // Delete row from review table
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    toast.info("Invoice row removed from import batch.");
  };

  // Auto-suffix duplicate invoice numbers with "-OLD"
  const handleFixDuplicateInvoiceNumbers = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.isDuplicateInvoiceNum) return r;
        const newNum = `${r.invoiceNumber}-OLD`;
        const updated = { ...r, invoiceNumber: newNum };
        const val = validateRow(updated);
        return {
          ...updated,
          errors: val.errors,
          isValid: val.isValid,
          isCustomerMatch: val.isCustomerMatch,
          matchedCustomerName: val.matchedCustomerName,
          matchedRegId: val.matchedRegId,
          isDuplicateInvoiceNum: val.isDuplicateInvoiceNum,
        };
      })
    );
    toast.success("Duplicate invoice numbers updated with '-OLD' suffix.");
  };

  // Filtering & Pagination
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterErrorsOnly && r.isValid) return false;
      if (filterNewCustomersOnly && r.isCustomerMatch) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = r.customerName.toLowerCase().includes(q);
        const matchPhone = r.customerPhone.includes(q);
        const matchDesc = r.itemDescription.toLowerCase().includes(q);
        const matchInv = r.invoiceNumber.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchDesc && !matchInv) return false;
      }
      return true;
    });
  }, [rows, filterErrorsOnly, filterNewCustomersOnly, searchFilter]);

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // Aggregate Review Metrics
  const reviewStats = useMemo(() => {
    let validCount = 0;
    let errorCount = 0;
    let existingCustCount = 0;
    let newCustCount = 0;
    let duplicateInvCount = 0;
    let totalRevenue = 0;
    let totalPaid = 0;

    for (const r of rows) {
      if (r.isValid) validCount++;
      else errorCount++;

      if (r.isCustomerMatch) existingCustCount++;
      else newCustCount++;

      if (r.isDuplicateInvoiceNum) duplicateInvCount++;

      totalRevenue += Number(r.totalAmount) || 0;
      totalPaid += Number(r.amountPaid) || 0;
    }

    // Approximate unique invoices (by invoiceNumber or phone+date)
    const uniqueInvoices = new Set(
      rows.map((r) => (r.invoiceNumber.trim() ? r.invoiceNumber.toLowerCase().trim() : `${r.customerPhone}:${r.invoiceDate}`))
    );

    return {
      totalRows: rows.length,
      validCount,
      errorCount,
      existingCustCount,
      newCustCount,
      duplicateInvCount,
      totalInvoices: uniqueInvoices.size,
      totalRevenue,
      totalPaid,
      totalDues: Math.max(0, totalRevenue - totalPaid),
    };
  }, [rows]);

  // --- Step 4: Execute Batch Ingestion ---
  const handleExecuteImport = async () => {
    if (rows.length === 0) {
      toast.error("No invoice rows available to import.");
      return;
    }

    const invalidRows = rows.filter((r) => !r.isValid);
    if (invalidRows.length > 0) {
      toast.error(`Please resolve errors on ${invalidRows.length} rows before importing.`);
      setFilterErrorsOnly(true);
      return;
    }

    setIsSubmitting(true);
    setImportProgress(15);

    try {
      const recordsPayload: BulkInvoiceItemInput[] = rows.map((r) => ({
        customerName: r.customerName.trim(),
        customerPhone: r.customerPhone.trim(),
        customerEmail: r.customerEmail.trim() || null,
        customerGender: (r.customerGender.toUpperCase() === "MALE" || r.customerGender.toUpperCase() === "FEMALE" || r.customerGender.toUpperCase() === "OTHER") ? r.customerGender.toUpperCase() as any : null,
        customerCity: r.customerCity.trim() || null,
        customerAddress: r.customerAddress.trim() || null,
        invoiceNumber: r.invoiceNumber.trim() || null,
        invoiceDate: r.invoiceDate.trim() || defaultDate,
        soldBy: r.soldBy.trim() || null,
        itemDescription: r.itemDescription.trim(),
        quantity: Number(r.quantity) || 1,
        unitPrice: Number(r.unitPrice) || 0,
        discountAmount: Number(r.discountAmount) || 0,
        taxPercent: Number(r.taxPercent) || 0,
        taxAmount: Number(r.taxAmount) || 0,
        totalAmount: Number(r.totalAmount) || 0,
        amountPaid: Number(r.amountPaid) || 0,
        paymentMethod: (r.paymentMethod.toUpperCase() === "CASH" || r.paymentMethod.toUpperCase() === "CARD" || r.paymentMethod.toUpperCase() === "UPI" || r.paymentMethod.toUpperCase() === "BANK_TRANSFER") ? r.paymentMethod.toUpperCase() as any : defaultPaymentMethod,
        paymentStatus: (r.paymentStatus.toUpperCase() === "PAID" || r.paymentStatus.toUpperCase() === "PARTIALLY_PAID" || r.paymentStatus.toUpperCase() === "PENDING") ? r.paymentStatus.toUpperCase() as any : null,
        fulfillmentStatus: (r.fulfillmentStatus.toUpperCase() === "DELIVERED" || r.fulfillmentStatus.toUpperCase() === "READY" || r.fulfillmentStatus.toUpperCase() === "PROCESSING") ? r.fulfillmentStatus.toUpperCase() as any : defaultFulfillmentStatus,
        notes: r.notes.trim() || null,
      }));

      setImportProgress(45);

      const res = await bulkImportInvoicesAction(shopId, {
        shopId,
        records: recordsPayload,
        defaultDate,
        defaultPaymentMethod,
        defaultFulfillmentStatus,
        autoCreateCustomers,
      });

      setImportProgress(100);

      if (res.success) {
        setImportResult({
          success: true,
          invoicesCount: res.invoicesCount || reviewStats.totalInvoices,
          itemsCount: res.itemsCount || reviewStats.totalRows,
          newCustomersCount: res.newCustomersCount || reviewStats.newCustCount,
          existingCustomersCount: res.existingCustomersCount || reviewStats.existingCustCount,
          totalRevenue: res.totalRevenue || reviewStats.totalRevenue,
          firstInvoiceNum: res.firstInvoiceNum,
          lastInvoiceNum: res.lastInvoiceNum,
          message: res.message,
        });
        setCurrentStep(4);
        toast.success(res.message);
      } else {
        toast.error(res.message || "Failed to import invoices.");
      }
    } catch (err: any) {
      console.error("Bulk invoices import error:", err);
      toast.error(err?.message || "Unexpected error occurred during import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-slate-800">
      {/* 1. Header Bar with Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Bulk Invoices Import
              </h1>
              <Badge className="bg-blue-50 text-[#2563eb] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                CSV Ingestion
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Import historical sales bills and auto-link or create customer profiles for {shopName}.
            </p>
          </div>
        </div>

        {/* Wizard Step Progress Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { step: 1, label: "Upload" },
            { step: 2, label: "Mapping" },
            { step: 3, label: "Review & Match" },
            { step: 4, label: "Complete" },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentStep === s.step
                  ? "bg-[#0a52c3] text-white shadow-xs shadow-[#0a52c3]/20"
                  : currentStep > s.step
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span>{s.step}</span>
              <span className="hidden md:inline">{s.label}</span>
              {currentStep > s.step && <Check className="h-3 w-3 ml-0.5" />}
            </div>
          ))}
        </div>
      </div>

      {/* --- STAGE 1: Upload CSV & Default Inward Rules --- */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Dropzone */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-8 border-2 border-dashed border-slate-200 hover:border-[#0a52c3]/50 transition-all rounded-2xl bg-white text-center shadow-xs">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                className={`py-8 px-4 flex flex-col items-center justify-center cursor-pointer rounded-xl transition-colors ${
                  isDragging ? "bg-blue-50/60" : ""
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-[#0a52c3] flex items-center justify-center mb-4 shadow-inner">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Upload Historical Invoices CSV
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Drag and drop your spreadsheet file here, or click to browse. Supports standard Excel/CSV exports up to 10MB.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="font-bold text-xs uppercase tracking-wider border-slate-200 rounded-xl px-5 h-9"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-slate-400" />
                  Select .CSV File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </Card>

            {/* Template Download Card */}
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Need the formatted template?
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Download our sample optical invoices CSV with customer details, item rates, and tax columns.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={downloadSampleInvoiceCSV}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 mr-1.5 text-slate-400" />
                Sample CSV
              </Button>
            </div>
          </div>

          {/* Right Column: Inward Defaults Configuration */}
          <div className="space-y-4">
            <Card className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="h-4 w-4 text-[#0a52c3]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Default Inward Settings
                </h3>
              </div>

              {/* Default Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Default Payment Mode
                </label>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  Used if payment mode column is missing or blank in CSV.
                </span>
              </div>

              {/* Default Fulfillment Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Default Delivery Status
                </label>
                <select
                  value={defaultFulfillmentStatus}
                  onChange={(e) => setDefaultFulfillmentStatus(e.target.value as any)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none bg-white cursor-pointer"
                >
                  <option value="DELIVERED">Delivered (Standard for historical bills)</option>
                  <option value="READY">Ready for Pickup</option>
                  <option value="PROCESSING">Processing / In Workshop</option>
                </select>
              </div>

              {/* Default Invoice Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Default Invoice Date
                </label>
                <input
                  type="date"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none bg-white"
                />
              </div>

              {/* Auto Create Customers Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="autoCustToggle"
                  checked={autoCreateCustomers}
                  onChange={(e) => setAutoCreateCustomers(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0a52c3] mt-0.5 cursor-pointer"
                />
                <label htmlFor="autoCustToggle" className="cursor-pointer">
                  <span className="block text-xs font-bold text-slate-800">
                    Auto-Register New Patients
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    If customer mobile is not found, automatically register a patient profile with generated registration ID.
                  </span>
                </label>
              </div>
            </Card>

            {/* Smart Safeguards Callout */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0a52c3]">
                <Sparkles className="h-4 w-4" />
                <span>Zero Latency & Legacy Integrity</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Existing bill numbers are 100% preserved. Missing invoice numbers are auto-assigned sequential series IDs. Duplicate invoice numbers will be highlighted on Step 3 for inline correction.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- STAGE 2: Column Mapping --- */}
      {currentStep === 2 && parsedData && (
        <Card className="p-6 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Match CSV Columns to Invoice Fields
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review automated column mappings and adjust any fields before loading into the spreadsheet editor.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 rounded-xl"
              >
                Change File
              </Button>
              <Button
                onClick={handleProceedToReview}
                className="h-9 px-4 text-xs font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white rounded-xl shadow-xs"
              >
                <span>Proceed to Review</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INVOICE_SYSTEM_FIELDS.map((field) => {
              const currentMappedHeader = fieldMapping[field.key] || "";
              const sampleVal = currentMappedHeader
                ? parsedData.rows[0]?.[parsedData.headers.indexOf(currentMappedHeader)] || ""
                : "";

              return (
                <div
                  key={field.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    currentMappedHeader
                      ? "bg-slate-50/60 border-slate-200"
                      : field.required
                      ? "bg-rose-50/20 border-rose-200"
                      : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-500 font-extrabold">*</span>}
                    </label>
                    {currentMappedHeader ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold py-0 h-4">
                        Mapped
                      </Badge>
                    ) : field.required ? (
                      <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[9px] font-bold py-0 h-4">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400">Optional</span>
                    )}
                  </div>

                  <select
                    value={currentMappedHeader}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFieldMapping((prev) => ({
                        ...prev,
                        [field.key]: val,
                      }));
                    }}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Do Not Map / Ignore --</option>
                    {parsedData.headers.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>

                  {sampleVal && (
                    <p className="text-[10px] text-slate-400 truncate mt-1">
                      Sample: <span className="font-semibold text-slate-600">{sampleVal}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* --- STAGE 3: High-Density Spreadsheet Review & Smart Verification --- */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Telemetry KPI Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Invoices
              </span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                {reviewStats.totalInvoices}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {reviewStats.totalRows} items
              </span>
            </Card>

            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Existing Patients
              </span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                {reviewStats.existingCustCount}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Mapped to DB profile
              </span>
            </Card>

            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                New Patients
              </span>
              <span className="text-xl font-extrabold text-amber-600 mt-1 block">
                {reviewStats.newCustCount}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Will auto-register
              </span>
            </Card>

            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Revenue
              </span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                ₹{reviewStats.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
                ₹{reviewStats.totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Collected
              </span>
            </Card>

            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Dues
              </span>
              <span className="text-xl font-extrabold text-rose-600 mt-1 block">
                ₹{reviewStats.totalDues.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Balance receivable
              </span>
            </Card>

            <Card className="p-3.5 border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Validation Status
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl font-extrabold ${reviewStats.errorCount === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {reviewStats.errorCount === 0 ? "Ready" : `${reviewStats.errorCount} Errors`}
                </span>
              </div>
              {reviewStats.duplicateInvCount > 0 && (
                <button
                  type="button"
                  onClick={handleFixDuplicateInvoiceNumbers}
                  className="text-[10px] text-amber-600 font-bold underline mt-0.5 block text-left"
                >
                  Fix {reviewStats.duplicateInvCount} Dupes
                </button>
              )}
            </Card>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer, phone, invoice..."
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 h-8 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0a52c3]"
                />
              </div>

              {/* Error Toggle Filter */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterErrorsOnly(!filterErrorsOnly);
                  setCurrentPage(1);
                }}
                className={`h-8 text-xs font-bold rounded-lg border ${
                  filterErrorsOnly
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Errors ({reviewStats.errorCount})
              </Button>

              {/* New Customers Only Filter */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterNewCustomersOnly(!filterNewCustomersOnly);
                  setCurrentPage(1);
                }}
                className={`h-8 text-xs font-bold rounded-lg border ${
                  filterNewCustomersOnly
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                New Patients ({reviewStats.newCustCount})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="h-8 text-xs font-bold border-slate-200 rounded-lg"
              >
                Edit Mapping
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={isSubmitting || reviewStats.errorCount > 0}
                className="h-8 px-4 text-xs font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white rounded-lg shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Commit Inward ({reviewStats.validCount} Valid)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* High-Density Spreadsheet Review Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Customer Profile</th>
                    <th className="py-2.5 px-3">Phone / Mobile</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold">
                        No rows match your current search/filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            !row.isValid ? "bg-rose-50/20" : ""
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-2 px-3 text-[10px] font-bold text-slate-400">
                            {globalIdx}
                          </td>

                          {/* Customer Name & Status Badge */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.customerName}
                              onChange={(e) => handleUpdateRowCell(row.id, "customerName", e.target.value)}
                              className={`h-7 px-2 border rounded font-semibold text-xs text-slate-800 w-full outline-none focus:border-[#0a52c3] ${
                                row.errors.customerName ? "border-rose-300 bg-rose-50/50" : "border-slate-200"
                              }`}
                            />
                            <div className="flex items-center gap-1.5 mt-1">
                              {row.isCustomerMatch ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold py-0 h-4">
                                  <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                                  Existing ({row.matchedRegId || "Matched"})
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold py-0 h-4">
                                  <UserPlus className="h-2.5 w-2.5 mr-0.5" />
                                  Auto-Register
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              maxLength={10}
                              value={row.customerPhone}
                              onChange={(e) => handleUpdateRowCell(row.id, "customerPhone", e.target.value)}
                              className={`h-7 px-2 border rounded font-mono text-xs text-slate-700 w-28 outline-none focus:border-[#0a52c3] ${
                                row.errors.customerPhone ? "border-rose-300 bg-rose-50/50 text-rose-600 font-bold" : "border-slate-200"
                              }`}
                            />
                            {row.errors.customerPhone && (
                              <span className="text-[9px] text-rose-500 font-semibold block mt-0.5">
                                {row.errors.customerPhone}
                              </span>
                            )}
                          </td>

                          {/* Invoice Number */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Auto-Series"
                              value={row.invoiceNumber}
                              onChange={(e) => handleUpdateRowCell(row.id, "invoiceNumber", e.target.value)}
                              className={`h-7 px-2 border rounded font-mono text-xs text-slate-700 w-32 outline-none focus:border-[#0a52c3] ${
                                row.isDuplicateInvoiceNum ? "border-rose-300 bg-rose-50/50 text-rose-600 font-bold" : "border-slate-200"
                              }`}
                            />
                            {row.isDuplicateInvoiceNum && (
                              <span className="text-[9px] text-rose-500 font-semibold block mt-0.5">
                                Exists in DB
                              </span>
                            )}
                          </td>

                          {/* Invoice Date */}
                          <td className="py-2 px-3">
                            <input
                              type="date"
                              value={row.invoiceDate}
                              onChange={(e) => handleUpdateRowCell(row.id, "invoiceDate", e.target.value)}
                              className="h-7 px-1.5 border border-slate-200 rounded text-xs text-slate-700 outline-none w-28"
                            />
                          </td>

                          {/* Item Description */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.itemDescription}
                              onChange={(e) => handleUpdateRowCell(row.id, "itemDescription", e.target.value)}
                              className={`h-7 px-2 border rounded text-xs text-slate-700 w-full outline-none focus:border-[#0a52c3] ${
                                row.errors.itemDescription ? "border-rose-300 bg-rose-50/50" : "border-slate-200"
                              }`}
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={row.quantity}
                              onChange={(e) => handleUpdateRowCell(row.id, "quantity", e.target.value)}
                              className="h-7 px-1.5 border border-slate-200 rounded text-xs text-right text-slate-700 w-14 outline-none"
                            />
                          </td>

                          {/* Total Amount */}
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.totalAmount}
                              onChange={(e) => handleUpdateRowCell(row.id, "totalAmount", e.target.value)}
                              className={`h-7 px-1.5 border rounded text-xs text-right font-bold text-slate-800 w-20 outline-none ${
                                row.errors.totalAmount ? "border-rose-300 bg-rose-50/50" : "border-slate-200"
                              }`}
                            />
                          </td>

                          {/* Amount Paid */}
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.amountPaid}
                              onChange={(e) => handleUpdateRowCell(row.id, "amountPaid", e.target.value)}
                              className="h-7 px-1.5 border border-slate-200 rounded text-xs text-right font-semibold text-emerald-700 w-20 outline-none"
                            />
                          </td>

                          {/* Payment Status Pill */}
                          <td className="py-2 px-3">
                            <select
                              value={row.paymentStatus}
                              onChange={(e) => handleUpdateRowCell(row.id, "paymentStatus", e.target.value)}
                              className="h-7 px-1.5 border border-slate-200 rounded text-[11px] font-bold text-slate-700 outline-none bg-white cursor-pointer"
                            >
                              <option value="PAID">PAID</option>
                              <option value="PARTIALLY_PAID">PARTIAL</option>
                              <option value="PENDING">PENDING</option>
                            </select>
                          </td>

                          {/* Actions Column */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedRowDetails(row)}
                                className="p-1 text-slate-400 hover:text-[#0a52c3] rounded hover:bg-slate-100 transition-colors"
                                title="View/Edit Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                title="Remove Row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500">
              <span>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)} of {filteredRows.length} rows
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-7 px-2.5 text-xs font-bold border-slate-200"
                >
                  Prev
                </Button>
                <span className="font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-7 px-2.5 text-xs font-bold border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- STAGE 4: Completion & Success Feedback --- */}
      {currentStep === 4 && importResult && (
        <Card className="p-8 border border-slate-200 rounded-2xl bg-white shadow-xs text-center max-w-2xl mx-auto space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Historical Invoices Ingestion Complete!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              All validated invoices and items have been atomically committed into your store database.
            </p>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Invoices Created
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                {importResult.invoicesCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                New Patients
              </span>
              <span className="text-lg font-extrabold text-amber-600 mt-1 block">
                {importResult.newCustomersCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Existing Mapped
              </span>
              <span className="text-lg font-extrabold text-emerald-600 mt-1 block">
                {importResult.existingCustomersCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Revenue
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                ₹{importResult.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => router.push("/shop/orders")}
              className="w-full sm:w-auto h-10 px-5 text-xs font-bold bg-[#0a52c3] hover:bg-[#004bb5] text-white rounded-xl shadow-xs"
            >
              <Receipt className="h-4 w-4 mr-2" />
              View Orders & Sales
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/shop/customers")}
              className="w-full sm:w-auto h-10 px-5 text-xs font-bold border-slate-200 rounded-xl text-slate-700"
            >
              <UserCheck className="h-4 w-4 mr-2 text-slate-400" />
              View Customer Directory
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCsvFile(null);
                setParsedData(null);
                setRows([]);
                setCurrentStep(1);
              }}
              className="w-full sm:w-auto h-10 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Import Another CSV
            </Button>
          </div>
        </Card>
      )}

      {/* --- Extended Details Modal --- */}
      {selectedRowDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#0a52c3]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Invoice & Customer Specifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetails(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={selectedRowDetails.customerEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, customerEmail: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "customerEmail", val);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={selectedRowDetails.customerCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, customerCity: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "customerCity", val);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Customer Address
                </label>
                <input
                  type="text"
                  value={selectedRowDetails.customerAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, customerAddress: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "customerAddress", val);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Sold By / Salesperson
                </label>
                <input
                  type="text"
                  value={selectedRowDetails.soldBy}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, soldBy: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "soldBy", val);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Payment Mode
                </label>
                <select
                  value={selectedRowDetails.paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, paymentMethod: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "paymentMethod", val);
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg outline-none bg-white cursor-pointer font-bold text-slate-700"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Prescription / Bill Notes
                </label>
                <textarea
                  rows={2}
                  value={selectedRowDetails.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRowDetails((prev) => prev ? { ...prev, notes: val } : null);
                    handleUpdateRowCell(selectedRowDetails.id, "notes", val);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                size="sm"
                onClick={() => setSelectedRowDetails(null)}
                className="h-8 px-4 text-xs font-bold bg-[#0a52c3] text-white rounded-lg"
              >
                Close & Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
