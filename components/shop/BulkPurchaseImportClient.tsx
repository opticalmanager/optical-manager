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
  PackagePlus,
  Package,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseCSV,
  autoMapPurchaseCSVHeaders,
  downloadSamplePurchaseCSV,
  PURCHASE_SYSTEM_FIELDS,
  type ParsedCSV,
} from "@/utils/csv-parser";
import { createPurchaseFromCsvAction } from "@/actions/purchase.actions";
import { Vendor, InventoryItem } from "@/types";
import { CategoryItem } from "@/services/category.service";

interface BulkPurchaseImportClientProps {
  shopId: string;
  shopName: string;
  vendors: Vendor[];
  categories: CategoryItem[];
  existingInventory?: {
    id: string;
    productCode: string | null;
    name: string;
    category: string;
    price: string;
    costPrice: string | null;
    quantity: number;
    brand?: string | null;
    model?: string | null;
  }[];
}

export interface EditablePurchaseRow {
  id: string; // unique row id
  originalIndex: number;
  productCode: string;
  productName: string;
  category: string;
  brand: string;
  model: string;
  quantity: number | "";
  unitPrice: number | "";
  retailPrice: number | "";
  gstPercent: number | "";
  hsnCode: string;
  rackLocation: string;
  details: string;

  // Extended specs for new items
  frameSpecs?: {
    gender?: string;
    color?: string;
    size?: string;
    type?: string;
    material?: string;
    frameShape?: string;
    modelNumber?: string;
  };
  lensSpecs?: {
    design?: string;
    refractiveIndex?: string;
    lensMaterial?: string;
    blankDiameter?: number;
    stockPower?: string;
    isUncoated?: boolean;
    isAntiReflective?: boolean;
    isBlueControl?: boolean;
    isTinted?: boolean;
    isPolarized?: boolean;
    isHardCoat?: boolean;
    isPhotochromic?: boolean;
  };
  contactLensSpecs?: {
    modality?: string;
    boxQuantity?: number;
    baseCurve?: string;
    diameter?: string;
    color?: string;
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addPower?: string;
  };

  // State calculations
  isCatalogMatch: boolean;
  matchedItemName?: string;
  errors: Record<string, string>;
  isValid: boolean;
}

