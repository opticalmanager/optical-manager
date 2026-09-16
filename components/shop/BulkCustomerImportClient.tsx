"use client";

import React, { useState, useMemo, useRef } from "react";
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
  UserPlus,
  Users,
  Building2,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  parseCSV,
  autoMapCSVHeaders,
  downloadSampleCustomerCSV,
  CUSTOMER_SYSTEM_FIELDS,
  type ParsedCSV,
} from "@/utils/csv-parser";
import { bulkImportCustomersAction } from "@/actions/customer.actions";

interface BulkCustomerImportClientProps {
  shopId: string;
  shopName: string;
}

interface EditableCustomerRow {
  id: string; // unique row id for React key
  originalIndex: number;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  age: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  referredBy: string;
  notes: string;
  errors: Record<string, string>; // field -> error message
  isValid: boolean;
}

export function BulkCustomerImportClient({
  shopId,
  shopName,
}: BulkCustomerImportClientProps) {
  const router = useRouter();

  // Wizard state: 1 = Upload, 2 = Mapping, 3 = Review & Fix, 4 = Ingest & Result
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field Mapping state: systemFieldKey -> csvHeaderName
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // Review Table state
  const [rows, setRows] = useState<EditableCustomerRow[]>([]);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Import execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    firstRegId?: string;
    lastRegId?: string;
    message: string;
  } | null>(null);

  // --- Row Validator Helper ---
  const validateRow = (
    row: Omit<EditableCustomerRow, "errors" | "isValid">
  ): { errors: Record<string, string>; isValid: boolean } => {
    const errors: Record<string, string> = {};

    // 1. Full Name: required, min 2 chars
    if (!row.fullName.trim()) {
      errors.fullName = "Name is required.";
    } else if (row.fullName.trim().length < 2) {
      errors.fullName = "Min 2 characters required.";
    }

    // 2. Phone: required, 10 digits
    const cleanPhone = row.phone.replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^0/, "");
    if (!cleanPhone) {
      errors.phone = "Phone number is required.";
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      errors.phone = "Must be a 10-digit mobile number.";
    }

    // 3. Email: optional, must be valid email format if present
    if (row.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        errors.email = "Invalid email format.";
      }
    }

    // 4. Pincode: optional, must be 6 digits if present
    if (row.pincode.trim() && !/^[0-9]{6}$/.test(row.pincode.trim())) {
      errors.pincode = "Must be 6 digits.";
    }

    const isValid = Object.keys(errors).length === 0;
    return { errors, isValid };
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
      const autoMap = autoMapCSVHeaders(parsed.headers);
      setFieldMapping(autoMap);

      toast.success(`Loaded ${parsed.totalRows} customer rows from "${file.name}"`);
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

    if (!fieldMapping.fullName) {
      toast.error("Please map the 'Full Name' field to continue.");
      return;
    }
    if (!fieldMapping.phone) {
      toast.error("Please map the 'Phone / Mobile' field to continue.");
      return;
    }

    const nameIdx = parsedData.headers.indexOf(fieldMapping.fullName);
    const phoneIdx = parsedData.headers.indexOf(fieldMapping.phone);
    const emailIdx = fieldMapping.email ? parsedData.headers.indexOf(fieldMapping.email) : -1;
    const genderIdx = fieldMapping.gender ? parsedData.headers.indexOf(fieldMapping.gender) : -1;
    const ageIdx = fieldMapping.age ? parsedData.headers.indexOf(fieldMapping.age) : -1;
    const dobIdx = fieldMapping.dateOfBirth ? parsedData.headers.indexOf(fieldMapping.dateOfBirth) : -1;
    const addressIdx = fieldMapping.address ? parsedData.headers.indexOf(fieldMapping.address) : -1;
    const cityIdx = fieldMapping.city ? parsedData.headers.indexOf(fieldMapping.city) : -1;
    const stateIdx = fieldMapping.state ? parsedData.headers.indexOf(fieldMapping.state) : -1;
    const pincodeIdx = fieldMapping.pincode ? parsedData.headers.indexOf(fieldMapping.pincode) : -1;
    const refIdx = fieldMapping.referredBy ? parsedData.headers.indexOf(fieldMapping.referredBy) : -1;
    const notesIdx = fieldMapping.notes ? parsedData.headers.indexOf(fieldMapping.notes) : -1;

    const newRows: EditableCustomerRow[] = parsedData.rows.map((csvRow, idx) => {
      const rawGender = genderIdx !== -1 ? (csvRow[genderIdx] || "").trim().toUpperCase() : "";
      let normalizedGender = "";
      if (rawGender.startsWith("M")) normalizedGender = "MALE";
      else if (rawGender.startsWith("F")) normalizedGender = "FEMALE";
      else if (rawGender.startsWith("O")) normalizedGender = "OTHER";

      const rawPhone = phoneIdx !== -1 ? (csvRow[phoneIdx] || "").replace(/[\s-]/g, "") : "";
      const rawAge = ageIdx !== -1 ? (csvRow[ageIdx] || "").trim() : "";
      const rawDob = dobIdx !== -1 ? (csvRow[dobIdx] || "").trim() : "";

      const baseRow = {
        id: `row-${idx}-${Date.now()}`,
        originalIndex: idx + 1,
        fullName: nameIdx !== -1 ? (csvRow[nameIdx] || "").trim() : "",
        phone: rawPhone,
        email: emailIdx !== -1 ? (csvRow[emailIdx] || "").trim() : "",
        gender: normalizedGender,
        age: rawAge,
        dateOfBirth: rawDob,
        address: addressIdx !== -1 ? (csvRow[addressIdx] || "").trim() : "",
        city: cityIdx !== -1 ? (csvRow[cityIdx] || "").trim() : "",
        state: stateIdx !== -1 ? (csvRow[stateIdx] || "").trim() : "",
        pincode: pincodeIdx !== -1 ? (csvRow[pincodeIdx] || "").trim() : "",
        referredBy: refIdx !== -1 ? (csvRow[refIdx] || "").trim() : "",
        notes: notesIdx !== -1 ? (csvRow[notesIdx] || "").trim() : "",
      };

      const validation = validateRow(baseRow);

      return {
        ...baseRow,
        errors: validation.errors,
        isValid: validation.isValid,
      };
    });

    setRows(newRows);
    setCurrentPage(1);
    setCurrentStep(3);
  };

  // --- In-Line Cell Update Handler ---
  const handleCellChange = (
    rowId: string,
    field: keyof Omit<EditableCustomerRow, "id" | "originalIndex" | "errors" | "isValid">,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        let formattedValue = value;
        // Strict input filters:
        if (field === "phone") {
          formattedValue = value.replace(/\D/g, "").slice(0, 10);
        } else if (field === "pincode") {
          formattedValue = value.replace(/\D/g, "").slice(0, 6);
        } else if (field === "age") {
          formattedValue = value.replace(/\D/g, "").slice(0, 3);
        }

        const updated = { ...r, [field]: formattedValue };
        const { errors, isValid } = validateRow(updated);

        return {
          ...updated,
          errors,
          isValid,
        };
      })
    );
  };

  // --- Delete Row Handler ---
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // --- Row Stats Calculation ---
  const stats = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter((r) => r.isValid).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  }, [rows]);

  // --- Filtered and Paginated Review Rows ---
  const filteredRows = useMemo(() => {
    let result = [...rows];
    if (filterErrorsOnly) {
      result = result.filter((r) => !r.isValid);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, filterErrorsOnly, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // --- Final Step: Execute Bulk Ingestion ---
  const handleExecuteImport = async () => {
    const validRecordsToImport = rows
      .filter((r) => r.isValid)
      .map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email || null,
        gender: r.gender || null,
        dateOfBirth: r.dateOfBirth || null,
        address: r.address || null,
        city: r.city || null,
        state: r.state || null,
        pincode: r.pincode || null,
        referredBy: r.referredBy || null,
        notes: r.notes || null,
      }));

    if (validRecordsToImport.length === 0) {
      toast.error("No valid records available to import. Please correct errors.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkImportCustomersAction(shopId, validRecordsToImport);

      if (res.success) {
        setImportResult({
          success: true,
          count: res.count || validRecordsToImport.length,
          firstRegId: res.firstRegId,
          lastRegId: res.lastRegId,
          message: res.message,
        });
        toast.success(res.message);
      } else {
        toast.error(res.message || "Failed to import records.");
      }
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      toast.error(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setCsvFile(null);
    setParsedData(null);
    setFieldMapping({});
    setRows([]);
    setImportResult(null);
    setCurrentStep(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              href="/shop/customers"
              className="hover:text-[#0a52c3] transition-colors flex items-center gap-1"
            >
              <Users className="h-3.5 w-3.5" />
              Customer Records
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Bulk CSV Import</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            Bulk Customer Import
            <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-bold text-xs uppercase tracking-wider">
              {shopName}
            </Badge>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={downloadSampleCustomerCSV}
            className="h-9 px-3.5 text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            Download Sample CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/shop/customers")}
            className="h-9 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Step Progress Tracker */}
      <Card className="p-3 bg-white border-slate-200 shadow-sm rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { step: 1, title: "1. Upload CSV", desc: "Select or drop file" },
            { step: 2, title: "2. Map Columns", desc: "Match data fields" },
            { step: 3, title: "3. Review & Correct", desc: "In-line error fixing" },
            { step: 4, title: "4. Ingest & Save", desc: "Batch registration" },
          ].map((item) => {
            const isCompleted = currentStep > item.step || (currentStep === 4 && importResult?.success);
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-indigo-50/70 border border-indigo-200"
                    : isCompleted
                    ? "bg-slate-50 border border-slate-150"
                    : "opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-[#0a52c3] text-white shadow-sm shadow-[#0a52c3]/30"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : item.step}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-indigo-950" : isCompleted ? "text-slate-800" : "text-slate-500"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ================= PHASE 1: CSV FILE UPLOAD ================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-white ${
              isDragging
                ? "border-[#0a52c3] bg-blue-50/50 scale-[1.005]"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
              accept=".csv,text/csv"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
              <UploadCloud className="h-7 w-7" />
            </div>

            <h3 className="text-base font-bold text-slate-800 mb-1">
              Click to choose CSV file or drag and drop here
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Upload your customer directory spreadsheet in CSV format. Max file size: 5 MB (up to 5,000 patient rows).
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-9 px-4 bg-[#0a52c3] hover:bg-[#004bb5] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Browse Files
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSampleCustomerCSV();
                }}
                className="h-9 px-3.5 text-xs font-semibold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Sample Template
              </Button>
            </div>
          </Card>

          {/* Guidelines Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                Recommended CSV Import Guidelines:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                <li>
                  Ensure your file has header titles in the first row (e.g. <code>Full Name</code>, <code>Phone</code>, <code>Email</code>).
                </li>
                <li>
                  <strong>Phone Number</strong> is strictly validated for 10-digit Indian mobile numbers.
                </li>
                <li>
                  Optometry clinical prescriptions & symptoms are excluded from bulk import and can be recorded during individual clinic visits.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 2: FIELD MAPPING ================= */}
      {currentStep === 2 && parsedData && (
        <div className="space-y-4">
          <Card className="p-5 bg-white border-slate-200 shadow-sm rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                  Map CSV Columns to Customer Fields
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  We automatically matched your CSV headers. Verify or adjust the mapping below.
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
              {CUSTOMER_SYSTEM_FIELDS.map((sysField) => {
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
                          : "border-slate-200 text-slate-700 focus:border-indigo-500"
                      }`}
                    >
                      <option value="">-- Do Not Import / Skip --</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          Column: {header}
                        </option>
                      ))}
                    </select>

                    {/* Sample preview chip */}
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
                className="h-10 px-6 font-bold text-xs rounded-xl cursor-pointer bg-[#0a52c3] hover:bg-[#004bb5] text-white shadow-sm flex items-center gap-2"
              >
                <span>Continue to Data Review</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ================= PHASE 3: INTERACTIVE REVIEW & IN-LINE FIXING ================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Action & Stats Control Bar */}
          <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left KPI Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                  Total Rows: <span className="font-extrabold">{stats.total}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Valid: <span className="font-extrabold">{stats.valid}</span>
                </div>
                {stats.invalid > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Needs Attention: <span className="font-extrabold">{stats.invalid}</span>
                  </div>
                )}
              </div>

              {/* Right Filters & Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search in review list */}
                <div className="relative w-48 sm:w-60">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Show Errors Only Toggle */}
                {stats.invalid > 0 && (
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
                    {filterErrorsOnly ? "Showing Flagged Only" : `Show Errors (${stats.invalid})`}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* High-Density Editable Table */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-500 uppercase font-bold bg-slate-50/80 border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center">#</th>
                    <th className="px-3 py-3 min-w-[180px]">Full Name *</th>
                    <th className="px-3 py-3 min-w-[150px]">Phone * (10-Digit)</th>
                    <th className="px-3 py-3 min-w-[170px]">Email</th>
                    <th className="px-3 py-3 min-w-[100px]">Gender</th>
                    <th className="px-3 py-3 min-w-[80px]">Age</th>
                    <th className="px-3 py-3 min-w-[120px]">City</th>
                    <th className="px-3 py-3 min-w-[160px]">Address</th>
                    <th className="px-3 py-3 min-w-[120px]">Referred By</th>
                    <th className="px-3 py-3 min-w-[140px]">Notes</th>
                    <th className="px-3 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => {
                      const hasNameError = !!row.errors.fullName;
                      const hasPhoneError = !!row.errors.phone;
                      const hasEmailError = !!row.errors.email;

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

                          {/* Full Name */}
                          <td className="px-2 py-2">
                            <div className="space-y-0.5">
                              <input
                                type="text"
                                value={row.fullName}
                                onChange={(e) =>
                                  handleCellChange(row.id, "fullName", e.target.value)
                                }
                                placeholder="Customer Name"
                                className={`w-full h-8 px-2.5 rounded-lg text-xs font-bold outline-none border transition-all ${
                                  hasNameError
                                    ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-400"
                                    : "border-slate-200 bg-white text-slate-800 focus:border-[#0a52c3]"
                                }`}
                              />
                              {hasNameError && (
                                <p className="text-[9px] text-rose-500 font-bold px-1">
                                  {row.errors.fullName}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-2 py-2">
                            <div className="space-y-0.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                value={row.phone}
                                onChange={(e) =>
                                  handleCellChange(row.id, "phone", e.target.value)
                                }
                                placeholder="10 Digits"
                                className={`w-full h-8 px-2.5 rounded-lg text-xs font-mono font-bold outline-none border transition-all ${
                                  hasPhoneError
                                    ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-1 focus:ring-rose-400"
                                    : "border-slate-200 bg-white text-slate-800 focus:border-[#0a52c3]"
                                }`}
                              />
                              {hasPhoneError && (
                                <p className="text-[9px] text-rose-500 font-bold px-1">
                                  {row.errors.phone}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-2 py-2">
                            <div className="space-y-0.5">
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) =>
                                  handleCellChange(row.id, "email", e.target.value)
                                }
                                placeholder="name@domain.com"
                                className={`w-full h-8 px-2.5 rounded-lg text-xs outline-none border transition-all ${
                                  hasEmailError
                                    ? "border-rose-400 bg-rose-50/40 text-rose-900"
                                    : "border-slate-200 bg-white text-slate-700 focus:border-[#0a52c3]"
                                }`}
                              />
                              {hasEmailError && (
                                <p className="text-[9px] text-rose-500 font-bold px-1">
                                  {row.errors.email}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Gender */}
                          <td className="px-2 py-2">
                            <select
                              value={row.gender}
                              onChange={(e) =>
                                handleCellChange(row.id, "gender", e.target.value)
                              }
                              className="w-full h-8 px-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="">-</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </td>

                          {/* Age */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              value={row.age}
                              onChange={(e) =>
                                handleCellChange(row.id, "age", e.target.value)
                              }
                              placeholder="Yrs"
                              className="w-full h-8 px-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 outline-none text-center"
                            />
                          </td>

                          {/* City */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.city}
                              onChange={(e) =>
                                handleCellChange(row.id, "city", e.target.value)
                              }
                              placeholder="City"
                              className="w-full h-8 px-2 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 outline-none"
                            />
                          </td>

                          {/* Address */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.address}
                              onChange={(e) =>
                                handleCellChange(row.id, "address", e.target.value)
                              }
                              placeholder="Street / Area"
                              className="w-full h-8 px-2 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 outline-none truncate"
                            />
                          </td>

                          {/* Referred By */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.referredBy}
                              onChange={(e) =>
                                handleCellChange(row.id, "referredBy", e.target.value)
                              }
                              placeholder="Dr / Reference"
                              className="w-full h-8 px-2 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 outline-none truncate"
                            />
                          </td>

                          {/* Notes */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) =>
                                handleCellChange(row.id, "notes", e.target.value)
                              }
                              placeholder="Remarks"
                              className="w-full h-8 px-2 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 outline-none truncate"
                            />
                          </td>

                          {/* Delete Row Action */}
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        {filterErrorsOnly
                          ? "No flagged records found. All customer rows are valid!"
                          : "No records match the active search filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredRows.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold bg-slate-50/40">
                <span>
                  Showing {Math.min(filteredRows.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} -{" "}
                  {Math.min(filteredRows.length, currentPage * ITEMS_PER_PAGE)} of {filteredRows.length} rows
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 px-2 text-xs rounded-lg cursor-pointer"
                    >
                      Prev
                    </Button>
                    <span className="px-2 text-xs font-bold text-slate-700">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 px-2 text-xs rounded-lg cursor-pointer"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Action Navigation Bar */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="h-10 px-4 font-bold text-xs rounded-xl cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Column Mapping
            </Button>

            <Button
              onClick={() => setCurrentStep(4)}
              disabled={stats.valid === 0}
              className="h-10 px-6 font-bold text-xs rounded-xl cursor-pointer bg-[#0a52c3] hover:bg-[#004bb5] text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span>Proceed to Ingestion ({stats.valid} Valid)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================= PHASE 4: SUMMARY & BATCH INGESTION ================= */}
      {currentStep === 4 && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {!importResult ? (
            <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-2xl space-y-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#0a52c3] mx-auto shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to Batch Ingest Customer Directory
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  All valid patient records will be imported into <strong>{shopName}</strong>. Sequential registration IDs (<code>OP-shopNum-YYYY-NNNN</code>) will be generated automatically.
                </p>
              </div>

              {/* Ingestion Metric Summary */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-150">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Valid Customers
                  </p>
                  <p className="text-xl font-extrabold text-emerald-800 mt-0.5">
                    {stats.valid}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-1">Ready for database import</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Skipped / Invalid
                  </p>
                  <p className="text-xl font-extrabold text-slate-700 mt-0.5">
                    {stats.invalid}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Excluded from import</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  disabled={isSubmitting}
                  className="h-10 px-5 font-bold text-xs rounded-xl cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Back to Review
                </Button>

                <Button
                  onClick={handleExecuteImport}
                  disabled={isSubmitting || stats.valid === 0}
                  className="h-10 px-7 font-bold text-xs rounded-xl cursor-pointer bg-[#0a52c3] hover:bg-[#004bb5] text-white shadow-sm shadow-[#0a52c3]/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing Records...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirm & Ingest {stats.valid} Customers
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            /* Success Completion Card */
            <Card className="p-8 bg-white border-slate-200 shadow-md rounded-2xl text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Import Completed Successfully!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {importResult.message}
                </p>
              </div>

              {/* Registration Range Pill */}
              {importResult.firstRegId && importResult.lastRegId && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                  <span>Registration IDs:</span>
                  <span className="text-[#0a52c3]">{importResult.firstRegId}</span>
                  <span>→</span>
                  <span className="text-[#0a52c3]">{importResult.lastRegId}</span>
                </div>
              )}

              {/* Post-Import Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  onClick={() => router.push("/shop/customers")}
                  className="w-full sm:w-auto h-10 px-6 font-bold text-xs rounded-xl cursor-pointer bg-[#0a52c3] hover:bg-[#004bb5] text-white shadow-sm"
                >
                  View Customer Records
                </Button>

                <Button
                  variant="outline"
                  onClick={resetWizard}
                  className="w-full sm:w-auto h-10 px-5 font-bold text-xs rounded-xl cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Import Another CSV
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
