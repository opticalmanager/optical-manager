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
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye,
  Trash2,
  KeyRound,
  ExternalLink,
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

interface BillScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ExtractedBillData) => void;
}

type DrawerStep = "upload" | "scanning" | "preview" | "setup_key";

export function BillScanDrawer({ isOpen, onClose, onApply }: BillScanDrawerProps) {
  const [step, setStep] = useState<DrawerStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null);
  const [scanStatus, setScanStatus] = useState("Analyzing document with AI...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup Key state (for first-time integration)
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("gemini-3.5-flash");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Reset or initialize when drawer opens
  useEffect(() => {
    if (isOpen) {
      // Check if AI is configured
      getOrganizationAiStatusAction().then((status) => {
        if (!status.isConfigured) {
          setStep("setup_key");
        } else {
          if (step === "setup_key") setStep("upload");
        }
        if (status.model) {
          const validModels = [
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-flash-latest",
            "gemini-3.8-flash",
          ];
          setModelInput(validModels.includes(status.model) ? status.model : "gemini-3.5-flash");
        }
      });
    } else {
      // Clean up object URL when closing
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(null);
      setPreviewUrl(null);
      setExtractedData(null);
      setErrorMessage(null);
      setStep("upload");
      setKeyTestStatus(null);
    }
  }, [isOpen]);

  // Downsample large images client-side to minimize upload latency (<300KB)
  async function downscaleImageFile(sourceFile: File): Promise<string> {
    if (sourceFile.type === "application/pdf") {
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
          // Fallback to direct FileReader if canvas unavailable
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(sourceFile);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // 85% JPEG provides crisp text with minimal payload
        const base64DataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(base64DataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image for compression."));
      };
    });
  }

  function handleFileSelect(selectedFile: File) {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a valid JPG, PNG, WEBP image or a PDF bill.");
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error("File is too large. Maximum supported size is 15MB.");
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);

    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleStartExtraction() {
    if (!file) return;

    setStep("scanning");
    setScanStatus("Optimizing document & compressing payload...");

    try {
      const base64DataUrl = await downscaleImageFile(file);
      const mimeType = file.type === "application/pdf" ? "application/pdf" : "image/jpeg";

      setScanStatus("Gemini AI is reading items, rates, and tax breakdown...");

      startTransition(async () => {
        const result = await extractBillDataAction(base64DataUrl, mimeType);

        if (!result.success) {
          if (result.needsKeySetup) {
            setErrorMessage(result.error || "Please configure your Gemini API Key.");
            setStep("setup_key");
            toast.error(result.error || "Please configure your Gemini API Key first.");
          } else {
            setErrorMessage(result.error || "Failed to parse bill.");
            setStep("upload");
            toast.error(result.error || "Extraction failed.");
          }
          return;
        }

        if (result.data) {
          setExtractedData(result.data);
          setStep("preview");
          toast.success(
            `Extracted ${result.data.items.length} items from ${result.data.vendorName || "bill"}!`
          );
        }
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to process image.");
      setStep("upload");
      toast.error("Processing error occurred.");
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
    onApply(extractedData);
    onClose();
  }

  function handleRemoveItem(id: string) {
    if (!extractedData) return;
    const filtered = extractedData.items.filter((item) => item.id !== id);
    setExtractedData({
      ...extractedData,
      items: filtered,
      rawItemCount: filtered.length,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-all duration-300 sm:rounded-l-2xl border-l border-slate-200">
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
                Auto-fill purchase invoice from vendor bills & challans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                    <option value="gemini-3.5-flash">gemini-3.5-flash (Recommended - Ultra Fast &amp; Accurate)</option>
                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Lightweight &amp; Fast)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast OCR)</option>
                    <option value="gemini-flash-latest">gemini-flash-latest (Flash Latest)</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Gemini 3.8 Flash)</option>
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

          {/* STEP 2: UPLOAD BILL */}
          {step === "upload" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Scan Error: </span>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                    : file
                    ? "border-emerald-400 bg-emerald-50/20"
                    : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-xs">
                      {file.type === "application/pdf" ? (
                        <FileText className="h-6 w-6" />
                      ) : (
                        <CheckCircle2 className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[280px]">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to scan
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs ring-4 ring-blue-50/50">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Upload or drag & drop vendor invoice
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports photo (JPG, PNG, WEBP) or single-page PDF up to 15MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs border border-slate-200">
                        <Camera className="h-3 w-3 text-slate-400" /> Mobile Camera
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs border border-slate-200">
                        <FileText className="h-3 w-3 text-slate-400" /> PDF Challan
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Preview Thumbnail */}
              {previewUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 relative group">
                  <div className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 text-[11px] text-white">
                    <span>Document Preview</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-48 overflow-hidden flex items-center justify-center bg-slate-950 p-2">
                    <img
                      src={previewUrl}
                      alt="Bill preview"
                      className="max-h-44 object-contain rounded-sm"
                    />
                  </div>
                </div>
              )}

              {/* Extraction Benefits Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> What will be auto-filled:
                </p>
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Supplier Name & GSTIN
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Invoice No. & Date
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Frames, Lenses & Solutions
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    HSN Codes, Rates & GST%
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Brand, Model, Color Specs
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Batch & Expiry for Lenses
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("setup_key")}
                  className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Configure AI Key
                </button>
                <Button
                  type="button"
                  onClick={handleStartExtraction}
                  disabled={!file}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm shadow-blue-500/20"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Extract & Auto-Fill
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SCANNING (In Progress) */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Scanning Vendor Invoice
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  {scanStatus}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                Zero-math error verification running
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW EXTRACTED DATA */}
          {step === "preview" && extractedData && (
            <div className="space-y-4">
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
                      ₹{extractedData.totalAmount?.toLocaleString("en-IN") || "0"}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {extractedData.items.length} items extracted
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
                        <th className="py-2 px-3">Item & Code</th>
                        <th className="py-2 px-2 text-center">Cat</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Total</th>
                        <th className="py-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {extractedData.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono text-blue-600 font-medium">
                                {item.productCode}
                              </span>
                              {item.brand && <span>• {item.brand}</span>}
                              {item.batchNumber && (
                                <span className="text-amber-700 font-mono">
                                  • B:{item.batchNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="inline-block rounded-sm bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700">
                            ₹{item.unitPrice.toFixed(0)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono">
                            ₹{item.totalPurchasePrice.toFixed(0)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
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
                  className="text-xs h-9"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Scan Another Bill
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyExtractedData}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm shadow-blue-500/20"
                >
                  Apply to Purchase Form
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