export function BulkPurchaseImportClient({
  shopId,
  shopName,
  vendors,
  categories,
  existingInventory = [],
}: BulkPurchaseImportClientProps) {
  const router = useRouter();

  // 1 = Upload, 2 = Mapping, 3 = Review & Fix, 4 = Ingest & Result
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field Mapping state: systemFieldKey -> csvHeaderName
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // Purchase Bill Header parameters
  const [vendorName, setVendorName] = useState(vendors[0]?.name || "");
  const [vendorId, setVendorId] = useState<string | null>(vendors[0]?.id || null);
  const [purchaseNumber, setPurchaseNumber] = useState(
    `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`
  );
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [taxRule, setTaxRule] = useState<"EXCLUDE" | "INCLUDE">("EXCLUDE");
  const [taxType, setTaxType] = useState<"SGST_CGST" | "IGST">("SGST_CGST");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  // Review Table state
  const [rows, setRows] = useState<EditablePurchaseRow[]>([]);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Selected row for extended specs modal
  const [activeSpecsRowId, setActiveSpecsRowId] = useState<string | null>(null);

  // Import execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    purchaseNumber?: string;
    totalQuantity?: number;
    totalPurchase?: number;
    itemsCreated?: number;
    itemsUpdated?: number;
    message: string;
  } | null>(null);

  // Inventory lookup map for instant 0ms catalog check
  const inventoryCodeMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; price: string; costPrice: string | null }>();
    for (const item of existingInventory) {
      if (item.productCode) {
        map.set(item.productCode.toLowerCase().trim(), item);
      }
    }
    return map;
  }, [existingInventory]);

  // Default categories map for GST fallback
  const categoryGstMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      map.set(cat.code.toUpperCase(), Number(cat.cgstPercent || 0) + Number(cat.sgstPercent || 0));
    }
    return map;
  }, [categories]);

  // --- Row Validator Helper ---
  const validateRow = (
    row: Omit<EditablePurchaseRow, "errors" | "isValid" | "isCatalogMatch" | "matchedItemName">
  ): { errors: Record<string, string>; isValid: boolean; isCatalogMatch: boolean; matchedItemName?: string } => {
    const errors: Record<string, string> = {};

    // 1. Product Code: required
    if (!row.productCode.trim()) {
      errors.productCode = "Code is required.";
    }

    // 2. Product Name: required
    if (!row.productName.trim()) {
      errors.productName = "Name is required.";
    }

    // 3. Quantity: required > 0
    if (row.quantity === "" || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
      errors.quantity = "Qty must be at least 1.";
    }

    // 4. Unit Price: required >= 0
    if (row.unitPrice === "" || isNaN(Number(row.unitPrice)) || Number(row.unitPrice) < 0) {
      errors.unitPrice = "Cost must be >= 0.";
    }

    // 5. Retail Price: >= 0 if provided
    if (row.retailPrice !== "" && (isNaN(Number(row.retailPrice)) || Number(row.retailPrice) < 0)) {
      errors.retailPrice = "Retail price must be >= 0.";
    }

    // Check catalog presence
    const match = inventoryCodeMap.get(row.productCode.toLowerCase().trim());
    const isCatalogMatch = Boolean(match);
    const matchedItemName = match?.name;

    const isValid = Object.keys(errors).length === 0;
    return { errors, isValid, isCatalogMatch, matchedItemName };
  };

  // --- File Upload & Parse Handlers ---
  const handleFileProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please select a valid CSV file (.csv format).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("The selected CSV file is empty or formatted incorrectly.");
        return;
      }

      setCsvFile(file);
      setParsedData(parsed);

      // Auto-map headers
      const autoMap = autoMapPurchaseCSVHeaders(parsed.headers);
      setFieldMapping(autoMap);

      toast.success(`Loaded ${parsed.totalRows} product rows from "${file.name}"`);
      setCurrentStep(2);
    };

    reader.onerror = () => {
      toast.error("Failed to read CSV file.");
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // --- Step 2 -> Step 3: Populate Rows from Mapping ---
  const proceedToReview = () => {
    if (!parsedData) return;

    if (!fieldMapping.productCode) {
      toast.error("Please map the 'Product Code / Barcode' field to continue.");
      return;
    }
    if (!fieldMapping.productName) {
      toast.error("Please map the 'Product Name' field to continue.");
      return;
    }
    if (!fieldMapping.quantity) {
      toast.error("Please map the 'Quantity' field to continue.");
      return;
    }
    if (!fieldMapping.unitPrice) {
      toast.error("Please map the 'Cost Price / Unit Rate' field to continue.");
      return;
    }

    const codeIdx = parsedData.headers.indexOf(fieldMapping.productCode);
    const nameIdx = parsedData.headers.indexOf(fieldMapping.productName);
    const qtyIdx = parsedData.headers.indexOf(fieldMapping.quantity);
    const costIdx = parsedData.headers.indexOf(fieldMapping.unitPrice);
    const retailIdx = fieldMapping.retailPrice ? parsedData.headers.indexOf(fieldMapping.retailPrice) : -1;
    const catIdx = fieldMapping.category ? parsedData.headers.indexOf(fieldMapping.category) : -1;
    const gstIdx = fieldMapping.gstPercent ? parsedData.headers.indexOf(fieldMapping.gstPercent) : -1;
    const hsnIdx = fieldMapping.hsnCode ? parsedData.headers.indexOf(fieldMapping.hsnCode) : -1;
    const brandIdx = fieldMapping.brand ? parsedData.headers.indexOf(fieldMapping.brand) : -1;
    const modelIdx = fieldMapping.model ? parsedData.headers.indexOf(fieldMapping.model) : -1;
    const rackIdx = fieldMapping.rackLocation ? parsedData.headers.indexOf(fieldMapping.rackLocation) : -1;
    const detailsIdx = fieldMapping.details ? parsedData.headers.indexOf(fieldMapping.details) : -1;

    const newRows: EditablePurchaseRow[] = parsedData.rows.map((csvRow, idx) => {
      const rawCode = codeIdx !== -1 ? (csvRow[codeIdx] || "").trim() : "";
      const rawName = nameIdx !== -1 ? (csvRow[nameIdx] || "").trim() : "";
      const rawQty = qtyIdx !== -1 ? parseInt(csvRow[qtyIdx] || "1", 10) : 1;
      const rawCost = costIdx !== -1 ? parseFloat(csvRow[costIdx] || "0") : 0;
      const rawRetail = retailIdx !== -1 && csvRow[retailIdx] ? parseFloat(csvRow[retailIdx]) : rawCost;

      let rawCat = catIdx !== -1 && csvRow[catIdx] ? csvRow[catIdx].trim().toUpperCase() : "FRAME";
      if (!["FRAME", "LENS", "CONTACT_LENS", "ACCESSORY", "SOLUTION"].includes(rawCat)) {
        if (rawCat.includes("LENS") && !rawCat.includes("CONTACT")) rawCat = "LENS";
        else if (rawCat.includes("CONTACT")) rawCat = "CONTACT_LENS";
        else if (rawCat.includes("SOL")) rawCat = "SOLUTION";
        else if (rawCat.includes("ACC") || rawCat.includes("CASE")) rawCat = "ACCESSORY";
        else rawCat = "FRAME";
      }

      const defaultGst = categoryGstMap.get(rawCat) || (rawCat === "SOLUTION" || rawCat === "ACCESSORY" ? 18 : 12);
      const rawGst = gstIdx !== -1 && csvRow[gstIdx] ? parseFloat(csvRow[gstIdx]) : defaultGst;

      const baseRow = {
        id: `row-${idx}-${Date.now()}`,
        originalIndex: idx + 1,
        productCode: rawCode,
        productName: rawName,
        category: rawCat,
        brand: brandIdx !== -1 ? (csvRow[brandIdx] || "").trim() : "",
        model: modelIdx !== -1 ? (csvRow[modelIdx] || "").trim() : "",
        quantity: isNaN(rawQty) ? 1 : rawQty,
        unitPrice: isNaN(rawCost) ? 0 : rawCost,
        retailPrice: isNaN(rawRetail) ? (isNaN(rawCost) ? 0 : rawCost) : rawRetail,
        gstPercent: isNaN(rawGst) ? defaultGst : rawGst,
        hsnCode: hsnIdx !== -1 ? (csvRow[hsnIdx] || "").trim() : (rawCat === "LENS" ? "9001" : "9004"),
        rackLocation: rackIdx !== -1 ? (csvRow[rackIdx] || "").trim() : "",
        details: detailsIdx !== -1 ? (csvRow[detailsIdx] || "").trim() : "",
      };

      const validation = validateRow(baseRow);

      return {
        ...baseRow,
        isCatalogMatch: validation.isCatalogMatch,
        matchedItemName: validation.matchedItemName,
        errors: validation.errors,
        isValid: validation.isValid,
      };
    });

    setRows(newRows);
    setCurrentPage(1);
    setCurrentStep(3);
    toast.success(`Prepared ${newRows.length} purchase line items for review.`);
  };

  // --- Inline Cell Editing ---
  const handleCellChange = (
    rowId: string,
    field: keyof EditablePurchaseRow,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        const updated = { ...r, [field]: value };
        const validation = validateRow(updated);

        return {
          ...updated,
          isCatalogMatch: validation.isCatalogMatch,
          matchedItemName: validation.matchedItemName,
          errors: validation.errors,
          isValid: validation.isValid,
        };
      })
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    toast.info("Line item removed.");
  };

  // --- Financial & Review Summary Calculations ---
  const summaryTotals = useMemo(() => {
    let totalQty = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let totalPurchaseVal = 0;
    let validCount = 0;
    let invalidCount = 0;
    let catalogMatchCount = 0;

    for (const r of rows) {
      if (r.isValid) validCount++;
      else invalidCount++;

      if (r.isCatalogMatch) catalogMatchCount++;

      const qty = Number(r.quantity) || 0;
      const cost = Number(r.unitPrice) || 0;
      const gstRate = Number(r.gstPercent) || 0;

      let basePrice = cost;
      let lineGst = 0;

      if (taxRule === "INCLUDE" && gstRate > 0) {
        basePrice = cost / (1 + gstRate / 100);
        lineGst = cost - basePrice;
      } else {
        basePrice = cost;
        lineGst = (basePrice * gstRate) / 100;
      }

      const lineTotal = (basePrice + lineGst) * qty;

      totalQty += qty;
      totalTaxable += basePrice * qty;
      totalGst += lineGst * qty;
      totalPurchaseVal += lineTotal;
    }

    return {
      totalRows: rows.length,
      validCount,
      invalidCount,
      catalogMatchCount,
      newItemsCount: rows.length - catalogMatchCount,
      totalQty,
      totalTaxable,
      totalGst,
      totalPurchaseVal,
    };
  }, [rows, taxRule]);

  // --- Filtered and Paginated Rows ---
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterErrorsOnly && r.isValid) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          r.productCode.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterErrorsOnly, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // Active row being customized with extended specs
  const activeSpecsRow = useMemo(() => {
    return rows.find((r) => r.id === activeSpecsRowId) || null;
  }, [rows, activeSpecsRowId]);

  // --- Final Ingest Submission ---
  const handleFinalSubmit = async () => {
    if (summaryTotals.invalidCount > 0) {
      toast.error(
        `Please fix the ${summaryTotals.invalidCount} flagged row(s) before completing the inward purchase.`
      );
      setFilterErrorsOnly(true);
      return;
    }

    if (rows.length === 0) {
      toast.error("No valid product rows to inward.");
      return;
    }

    if (!vendorName.trim()) {
      toast.error("Please specify a supplier/vendor name.");
      return;
    }

    if (!purchaseNumber.trim()) {
      toast.error("Please specify a purchase invoice number.");
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(4);

    try {
      const payload = {
        vendorName: vendorName.trim(),
        vendorId,
        purchaseNumber: purchaseNumber.trim(),
        purchaseDate,
        taxRule,
        taxType,
        notes: purchaseNotes || `Inwarded from CSV spreadsheet (${rows.length} line items)`,
        items: rows.map((r) => ({
          productCode: r.productCode.trim(),
          productName: r.productName.trim(),
          category: r.category,
          brand: r.brand || undefined,
          model: r.model || undefined,
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
          retailPrice: Number(r.retailPrice),
          gstPercent: Number(r.gstPercent),
          hsnCode: r.hsnCode || undefined,
          rackLocation: r.rackLocation || undefined,
          details: r.details || undefined,
          frameSpecs: r.frameSpecs,
          lensSpecs: r.lensSpecs,
          contactLensSpecs: r.contactLensSpecs,
        })),
      };

      const result = await createPurchaseFromCsvAction(payload);

      if (result.success) {
        setImportResult({
          success: true,
          purchaseNumber: result.purchaseNumber,
          totalQuantity: result.totalQuantity,
          totalPurchase: result.totalPurchase,
          itemsCreated: result.itemsCreated,
          itemsUpdated: result.itemsUpdated,
          message: result.message,
        });
        toast.success(result.message);
      } else {
        setImportResult({
          success: false,
          message: result.message || "Failed to process bulk purchase.",
        });
        toast.error(result.message);
      }
    } catch (err: any) {
      console.error("[BulkPurchaseImport] Ingestion error:", err);
      setImportResult({
        success: false,
        message: err.message || "An unexpected error occurred during import.",
      });
      toast.error("Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/shop/inventory"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
            </Link>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-[#2563eb]" />
            Bulk Purchase &amp; Inventory Inward via CSV
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Refill existing stock or ingest new product catalogs in bulk with automated GST calculation and official purchase bill recording.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { num: 1, label: "Upload" },
            { num: 2, label: "Map" },
            { num: 3, label: "Review" },
            { num: 4, label: "Done" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === s.num
                    ? "bg-[#2563eb] text-white shadow-sm ring-2 ring-blue-500/20"
                    : currentStep > s.num
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {currentStep > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span
                className={`text-xs font-bold hidden sm:inline ${
                  currentStep === s.num
                    ? "text-slate-900"
                    : currentStep > s.num
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {s.num < 4 && <span className="text-slate-300 text-xs px-1">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ================= STEP 1: UPLOAD CSV ================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#2563eb] bg-blue-50/50 scale-[1.005]"
                : "border-slate-300 bg-white hover:border-[#2563eb]/60 hover:bg-slate-50/40 shadow-xs"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] mb-4 shadow-inner">
              <UploadCloud className="h-7 w-7" />
            </div>

            <h3 className="text-base font-bold text-slate-800 mb-1">
              Click to choose CSV file or drag and drop here
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Upload your supplier purchase order or stock catalog spreadsheet in CSV format. Max file size: 5 MB (up to 5,000 product rows).
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-9 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Browse Files
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSamplePurchaseCSV();
                }}
                className="h-9 px-3.5 text-xs font-semibold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Sample Template
              </Button>
            </div>
          </Card>

          {/* Guidelines Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                Recommended Purchase Import Guidelines:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                <li>
                  <strong>Product Code / Barcode</strong> is checked against your store catalog. Existing codes will refill stock; new codes will create brand-new items automatically.
                </li>
                <li>
                  Supported categories: <code>FRAME</code>, <code>LENS</code>, <code>CONTACT_LENS</code>, <code>ACCESSORY</code>, <code>SOLUTION</code>.
                </li>
                <li>
                  GST rates (e.g. 12% for spectacles/lenses, 18% for solutions) are split into CGST/SGST (or IGST) automatically.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: FIELD MAPPING ================= */}
      {currentStep === 2 && parsedData && (
        <div className="space-y-4">
          <Card className="p-5 bg-white border-slate-200 shadow-sm rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#2563eb]" />
                  Map CSV Columns to Purchase &amp; Inventory Fields
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify or adjust the column headers below. Required fields are marked with an asterisk.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-xs font-semibold">
                  {parsedData.totalRows} Total Rows
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-xs font-semibold">
                  {parsedData.headers.length} CSV Columns
                </Badge>
              </div>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {PURCHASE_SYSTEM_FIELDS.map((sysField) => {
                const selectedHeader = fieldMapping[sysField.key] || "";
                const headerIndex = selectedHeader
                  ? parsedData.headers.indexOf(selectedHeader)
                  : -1;
                const sampleValue =
                  headerIndex !== -1 && parsedData.rows[0]
                    ? parsedData.rows[0][headerIndex]
                    : "";

                return (
                  <div
                    key={sysField.key}
                    className={`p-3.5 rounded-xl border transition-all ${
                      sysField.required && !selectedHeader
                        ? "bg-rose-50/40 border-rose-200"
                        : selectedHeader
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-white border-slate-150"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          {sysField.label}
                        </label>
                        {sysField.required ? (
                          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                            Required *
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Optional
                          </span>
                        )}
                      </div>
                      {selectedHeader && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Matched
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 mb-2">
                      {sysField.description}
                    </p>

                    <select
                      value={selectedHeader}
                      onChange={(e) =>
                        setFieldMapping((prev) => ({
                          ...prev,
                          [sysField.key]: e.target.value,
                        }))
                      }
                      className={`w-full h-9 px-3 rounded-lg text-xs font-bold outline-none bg-white border cursor-pointer ${
                        sysField.required && !selectedHeader
                          ? "border-rose-300 text-rose-700 ring-2 ring-rose-100"
                          : "border-slate-200 text-slate-700 focus:border-[#2563eb]"
                      }`}
                    >
                      <option value="">-- Do Not Import / Skip --</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          Column: {header}
                        </option>
                      ))}
                    </select>

                    {sampleValue && (
                      <div className="mt-2 text-[10px] text-slate-500 bg-white/80 border border-slate-200/60 rounded px-2 py-1 truncate flex items-center gap-1">
                        <span className="text-slate-400 font-semibold">Row 1 Preview:</span>
                        <span className="font-mono text-slate-700 font-bold truncate">
                          &quot;{sampleValue}&quot;
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-10 px-4 font-bold text-xs rounded-xl cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>

              <Button
                onClick={proceedToReview}
                className="h-10 px-6 font-bold text-xs rounded-xl cursor-pointer bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm flex items-center gap-2"
              >
                <span>Continue to Data Review</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ================= STEP 3: REVIEW, EDIT & INWARD ================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Purchase Invoice Header Controls */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#2563eb]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Purchase Invoice Header Details
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                Shop: {shopName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Supplier / Vendor */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Supplier / Vendor *
                </label>
                <input
                  type="text"
                  list="vendor-datalist"
                  value={vendorName}
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    const found = vendors.find(
                      (v) => v.name.toLowerCase() === e.target.value.toLowerCase().trim()
                    );
                    setVendorId(found ? found.id : null);
                  }}
                  placeholder="e.g. Ray-Ban Luxottica"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#2563eb]"
                />
                <datalist id="vendor-datalist">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>

              {/* Purchase Bill Number */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Purchase Bill No. *
                </label>
                <input
                  type="text"
                  value={purchaseNumber}
                  onChange={(e) => setPurchaseNumber(e.target.value)}
                  placeholder="e.g. INV-9824"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-800 outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Tax Rule & Tax Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tax Rule
                  </label>
                  <select
                    value={taxRule}
                    onChange={(e) => setTaxRule(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none bg-white cursor-pointer"
                  >
                    <option value="EXCLUDE">Excl. Tax</option>
                    <option value="INCLUDE">Incl. Tax</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    GST Type
                  </label>
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none bg-white cursor-pointer"
                  >
                    <option value="SGST_CGST">CGST+SGST</option>
                    <option value="IGST">IGST (Inter)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Action & Stats Control Bar */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left KPI Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                  Total Items: <span className="font-extrabold">{summaryTotals.totalRows}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Units: <span className="font-extrabold">{summaryTotals.totalQty}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Refills: <span className="font-extrabold">{summaryTotals.catalogMatchCount}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700 flex items-center gap-1.5">
                  <PackagePlus className="h-3.5 w-3.5" />
                  New Products: <span className="font-extrabold">{summaryTotals.newItemsCount}</span>
                </div>
                {summaryTotals.invalidCount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Needs Attention: <span className="font-extrabold">{summaryTotals.invalidCount}</span>
                  </div>
                )}
              </div>

              {/* Right Filters & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative w-48 sm:w-60">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search code, name, category..."
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {summaryTotals.invalidCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterErrorsOnly(!filterErrorsOnly);
                      setCurrentPage(1);
                    }}
                    className={`h-9 px-3 text-xs font-bold rounded-xl cursor-pointer border ${
                      filterErrorsOnly
                        ? "bg-rose-50 border-rose-300 text-rose-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
                    {filterErrorsOnly ? "Showing Flagged Only" : `Errors (${summaryTotals.invalidCount})`}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* High-Density Editable Review Table */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50/80 border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">#</th>
                    <th className="px-3 py-3 min-w-[140px]">Product Code *</th>
                    <th className="px-3 py-3 min-w-[180px]">Product Name *</th>
                    <th className="px-3 py-3 min-w-[120px]">Category</th>
                    <th className="px-3 py-3 min-w-[130px]">Catalog Status</th>
                    <th className="px-3 py-3 min-w-[80px]">Qty *</th>
                    <th className="px-3 py-3 min-w-[100px]">Cost (₹) *</th>
                    <th className="px-3 py-3 min-w-[100px]">Retail (₹)</th>
                    <th className="px-3 py-3 min-w-[70px]">GST %</th>
                    <th className="px-3 py-3 min-w-[110px] text-right">Total (₹)</th>
                    <th className="px-3 py-3 min-w-[90px] text-center">Specs</th>
                    <th className="px-3 py-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => {
                      const hasCodeError = !!row.errors.productCode;
                      const hasNameError = !!row.errors.productName;
                      const hasQtyError = !!row.errors.quantity;
                      const hasCostError = !!row.errors.unitPrice;

                      const qty = Number(row.quantity) || 0;
                      const cost = Number(row.unitPrice) || 0;
                      const gstRate = Number(row.gstPercent) || 0;

                      let basePrice = cost;
                      let lineGst = 0;
                      if (taxRule === "INCLUDE" && gstRate > 0) {
                        basePrice = cost / (1 + gstRate / 100);
                        lineGst = cost - basePrice;
                      } else {
                        basePrice = cost;
                        lineGst = (basePrice * gstRate) / 100;
                      }
                      const lineTotal = (basePrice + lineGst) * qty;

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            !row.isValid ? "bg-rose-50/20" : "hover:bg-slate-50/50"
                          }`}
                        >
                          {/* Row Index */}
                          <td className="px-3 py-2 text-center text-slate-400 font-mono text-[10px]">
                            {row.originalIndex}
                          </td>

                          {/* Product Code */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.productCode}
                              onChange={(e) =>
                                handleCellChange(row.id, "productCode", e.target.value)
                              }
                              placeholder="Code / Barcode"
                              className={`w-full h-8 px-2.5 rounded-lg text-xs font-mono font-bold outline-none border transition-all ${
                                hasCodeError
                                  ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-400"
                                  : "border-slate-200 bg-white text-slate-800 focus:border-[#2563eb]"
                              }`}
                            />
                          </td>

                          {/* Product Name */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.productName}
                              onChange={(e) =>
                                handleCellChange(row.id, "productName", e.target.value)
                              }
                              placeholder="Item Name"
                              className={`w-full h-8 px-2.5 rounded-lg text-xs font-bold outline-none border transition-all ${
                                hasNameError
                                  ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-400"
                                  : "border-slate-200 bg-white text-slate-800 focus:border-[#2563eb]"
                              }`}
                            />
                          </td>

                          {/* Category */}
                          <td className="px-2 py-2">
                            <select
                              value={row.category}
                              onChange={(e) =>
                                handleCellChange(row.id, "category", e.target.value)
                              }
                              className="w-full h-8 px-2 rounded-lg text-xs font-bold outline-none border border-slate-200 bg-white text-slate-700 cursor-pointer"
                            >
                              <option value="FRAME">Frame</option>
                              <option value="LENS">Lens</option>
                              <option value="CONTACT_LENS">Contact Lens</option>
                              <option value="ACCESSORY">Accessory</option>
                              <option value="SOLUTION">Solution</option>
                            </select>
                          </td>

                          {/* Catalog Match Status Badge */}
                          <td className="px-3 py-2">
                            {row.isCatalogMatch ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                                title={`Catalog Match: ${row.matchedItemName || "Existing Item"}`}
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                Refill Stock
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold"
                                title="Will be registered as a new catalog product"
                              >
                                <Plus className="h-3 w-3 shrink-0" />
                                New Item
                              </span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleCellChange(
                                  row.id,
                                  "quantity",
                                  e.target.value === "" ? "" : parseInt(e.target.value, 10)
                                )
                              }
                              className={`w-full h-8 px-2 rounded-lg text-xs font-bold text-center outline-none border ${
                                hasQtyError
                                  ? "border-rose-400 bg-rose-50 text-rose-800"
                                  : "border-slate-200 bg-white text-slate-800"
                              }`}
                            />
                          </td>

                          {/* Cost Price */}
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unitPrice}
                              onChange={(e) =>
                                handleCellChange(
                                  row.id,
                                  "unitPrice",
                                  e.target.value === "" ? "" : parseFloat(e.target.value)
                                )
                              }
                              className={`w-full h-8 px-2 rounded-lg text-xs font-semibold text-right outline-none border ${
                                hasCostError
                                  ? "border-rose-400 bg-rose-50 text-rose-800"
                                  : "border-slate-200 bg-white text-slate-800"
                              }`}
                            />
                          </td>

                          {/* Retail Price */}
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.retailPrice}
                              onChange={(e) =>
                                handleCellChange(
                                  row.id,
                                  "retailPrice",
                                  e.target.value === "" ? "" : parseFloat(e.target.value)
                                )
                              }
                              className="w-full h-8 px-2 rounded-lg text-xs font-semibold text-right outline-none border border-slate-200 bg-white text-slate-800"
                            />
                          </td>

                          {/* GST % */}
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.gstPercent}
                              onChange={(e) =>
                                handleCellChange(
                                  row.id,
                                  "gstPercent",
                                  e.target.value === "" ? "" : parseFloat(e.target.value)
                                )
                              }
                              className="w-full h-8 px-1.5 rounded-lg text-xs font-semibold text-center outline-none border border-slate-200 bg-white text-slate-800"
                            />
                          </td>

                          {/* Total Purchase Amount */}
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                            ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Specs Button */}
                          <td className="px-2 py-2 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveSpecsRowId(row.id)}
                              className={`h-7 px-2 text-[10px] font-bold rounded-lg ${
                                row.frameSpecs || row.lensSpecs || row.contactLensSpecs
                                  ? "border-blue-300 bg-blue-50 text-[#2563eb]"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Sliders className="h-3 w-3 mr-1" />
                              {row.frameSpecs || row.lensSpecs || row.contactLensSpecs
                                ? "Specs ✓"
                                : "+ Specs"}
                            </Button>
                          </td>

                          {/* Delete Row Button */}
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        No product rows match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Summary Footer */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-semibold">
                Showing {Math.min(filteredRows.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to{" "}
                {Math.min(filteredRows.length, currentPage * ITEMS_PER_PAGE)} of {filteredRows.length} rows
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2 text-xs"
                  >
                    Prev
                  </Button>
                  <span className="text-xs font-bold text-slate-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2 text-xs"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Financial Totals Card & Ingestion Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
            <Card className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Total Inward Purchase Valuation
                </p>
                <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                  ₹{summaryTotals.totalPurchaseVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex gap-3">
                  <span>Taxable: ₹{summaryTotals.totalTaxable.toFixed(2)}</span>
                  <span>GST: ₹{summaryTotals.totalGst.toFixed(2)}</span>
                  <span>Units: {summaryTotals.totalQty}</span>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-5 font-bold text-xs rounded-xl cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Mapping
              </Button>

              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting || summaryTotals.invalidCount > 0}
                className="h-11 px-6 font-bold text-xs rounded-xl cursor-pointer bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Complete Inward Purchase ({summaryTotals.totalRows} Items)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: INGESTION & CONFIRMATION ================= */}
      {currentStep === 4 && (
        <Card className="p-8 sm:p-12 bg-white border-slate-200 shadow-md rounded-3xl text-center max-w-2xl mx-auto">
          {isSubmitting ? (
            <div className="space-y-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] mx-auto animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Inwarding Purchase Inventory...
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Updating stock levels, recording stock movements, and logging the official purchase invoice.
              </p>
            </div>
          ) : importResult?.success ? (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Purchase Inward Completed!
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Invoice <span className="font-mono font-bold text-slate-800">#{importResult.purchaseNumber}</span> has been officially recorded.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <div>
                  <div className="text-xl font-black text-slate-800">
                    {importResult.totalQuantity}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Units Inwarded
                  </div>
                </div>

                <div>
                  <div className="text-xl font-black text-purple-700">
                    {importResult.itemsCreated}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    New Products
                  </div>
                </div>

                <div>
                  <div className="text-xl font-black text-emerald-600">
                    {importResult.itemsUpdated}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Restocked
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/shop/inventory"
                  className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  View in Inventory
                </Link>

                <Link
                  href="/shop/purchases"
                  className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  View Purchase Invoices
                </Link>

                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvFile(null);
                    setParsedData(null);
                    setRows([]);
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto h-10 px-4 text-xs font-semibold"
                >
                  Import Another CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Inward Purchase Failed
              </h2>
              <p className="text-xs text-rose-600 max-w-md mx-auto">
                {importResult?.message || "Could not complete purchase inwarding."}
              </p>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="mt-4"
              >
                Back to Review &amp; Fix
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ================= OPTIONAL EXTENDED SPECS MODAL ================= */}
      {activeSpecsRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#2563eb]" />
                  Custom Specifications: {activeSpecsRow.productName}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Code: {activeSpecsRow.productCode} | Category: {activeSpecsRow.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSpecsRowId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {/* Common Specifications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={activeSpecsRow.brand}
                    onChange={(e) => handleCellChange(activeSpecsRow.id, "brand", e.target.value)}
                    placeholder="e.g. Ray-Ban"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={activeSpecsRow.model}
                    onChange={(e) => handleCellChange(activeSpecsRow.id, "model", e.target.value)}
                    placeholder="e.g. Aviator"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={activeSpecsRow.hsnCode}
                    onChange={(e) => handleCellChange(activeSpecsRow.id, "hsnCode", e.target.value)}
                    placeholder="e.g. 9004"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Rack / Storage Bin
                  </label>
                  <input
                    type="text"
                    value={activeSpecsRow.rackLocation}
                    onChange={(e) => handleCellChange(activeSpecsRow.id, "rackLocation", e.target.value)}
                    placeholder="e.g. Rack A-1"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              {/* FRAME specifics */}
              {activeSpecsRow.category === "FRAME" && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Frame Dimensions &amp; Style
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Size (e.g. 52-18-140)
                      </label>
                      <input
                        type="text"
                        value={activeSpecsRow.frameSpecs?.size || ""}
                        onChange={(e) =>
                          handleCellChange(activeSpecsRow.id, "frameSpecs", {
                            ...activeSpecsRow.frameSpecs,
                            size: e.target.value,
                          })
                        }
                        placeholder="52-18-140"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        value={activeSpecsRow.frameSpecs?.color || ""}
                        onChange={(e) =>
                          handleCellChange(activeSpecsRow.id, "frameSpecs", {
                            ...activeSpecsRow.frameSpecs,
                            color: e.target.value,
                          })
                        }
                        placeholder="Gold / Black"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LENS specifics */}
              {activeSpecsRow.category === "LENS" && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lens Index &amp; Power Range
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Refractive Index
                      </label>
                      <input
                        type="text"
                        value={activeSpecsRow.lensSpecs?.refractiveIndex || "1.56"}
                        onChange={(e) =>
                          handleCellChange(activeSpecsRow.id, "lensSpecs", {
                            ...activeSpecsRow.lensSpecs,
                            refractiveIndex: e.target.value,
                          })
                        }
                        placeholder="1.56, 1.61, 1.67"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Stock Power Range
                      </label>
                      <input
                        type="text"
                        value={activeSpecsRow.lensSpecs?.stockPower || ""}
                        onChange={(e) =>
                          handleCellChange(activeSpecsRow.id, "lensSpecs", {
                            ...activeSpecsRow.lensSpecs,
                            stockPower: e.target.value,
                          })
                        }
                        placeholder="-4.00 to +4.00"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  General Remarks / Description
                </label>
                <textarea
                  value={activeSpecsRow.details}
                  onChange={(e) => handleCellChange(activeSpecsRow.id, "details", e.target.value)}
                  placeholder="Extra item notes..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button
                type="button"
                onClick={() => {
                  setActiveSpecsRowId(null);
                  toast.success("Specifications saved for this item.");
                }}
                className="h-8 px-4 bg-[#2563eb] text-white text-xs font-bold rounded-lg"
              >
                Save Specs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
