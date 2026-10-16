"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  Trash2,
  KeyRound,
  ExternalLink,
  Plus,
  AlertTriangle,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { extractBillDataAction } from "@/actions/bill-scan.actions";
import {
  getOrganizationAiStatusAction,
  updateOrganizationAiSettingsAction,
  testGeminiApiKeyAction,
} from "@/actions/ai-settings.actions";
import type { ExtractedBillData, ExtractedBillItem } from "@/types/bill-scan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface QueuedBillFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "idle" | "scanning" | "success" | "error";
  extractedData?: ExtractedBillData;
  itemCount?: number;
  error?: string;
}

interface BillScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ExtractedBillData) => void;
  existingItemCount?: number;
}

type DrawerStep = "upload" | "scanning" | "preview" | "setup_key";

/**
 * Aggregates extracted bill data from multiple successfully processed files
 * into a single unified ExtractedBillData payload.
 */
function aggregateExtractedData(
  results: { file: File; data: ExtractedBillData }[]
): ExtractedBillData {
  if (results.length === 0) {
    return {
      items: [],
      rawItemCount: 0,
      totalAmount: 0,
      totalGst: 0,
    };
  }

  // Find first non-empty vendor and invoice headers
  const firstWithVendor = results.find((r) => r.data.vendorName?.trim());
  const firstWithGstin = results.find((r) => r.data.vendorGstin?.trim());
  const firstWithInvoice = results.find((r) => r.data.invoiceNumber?.trim());
  const firstWithDate = results.find((r) => r.data.invoiceDate?.trim());

  // Check if any invoice used IGST
  const hasIgst = results.some((r) => r.data.taxType === "IGST");

  // Flatten and assign unique IDs to all items across all files
  const allItems: ExtractedBillItem[] = [];
  results.forEach((r, fileIdx) => {
    (r.data.items || []).forEach((item, itemIdx) => {
      allItems.push({
        ...item,
        id: item.id || `ext-${fileIdx}-${itemIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });
    });
  });

  // Calculate sum of total purchase price & gst
  const totalAmount = allItems.reduce(
    (sum, it) => sum + (Number(it.totalPurchasePrice) || 0),
    0
  );
  const totalGst = allItems.reduce(
    (sum, it) =>
      sum +
      (Number(it.cgstAmount || 0) +
        Number(it.sgstAmount || 0) +
        Number(it.igstAmount || 0)),
    0
  );

  return {
    vendorName: firstWithVendor?.data.vendorName || results[0].data.vendorName,
    vendorGstin: firstWithGstin?.data.vendorGstin || results[0].data.vendorGstin,
    matchedVendorId: firstWithVendor?.data.matchedVendorId || results[0].data.matchedVendorId,
    isNewVendor: firstWithVendor?.data.isNewVendor ?? results[0].data.isNewVendor,
    invoiceNumber: firstWithInvoice?.data.invoiceNumber || results[0].data.invoiceNumber,
    invoiceDate: firstWithDate?.data.invoiceDate || results[0].data.invoiceDate,
    taxType: hasIgst ? "IGST" : "SGST_CGST",
    taxRule: results[0].data.taxRule || "EXCLUDE",
    items: allItems,
    rawItemCount: allItems.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    confidence: results.some((r) => r.data.confidence === "low")
      ? "medium"
      : results[0].data.confidence || "high",
    notes: results
      .map((r) => r.data.notes)
      .filter(Boolean)
      .join(" | "),
  };
}

export function BillScanDrawer({
  isOpen,
  onClose,
  onApply,
  existingItemCount = 0,
}: BillScanDrawerProps) {
  const [step, setStep] = useState<DrawerStep>("upload");
  const [queuedFiles, setQueuedFiles] = useState<QueuedBillFile[]>([]);
  const [activeScanIndex, setActiveScanIndex] = useState<number>(-1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null);
  const [scanStatus, setScanStatus] = useState("Analyzing document with AI...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup Key state (for first-time integration)
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("gemini-3.5-flash-lite");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Reset or initialize when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      getOrganizationAiStatusAction().then((status) => {
        if (!status.isConfigured) {
          setStep("setup_key");
        } else {
          if (step === "setup_key") setStep("upload");
        }
        if (status.model) {
          const validModels = [
            "gemini-3.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
          ];
          setModelInput(validModels.includes(status.model) ? status.model : "gemini-3.5-flash-lite");
        }
      });
    } else {
      // Clean up object URLs when closing
      queuedFiles.forEach((qf) => {
        if (qf.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(qf.previewUrl);
        }
      });
      setQueuedFiles([]);
      setExtractedData(null);
      setErrorMessage(null);
      setStep("upload");
      setActiveScanIndex(-1);
      setKeyTestStatus(null);
    }
  }, [isOpen]);

  // Dynamic status progression during scanning for reassuring feedback
  useEffect(() => {
    if (step !== "scanning") return;

    const messages = [
      "Optimizing document & compressing payload...",
      "Analyzing invoice structure & supplier header...",
      "Extracting invoice number, date, and tax types...",
      "Reading line items, quantities, and HSN codes...",
      "Parsing optical frame specs (brand, model, size, color)...",
      "Running server math validation & GST calculations...",
      "Finalizing line items for purchase table...",
    ];

    let index = 0;
    const timer = setInterval(() => {
      index = (index + 1) % messages.length;
      setScanStatus(messages[index]);
    }, 2200);

    return () => clearInterval(timer);
  }, [step]);

  // Downsample large images client-side to minimize upload latency (<300KB)
  async function downscaleImageFile(sourceFile: File): Promise<string> {
    const isPdf =
      sourceFile.type === "application/pdf" ||
      sourceFile.type.includes("pdf") ||
      sourceFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sourceFile);
      });
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(sourceFile);
      img.src = objectUrl;

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 1800; // Optimal for OCR while small in payload
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(sourceFile);
          return;
        }

        try {
          ctx.drawImage(img, 0, 0, width, height);
          // 85% JPEG provides crisp text with minimal payload
          const base64DataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(base64DataUrl);
        } catch (_) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(sourceFile);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(sourceFile);
      };
    });
  }

  // Add one or more files to the queue, retaining any existing files
  function addFilesToQueue(incomingFiles: FileList | File[]) {
    const added: QueuedBillFile[] = [];
    const rejectedNames: string[] = [];

    Array.from(incomingFiles).forEach((f) => {
      const isPdf =
        f.type === "application/pdf" ||
        f.type.includes("pdf") ||
        f.name.toLowerCase().endsWith(".pdf");
      const isImage =
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp)$/i.test(f.name);

      if (!isPdf && !isImage) {
        rejectedNames.push(`${f.name} (unsupported format)`);
        return;
      }
      if (f.size > 15 * 1024 * 1024) {
        rejectedNames.push(`${f.name} (> 15MB)`);
        return;
      }

      // Prevent exact duplicate files in the current batch
      const isDup = queuedFiles.some(
        (qf) => qf.file.name === f.name && qf.file.size === f.size
      );
      if (isDup) return;

      let previewUrl: string | null = null;
      if (f.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(f);
      }

      added.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file: f,
        previewUrl,
        status: "idle",
      });
    });

    if (rejectedNames.length > 0) {
      toast.error(`Some files could not be added: ${rejectedNames.join(", ")}`);
    }

    if (added.length > 0) {
      setQueuedFiles((prev) => [...prev, ...added]);
      setErrorMessage(null);
      toast.success(
        added.length === 1
          ? `Added "${added[0].file.name}" to queue.`
          : `Added ${added.length} images to queue.`
      );
    }
  }

  function handleRemoveFile(id: string) {
    setQueuedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }

  function handleClearAllFiles() {
    queuedFiles.forEach((qf) => {
      if (qf.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(qf.previewUrl);
      }
    });
    setQueuedFiles([]);
    setExtractedData(null);
    setErrorMessage(null);
  }

  // Resilient One-by-One Sequential Extraction Loop
  async function handleStartExtraction(targetFileId?: string) {
    // If targetFileId is provided, scan only that single file (e.g. retry);
    // otherwise scan all files that are "idle" or "error"
    const filesToScan = targetFileId
      ? queuedFiles.filter((f) => f.id === targetFileId)
      : queuedFiles.filter((f) => f.status === "idle" || f.status === "error");

    if (filesToScan.length === 0) {
      if (queuedFiles.length === 0) {
        toast.error("Please add at least one bill image or PDF.");
        return;
      }
      // If all are already success, advance to preview
      const successful = queuedFiles.filter((f) => f.status === "success" && f.extractedData);
      if (successful.length > 0) {
        const merged = aggregateExtractedData(
          successful.map((s) => ({ file: s.file, data: s.extractedData! }))
        );
        setExtractedData(merged);
        setStep("preview");
        return;
      }
    }

    setStep("scanning");
    setErrorMessage(null);

    let currentQueue = [...queuedFiles];
    const successfulResults: { file: File; data: ExtractedBillData }[] = [];

    // Retain any previously successful files not in the active scan target
    currentQueue.forEach((f) => {
      if (f.status === "success" && f.extractedData && !filesToScan.some((ts) => ts.id === f.id)) {
        successfulResults.push({ file: f.file, data: f.extractedData });
      }
    });

    for (let i = 0; i < filesToScan.length; i++) {
      if (i > 0) {
        // Brief pause between sequential items to stay safely within Google AI rate limits
        await new Promise((r) => setTimeout(r, 400));
      }
      const item = filesToScan[i];
      setActiveScanIndex(i);
      setScanStatus(
        `Scanning image ${i + 1} of ${filesToScan.length}: "${item.file.name}"...`
      );

      // Set active file to scanning state
      currentQueue = currentQueue.map((f) =>
        f.id === item.id ? { ...f, status: "scanning", error: undefined } : f
      );
      setQueuedFiles([...currentQueue]);

      try {
        // 1. Client-side downscale/compression for fast upload
        const base64DataUrl = await downscaleImageFile(item.file);
        const isPdf =
          item.file.type === "application/pdf" ||
          item.file.type.includes("pdf") ||
          item.file.name.toLowerCase().endsWith(".pdf");
        const mimeType = isPdf ? "application/pdf" : (item.file.type || "image/jpeg");

        // 2. Call server extraction action
        const result = await extractBillDataAction(base64DataUrl, mimeType);

        if (!result.success || !result.data) {
          if (result.needsKeySetup) {
            setErrorMessage(result.error || "Please configure your Gemini API Key.");
            setStep("setup_key");
            toast.error(result.error || "Please configure your Gemini API Key first.");
            return;
          }

          // Individual file failure isolation: mark error for this file, continue next!
          console.warn(`Extraction error for ${item.file.name}:`, result.error);
          currentQueue = currentQueue.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error",
                  error: result.error || "Failed to extract items from image.",
                }
              : f
          );
          setQueuedFiles([...currentQueue]);
          continue;
        }

        const billData = result.data;
        // Record success for this file
        currentQueue = currentQueue.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: "success",
                extractedData: billData,
                itemCount: billData.items?.length || 0,
                error: undefined,
              }
            : f
        );
        setQueuedFiles([...currentQueue]);
        successfulResults.push({ file: item.file, data: billData });
      } catch (fileErr: any) {
        console.error(`Error processing file ${item.file.name}:`, fileErr);
        currentQueue = currentQueue.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: "error",
                error: fileErr?.message || "Failed to process image.",
              }
            : f
        );
        setQueuedFiles([...currentQueue]);
      }
    }

    // Process finished: evaluate batch results
    setActiveScanIndex(-1);

    if (successfulResults.length > 0) {
      const merged = aggregateExtractedData(successfulResults);
      setExtractedData(merged);
      setStep("preview");

      const failedCount = currentQueue.filter((f) => f.status === "error").length;
      if (failedCount > 0) {
        toast.warning(
          `Extracted ${merged.items.length} items from ${successfulResults.length} bills. (${failedCount} image(s) unreadable).`
        );
      } else {
        toast.success(
          `Successfully extracted ${merged.items.length} items across ${successfulResults.length} bills!`
        );
      }
    } else {
      // All files failed
      setStep("upload");
      setErrorMessage(
        "Could not extract line items from the selected images. Please ensure photos are sharp, clear, and well-lit, or retry."
      );
      toast.error("Scanning failed for selected images.");
    }
  }

  async function handleTestApiKey() {
    if (!apiKeyInput.trim()) {
      toast.error("Please enter a Gemini API Key to test.");
      return;
    }
    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      const res = await testGeminiApiKeyAction(apiKeyInput, modelInput);
      setKeyTestStatus({
        tested: true,
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      setKeyTestStatus({
        tested: true,
        success: false,
        message: e?.message || "Connection failed.",
      });
    } finally {
      setIsTestingKey(false);
    }
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) {
      toast.error("Please enter your Gemini API Key.");
      return;
    }
    setIsSavingKey(true);
    try {
      const res = await updateOrganizationAiSettingsAction({
        geminiApiKey: apiKeyInput.trim(),
        geminiModel: modelInput,
      });
      if (res.success) {
        toast.success("AI configured successfully! You can now scan bills.");
        setStep("upload");
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error("Failed to save AI configuration.");
    } finally {
      setIsSavingKey(false);
    }
  }

  function handleApplyExtractedData() {
    if (!extractedData) return;
    try {
      onApply(extractedData);
      onClose();
    } catch (err: any) {
      console.error("Error applying extracted bill data:", err);
      toast.error("Failed to populate purchase form. Please review rows.");
    }
  }

  function handleRemoveItem(id: string) {
    if (!extractedData) return;
    const filtered = extractedData.items.filter((item) => item.id !== id);
    const newTotalAmount = filtered.reduce(
      (sum, it) => sum + (Number(it.totalPurchasePrice) || 0),
      0
    );
    const newTotalGst = filtered.reduce(
      (sum, it) =>
        sum +
        (Number(it.cgstAmount || 0) +
          Number(it.sgstAmount || 0) +
          Number(it.igstAmount || 0)),
      0
    );

    setExtractedData({
      ...extractedData,
      items: filtered,
      rawItemCount: filtered.length,
      totalAmount: Math.round(newTotalAmount * 100) / 100,
      totalGst: Math.round(newTotalGst * 100) / 100,
    });
  }

  if (!isOpen) return null;

  const totalFiles = queuedFiles.length;
  const pendingFilesCount = queuedFiles.filter(
    (f) => f.status === "idle" || f.status === "error"
  ).length;
  const successfulFilesCount = queuedFiles.filter((f) => f.status === "success").length;
  const failedFilesCount = queuedFiles.filter((f) => f.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-all duration-300 sm:rounded-l-2xl border-l border-slate-200">
        {/* Hidden inputs for multi-file selection */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFilesToQueue(e.target.files);
              e.target.value = "";
            }
          }}
          className="hidden"
        />
        <input
          ref={addMoreInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFilesToQueue(e.target.files);
              e.target.value = "";
            }
          }}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Scan Bill with AI
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-blue-500/20">
                  Optical OCR
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Multi-image batch OCR for vendor bills &amp; challans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP 1: SETUP API KEY (First-time integration) */}
          {step === "setup_key" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Setup Required: </span>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Connect Google Gemini AI
                    </h3>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                      To enable high-accuracy bill scanning, connect your account's Google Gemini API Key. Each account stores its own private key securely in the database.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gemini API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="bg-white text-xs font-mono h-9"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Stored securely in your account settings.</span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                    >
                      Get free key from Google AI Studio <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gemini Model
                  </label>
                  <select
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Recommended - Fast 2s &amp; Zero 503 Errors)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Fast 2.5s Standard Flash)</option>
                    <option value="gemini-3.6-flash">gemini-3.6-flash (High Capability OCR)</option>
                    <option value="gemini-3.5-flash">gemini-3.5-flash (Standard Flash)</option>
                    <option value="gemini-3.7-flash">gemini-3.7-flash (Next-Gen Flash OCR)</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Gemini 3.8 Flash Preview)</option>
                  </select>
                </div>

                {keyTestStatus && (
                  <div
                    className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
                      keyTestStatus.success
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {keyTestStatus.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <span className="leading-snug">{keyTestStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestApiKey}
                    disabled={isTestingKey || !apiKeyInput.trim()}
                    className="text-xs h-8"
                  >
                    {isTestingKey ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveApiKey}
                    disabled={isSavingKey || !apiKeyInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                  >
                    {isSavingKey ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD & MULTI-IMAGE MANAGEMENT */}
          {step === "upload" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Scan Notice: </span>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* No files selected yet: Large initial dropzone */}
              {queuedFiles.length === 0 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      addFilesToQueue(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                      : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs ring-4 ring-blue-50/50">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Upload or drag &amp; drop vendor invoices
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select one or more photos (JPG, PNG, WEBP) or PDF bills up to 15MB each
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {/* Name changed from "Mobile Camera" to "Images" as requested */}
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-2xs border border-slate-200">
                        <ImageIcon className="h-3 w-3 text-blue-600" /> Images
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-2xs border border-slate-200">
                        <FileText className="h-3 w-3 text-slate-400" /> PDF Challan
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-200">
                        + Multi-Selection
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Files selected: Queue Management & Add More list */
                <div className="space-y-3">
                  {/* Queue Header summary */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {queuedFiles.length} {queuedFiles.length === 1 ? "Image" : "Images"} in Queue
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">
                        {(
                          queuedFiles.reduce((acc, f) => acc + f.file.size, 0) /
                          (1024 * 1024)
                        ).toFixed(1)}{" "}
                        MB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearAllFiles}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        onClick={() => addMoreInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Add More Images
                      </button>
                    </div>
                  </div>

                  {/* Queued Files List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {queuedFiles.map((qf, idx) => (
                      <div
                        key={qf.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                          qf.status === "error"
                            ? "border-rose-200 bg-rose-50/30"
                            : qf.status === "success"
                            ? "border-emerald-200 bg-emerald-50/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          {/* Thumbnail / Icon */}
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {qf.previewUrl ? (
                              <img
                                src={qf.previewUrl}
                                alt={qf.file.name}
                                className="h-full w-full object-cover"
                              />
                            ) : qf.file.type === "application/pdf" ? (
                              <FileText className="h-5 w-5 text-rose-500" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          {/* File info and status */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">
                                #{idx + 1}
                              </span>
                              <p className="text-xs font-bold text-slate-800 truncate" title={qf.file.name}>
                                {qf.file.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500">
                                {(qf.file.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                              {qf.status === "idle" && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                                  Ready
                                </span>
                              )}
                              {qf.status === "scanning" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 animate-pulse">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Scanning...
                                </span>
                              )}
                              {qf.status === "success" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> {qf.itemCount || 0} items
                                </span>
                              )}
                              {qf.status === "error" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                                  <AlertCircle className="h-2.5 w-2.5" /> Failed
                                </span>
                              )}
                            </div>
                            {qf.error && (
                              <p className="text-[10px] text-rose-600 truncate mt-0.5" title={qf.error}>
                                {qf.error}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* File Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {qf.status === "error" && (
                            <button
                              type="button"
                              onClick={() => handleStartExtraction(qf.id)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                              title="Retry scanning this image"
                            >
                              Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(qf.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove file from queue"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drop more area below existing list */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        addFilesToQueue(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => addMoreInputRef.current?.click()}
                    className={`flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 px-4 text-xs font-semibold cursor-pointer transition-colors ${
                      isDragOver
                        ? "border-blue-500 bg-blue-50/50 text-blue-700"
                        : "border-slate-300 bg-slate-50/50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/20 hover:text-blue-600"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Click or drag &amp; drop to add more images to this bill</span>
                  </div>
                </div>
              )}

              {/* Extraction Benefits Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Sequential AI Processing:
                </p>
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Multi-Page Invoice Aggregation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Supplier Name &amp; GSTIN Match
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Isolated Error Recovery per Image
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    HSN Codes, Rates &amp; GST Auto-Calc
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Brand, Model, Color Specs
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Batch &amp; Expiry for Lenses
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("setup_key")}
                  className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Configure AI Key
                </button>
                <Button
                  type="button"
                  onClick={() => handleStartExtraction()}
                  disabled={queuedFiles.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {pendingFilesCount > 0
                    ? `Extract ${queuedFiles.length} ${queuedFiles.length === 1 ? "Image" : "Images"} with AI`
                    : "View Extracted Results"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SCANNING (Sequential In Progress) */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Scanning Bills with Gemini AI
                </h3>
                <p className="text-xs text-blue-700 font-semibold">
                  {scanStatus}
                </p>
              </div>

              {/* Multi-Image Progress List */}
              <div className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-left">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200">
                  <span>Batch Progress</span>
                  <span>
                    {Math.max(activeScanIndex + 1, 1)} of {queuedFiles.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {queuedFiles.map((f, idx) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-100"
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="truncate text-slate-700 text-[11px] font-medium">
                          {f.file.name}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {f.status === "scanning" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Reading...
                          </span>
                        )}
                        {f.status === "success" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> {f.itemCount} items
                          </span>
                        )}
                        {f.status === "error" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                        {f.status === "idle" && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Queued
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                Processing one-by-one with failure isolation
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW EXTRACTED DATA */}
          {step === "preview" && extractedData && (
            <div className="space-y-4">
              {/* Existing items append indicator */}
              {existingItemCount > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-900 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>{existingItemCount} items</strong> already in purchase form. These {extractedData.items.length} items will be appended below (Total: <strong>{existingItemCount + extractedData.items.length}</strong>).
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded">
                    Append Mode
                  </span>
                </div>
              )}

              {/* Multi-image status banner if any failed or if multiple processed */}
              {queuedFiles.length > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Aggregated from <strong>{successfulFilesCount}</strong> of <strong>{queuedFiles.length}</strong> images.
                    </span>
                  </div>
                  {failedFilesCount > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {failedFilesCount} unreadable
                    </span>
                  )}
                </div>
              )}

              {/* Vendor & Invoice Summary Card */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {extractedData.vendorName || "Unknown Vendor"}
                      </span>
                      {extractedData.matchedVendorId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Matched Vendor
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          + New Vendor (Free text)
                        </span>
                      )}
                    </div>
                    {extractedData.vendorGstin && (
                      <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
                        GSTIN: {extractedData.vendorGstin}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-blue-700">
                      ₹{Number(extractedData.totalAmount || 0).toLocaleString("en-IN")}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {(extractedData.items || []).length} items extracted
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-100 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Invoice #</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {extractedData.invoiceNumber || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Date</span>
                    <span className="font-semibold text-slate-800">
                      {extractedData.invoiceDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tax Type</span>
                    <span className="font-semibold text-slate-800">
                      {extractedData.taxType === "IGST" ? "IGST (Inter-state)" : "CGST + SGST"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" /> Extracted Line Items
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Review and remove unwanted rows
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Item &amp; Code</th>
                        <th className="py-2 px-2 text-center">Cat</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Cost (Rate)</th>
                        <th className="py-2 px-2 text-right">Total Cost</th>
                        <th className="py-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(extractedData.items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {item.productName || "Product"}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              {item.productCode && (
                                <span className="font-mono text-blue-600 font-medium">
                                  {item.productCode}
                                </span>
                              )}
                              {item.brand && (
                                <span>{item.productCode ? `• ${item.brand}` : item.brand}</span>
                              )}
                              {item.batchNumber && (
                                <span className="text-amber-700 font-mono">
                                  • B:{item.batchNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-bold ${
                              item.category === "SUNGLASSES"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : item.category === "LENS"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.category === "CONTACT_LENS"
                                ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                : item.category === "SOLUTION"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : item.category === "FRAME"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {item.category || "FRAME"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-slate-800">
                            {item.quantity || 1}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700">
                            ₹{Number(item.purchasePrice || item.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono">
                            ₹{Number(item.totalPurchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("upload")}
                  className="text-xs h-9 cursor-pointer"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Manage Images / Add More
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyExtractedData}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  {existingItemCount > 0 ? (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Append {extractedData.items.length} Items to Form
                    </>
                  ) : (
                    <>
                      Apply {extractedData.items.length} Items to Purchase Form
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
