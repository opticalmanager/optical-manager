"use client";

import { useState, useMemo } from "react";
import {
  X,
  Printer,
  Barcode,
  Layers,
  Sparkles,
  Tag,
  Check,
  Plus,
  Minus,
  Eye,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Sliders,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  LABEL_SPECS,
  type LabelSizePreset,
  buildBulkLabelsHtml,
  buildBarcodeSvgString,
  printBarcodeDocument,
  BarcodeItem,
} from "@/utils/barcode.utils";

export interface BulkBarcodeProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  price: string | null;
  quantity: number;
}

interface PurchaseBulkBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  products: BulkBarcodeProduct[];
}

export function PurchaseBulkBarcodeModal({
  isOpen,
  onClose,
  invoiceNumber,
  products: initialProducts,
}: PurchaseBulkBarcodeModalProps) {
  if (!isOpen) return null;

  // Selected preset and paper size - Default to optical industry gold standards (A4 Sheet + 100x15 mm Butterfly Tag)
  const [selectedPreset, setSelectedPreset] = useState<LabelSizePreset>("100x15 mm (Tag)");
  const [paperSize, setPaperSize] = useState<"continuous" | "a4" | "a5">("a4");

  // Preview tab toggle: Single Label vs Sheet Preview
  const [activePreviewTab, setActivePreviewTab] = useState<"single" | "sheet">("sheet");
  const [sheetPage, setSheetPage] = useState<number>(1);

  // Selected preview item index (for Single Label tab)
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Editable quantities per product
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialProducts.forEach((p) => {
      initial[p.id] = Math.max(1, p.quantity || 1);
    });
    return initial;
  });

  const currentSpec = LABEL_SPECS[selectedPreset] || LABEL_SPECS["100x15 mm (Tag)"];

  // Calculate total labels to print
  const totalLabels = useMemo(() => {
    return Object.values(productQuantities).reduce((acc, q) => acc + (q || 0), 0);
  }, [productQuantities]);

  const activeProductCount = useMemo(() => {
    return Object.values(productQuantities).filter((q) => q > 0).length;
  }, [productQuantities]);

  // Sheet layout calculations
  const labelsPerPage = paperSize === "a4" ? currentSpec.a4Total : paperSize === "a5" ? currentSpec.a5Total : 1;
  const totalPages = paperSize === "continuous" ? Math.max(1, totalLabels) : Math.max(1, Math.ceil(totalLabels / labelsPerPage));
  const safeSheetPage = Math.min(Math.max(1, sheetPage), totalPages);
  const pageStartIndex = (safeSheetPage - 1) * labelsPerPage;
  const pageEndIndex = Math.min(totalLabels, safeSheetPage * labelsPerPage);
  const pageFilledCount = Math.max(0, pageEndIndex - pageStartIndex);

  // Current previewed product
  const currentPreviewProduct = initialProducts[previewIndex] || initialProducts[0] || {
    id: "sample",
    name: "Standard Optical Frame",
    sku: "FRM-GEN-00001",
    category: "FRAME",
    price: "1999",
    quantity: 1,
  };

  // Handle single item quantity change
  const handleQuantityChange = (id: string, delta: number) => {
    setProductQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(500, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const handleSetExactQuantity = (id: string, val: string) => {
    const parsed = parseInt(val, 10);
    setProductQuantities((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : Math.max(0, Math.min(500, parsed)),
    }));
  };

  const handleResetToInward = () => {
    const next: Record<string, number> = {};
    initialProducts.forEach((p) => {
      next[p.id] = Math.max(1, p.quantity || 1);
    });
    setProductQuantities(next);
    toast.info("Reset all label counts to inward quantities.");
  };

  const handleClearAll = () => {
    const next: Record<string, number> = {};
    initialProducts.forEach((p) => {
      next[p.id] = 0;
    });
    setProductQuantities(next);
  };

  const handleAddOneToAll = () => {
    setProductQuantities((prev) => {
      const next = { ...prev };
      initialProducts.forEach((p) => {
        next[p.id] = (next[p.id] || 0) + 1;
      });
      return next;
    });
  };

  // Dispatch batch print with zero lag
  const handleExecutePrint = () => {
    const itemsToPrint: Array<{ item: BarcodeItem; quantity: number }> = [];

    initialProducts.forEach((p) => {
      const q = productQuantities[p.id] || 0;
      if (q > 0) {
        const fallbackSku = p.category
          ? `${p.category.slice(0, 3).toUpperCase()}-GEN-00001`
          : "FRM-GEN-00001";
        itemsToPrint.push({
          item: {
            id: p.id,
            name: p.name,
            category: p.category || "FRAME",
            brand: null,
            model: null,
            sku: p.sku || fallbackSku,
            price: p.price,
          },
          quantity: q,
        });
      }
    });

    if (itemsToPrint.length === 0 || totalLabels === 0) {
      toast.error("Please set at least 1 label quantity to print.");
      return;
    }

    const html = buildBulkLabelsHtml(itemsToPrint, currentSpec, {
      paperSize,
    });

    const success = printBarcodeDocument(html);
    if (!success) {
      toast.error("Could not trigger printer. Please check browser print permissions.");
    } else {
      toast.success(`Dispatched ${totalLabels} barcode labels (${currentSpec.displayName}) to printer.`);
      onClose();
    }
  };

  // Format currency
  const formatPrice = (val: string | null) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN")}/-`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <header className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Barcode className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  Print Barcodes for Bill #{invoiceNumber}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/20">
                  {totalLabels} Labels Queued
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Thermal roll &amp; sheet barcode printing with real-time live preview.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Modal Body: Split 2-Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ─── LEFT COLUMN: Configuration & Product Quantities (7 cols) ─── */}
            <div className="lg:col-span-7 space-y-4 min-w-0">
              
              {/* 1. Label Preset Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Label Size Preset
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Industry standard for optical stores
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(LABEL_SPECS) as LabelSizePreset[]).map((key) => {
                    const spec = LABEL_SPECS[key];
                    const isSelected = selectedPreset === key;
                    const isRecommended = key === "100x15 mm (Tag)";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(key);
                          setSheetPage(1);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-[#2563eb] bg-blue-50/70 shadow-xs ring-1 ring-[#2563eb]"
                            : "border-slate-200 hover:border-blue-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-[#2563eb]" : "text-slate-800"}`}>
                            {spec.displayName}
                          </span>
                          {isRecommended && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Gold Std
                            </span>
                          )}
                          {isSelected && !isRecommended && <Check className="h-3.5 w-3.5 text-[#2563eb]" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                          {spec.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Paper Layout Choice */}
              <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Printer &amp; Media Format:
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {paperSize === "continuous"
                      ? "Direct Thermal Roll (1 label/cut)"
                      : `${paperSize.toUpperCase()} Sheet (${labelsPerPage} labels/page)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaperSize("a4");
                      setSheetPage(1);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "a4"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    A4 Sheet ({currentSpec.a4Cols}×{currentSpec.a4Rows} • {currentSpec.a4Total}/pg)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaperSize("a5");
                      setSheetPage(1);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "a5"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    A5 Sheet ({currentSpec.a5Total}/pg)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaperSize("continuous");
                      setSheetPage(1);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "continuous"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Continuous Roll (Thermal)
                  </button>
                </div>
              </div>

              {/* 3. Products List & Stepper Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Inward Products &amp; Label Count ({initialProducts.length} Items)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Click any row to view its live label preview on the right
                    </span>
                  </div>
                  
                  {/* Quick Action Tools */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleResetToInward}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Reset all to inward quantity"
                    >
                      Inward Qty
                    </button>
                    <button
                      type="button"
                      onClick={handleAddOneToAll}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Add 1 to all"
                    >
                      +1 All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                      title="Clear all to 0"
                    >
                      Zero
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {initialProducts.map((p, idx) => {
                      const qty = productQuantities[p.id] || 0;
                      const isPreviewing = previewIndex === idx;

                      return (
                        <div
                          key={p.id || idx}
                          onClick={() => setPreviewIndex(idx)}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors text-xs cursor-pointer ${
                            isPreviewing
                              ? "bg-blue-50/70 border-l-3 border-[#2563eb]"
                              : "hover:bg-slate-50/70 border-l-3 border-transparent"
                          }`}
                        >
                          {/* Product Overview */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">
                                {p.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                                {p.category}
                              </span>
                              {isPreviewing && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                  <Eye className="h-2.5 w-2.5" /> Previewing
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-slate-400">
                              {p.sku && <span className="font-mono text-slate-600">Code: {p.sku}</span>}
                              {p.price && Number(p.price) > 0 && (
                                <span className="text-emerald-600 font-semibold">
                                  MRP: ₹{Number(p.price).toLocaleString("en-IN")}
                                </span>
                              )}
                              <span className="text-slate-400">
                                (Inward: {p.quantity || 1})
                              </span>
                            </div>
                          </div>

                          {/* Stepper Quantity Controls */}
                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(p.id, -1)}
                              className="h-6.5 w-6.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={qty}
                              onChange={(e) => handleSetExactQuantity(p.id, e.target.value)}
                              className="w-12 h-6.5 text-center rounded border border-slate-200 font-bold text-xs text-slate-800 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(p.id, 1)}
                              className="h-6.5 w-6.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-[10px] text-slate-400 font-bold ml-1 w-7 text-right">
                              pcs
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Live Barcode Label Preview (5 cols) ─────────── */}
            <div className="lg:col-span-5 flex flex-col bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3.5">
              
              {/* Preview Header & Specifications Tag */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-[#2563eb]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Barcode Preview
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {currentSpec.displayName}
                </span>
              </div>

              {/* Segmented Preview Toggles: Single Label vs Sheet Preview */}
              <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab("single")}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePreviewTab === "single"
                      ? "bg-white text-[#2563eb] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Single Label
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab("sheet")}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePreviewTab === "sheet"
                      ? "bg-white text-[#2563eb] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Sheet Preview
                </button>
              </div>

              {/* Main Visualizer Container */}
              {activePreviewTab === "single" ? (
                // ─── TAB 1: SINGLE LABEL VIEW ───
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]" title={currentPreviewProduct.name}>
                      {currentPreviewProduct.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">
                        {previewIndex + 1} / {initialProducts.length}
                      </span>
                      <button
                        type="button"
                        disabled={previewIndex === 0}
                        onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                        className="h-6 w-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={previewIndex >= initialProducts.length - 1}
                        onClick={() => setPreviewIndex((i) => Math.min(initialProducts.length - 1, i + 1))}
                        className="h-6 w-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs min-h-[190px]">
                    {currentSpec.type === "tag" ? (
                      // 1. Dual-Wing Optical Butterfly Fold Tag (100x15 mm)
                      <div
                        className="w-full max-w-[360px] h-[72px] bg-white border border-dashed border-slate-400 rounded-xs flex items-center justify-between p-2 select-none shadow-xs text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {/* Left Wing */}
                        <div className="w-[42%] flex flex-col justify-center text-left overflow-hidden leading-tight">
                          <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">
                            CLINICAL OPTICAL
                          </span>
                          <span className="text-[9px] font-bold text-slate-800 truncate" title={currentPreviewProduct.name}>
                            {currentPreviewProduct.name}
                          </span>
                          <span className="text-[10px] font-extrabold text-[#2563eb] mt-0.5">
                            {formatPrice(currentPreviewProduct.price)}
                          </span>
                        </div>

                        {/* Middle Bridge: Frame Temple Fold Zone */}
                        <div className="w-[16%] h-full border-l border-r border-dashed border-slate-300 flex flex-col items-center justify-center px-0.5">
                          <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-widest">
                            FOLD
                          </span>
                          <span className="text-[5px] text-slate-300">———</span>
                        </div>

                        {/* Right Wing: Code 39 Barcode + SKU */}
                        <div className="w-[42%] flex flex-col items-center justify-center text-center overflow-hidden">
                          {(() => {
                            const previewSku =
                              currentPreviewProduct.sku ||
                              (currentPreviewProduct.category
                                ? `${currentPreviewProduct.category.slice(0, 3).toUpperCase()}-GEN-00001`
                                : "FRM-GEN-00001");
                            return (
                              <>
                                <div
                                  className="w-full h-7 flex items-center justify-center overflow-hidden"
                                  dangerouslySetInnerHTML={{
                                    __html: buildBarcodeSvgString(previewSku, 24, 1.2),
                                  }}
                                />
                                <span className="text-[8px] font-mono font-bold text-slate-800 tracking-wider mt-0.5">
                                  {previewSku}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      // 2. Standard Retail Label (50x25, 38x25, 40x30 mm)
                      <div
                        className="w-full max-w-[280px] h-[105px] bg-white border border-dashed border-slate-400 rounded-xs p-2.5 flex flex-col justify-between select-none shadow-xs text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex flex-col text-left min-w-0 flex-1">
                            <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">
                              CLINICAL OPTICAL
                            </span>
                            <span className="text-[10px] font-bold text-slate-800 truncate" title={currentPreviewProduct.name}>
                              {currentPreviewProduct.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-extrabold text-[#2563eb] shrink-0 ml-1">
                            {formatPrice(currentPreviewProduct.price)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-full mt-1">
                          {(() => {
                            const previewSku =
                              currentPreviewProduct.sku ||
                              (currentPreviewProduct.category
                                ? `${currentPreviewProduct.category.slice(0, 3).toUpperCase()}-GEN-00001`
                                : "FRM-GEN-00001");
                            return (
                              <>
                                <div
                                  className="w-full h-8 flex items-center justify-center overflow-hidden"
                                  dangerouslySetInnerHTML={{
                                    __html: buildBarcodeSvgString(previewSku, 28, 1.3),
                                  }}
                                />
                                <span className="text-[9px] font-mono font-bold text-slate-800 tracking-wider mt-0.5">
                                  {previewSku}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400 font-medium text-center">
                      Live preview of single label for <span className="font-bold text-slate-700">{currentPreviewProduct.name}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // ─── TAB 2: SHEET / PAGE PREVIEW ───
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs min-h-[220px]">
                  {paperSize === "continuous" ? (
                    // Continuous Thermal Roll Mockup
                    <div className="w-full flex flex-col items-center justify-center py-2">
                      <div className="w-[190px] bg-slate-50 border border-slate-300 rounded-sm shadow-sm p-2 flex flex-col items-center space-y-1.5 overflow-hidden">
                        <div className="w-full border-b border-dashed border-slate-300 pb-1 flex items-center justify-between text-[8px] font-bold text-slate-400">
                          <span>THERMAL ROLL FEED</span>
                          <span>{currentSpec.widthMm}×{currentSpec.heightMm}mm</span>
                        </div>
                        {[0, 1, 2].map((idx) => (
                          <div
                            key={idx}
                            className={`w-full py-1.5 px-2 rounded-[2px] border border-dashed flex items-center justify-between text-[7.5px] font-bold ${
                              idx < totalLabels
                                ? "bg-blue-50/80 border-blue-300 text-blue-900"
                                : "bg-slate-100 border-slate-200 text-slate-400 opacity-40"
                            }`}
                          >
                            <span className="truncate max-w-[85px]">{currentPreviewProduct.name}</span>
                            <span className="font-mono text-[7px] text-[#2563eb]">#{idx + 1}</span>
                          </div>
                        ))}
                        {totalLabels > 3 && (
                          <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">
                            ••• +{totalLabels - 3} more labels on roll •••
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-extrabold text-slate-600 mt-2 text-center">
                        Continuous Thermal Roll ({currentSpec.widthMm}×{currentSpec.heightMm} mm)
                      </p>
                      <p className="text-[9.5px] text-slate-400 font-medium text-center">
                        1 label per print cut • Total <strong className="text-slate-700">{totalLabels} labels</strong>
                      </p>
                    </div>
                  ) : (
                    // Realistic A4 / A5 Sticker Sheet Grid Mockup
                    <div className="w-full flex flex-col items-center justify-center">
                      <div
                        className="bg-white aspect-[1/1.414] w-[170px] shadow-md border border-slate-300 rounded-[2px] p-1.5 grid gap-0.5"
                        style={{
                          gridTemplateColumns: `repeat(${paperSize === "a4" ? currentSpec.a4Cols : currentSpec.a5Cols}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: labelsPerPage }).map((_, i) => {
                          const isFilled = i < pageFilledCount;
                          return (
                            <div
                              key={i}
                              className={`border rounded-[1px] transition-all flex items-center justify-center ${
                                currentSpec.type === "tag" ? "aspect-[6/1]" : "aspect-[2/1]"
                              } ${
                                isFilled
                                  ? "bg-blue-500/20 border-blue-500/60 shadow-2xs"
                                  : "bg-slate-50 border-slate-200/80 opacity-20"
                              }`}
                            >
                              {isFilled && (
                                <span className="text-[5px] font-mono text-blue-700 font-bold leading-none select-none">
                                  {pageStartIndex + i + 1}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Sheet Page Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            type="button"
                            disabled={safeSheetPage <= 1}
                            onClick={() => setSheetPage((p) => Math.max(1, p - 1))}
                            className="h-6 px-2 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <ChevronLeft className="h-3 w-3" /> Prev
                          </button>
                          <span className="text-[10px] font-extrabold text-slate-700">
                            Page {safeSheetPage} of {totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={safeSheetPage >= totalPages}
                            onClick={() => setSheetPage((p) => Math.min(totalPages, p + 1))}
                            className="h-6 px-2 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            Next <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Detailed Layout & Labels Per Page Summary */}
                      <div className="text-center mt-2 space-y-0.5">
                        <p className="text-[10px] font-extrabold text-slate-700">
                          Visualizing {pageFilledCount} labels on Page {safeSheetPage} of {totalPages}
                        </p>
                        <p className="text-[9.5px] font-semibold text-slate-500">
                          {paperSize.toUpperCase()} Sheet: <strong className="text-slate-800">{labelsPerPage} labels/page</strong> ({paperSize === "a4" ? `${currentSpec.a4Cols}×${currentSpec.a4Rows}` : `${currentSpec.a5Cols}×${currentSpec.a5Rows}`} Grid)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Specifications Specs Box */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Label Dimensions:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {currentSpec.widthMm} mm × {currentSpec.heightMm} mm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Print Media &amp; Grid:</span>
                  <span className="font-bold text-slate-800">
                    {paperSize === "continuous"
                      ? "Continuous Thermal Roll (1 label/cut)"
                      : `${paperSize.toUpperCase()} Sheet (${labelsPerPage} labels/page • ${paperSize === "a4" ? `${currentSpec.a4Cols}×${currentSpec.a4Rows}` : `${currentSpec.a5Cols}×${currentSpec.a5Rows}`})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Sheets Required:</span>
                  <span className="font-bold text-[#2563eb]">
                    {paperSize === "continuous"
                      ? `${totalLabels} feed labels`
                      : `${totalPages} ${totalPages === 1 ? "sheet" : "sheets"} (${labelsPerPage} labels/sheet)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Barcode Symbology:</span>
                  <span className="font-mono font-bold text-slate-800">Code 39 (Alphanumeric)</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700">Total Labels Queued:</span>
                  <span className="font-extrabold text-[#2563eb] text-sm">
                    {totalLabels} labels ({activeProductCount} items)
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero-lag print engine ready. Spooled directly to printer without lag.</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <footer className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Layout: <strong className="text-slate-800">{currentSpec.displayName}</strong> on{" "}
              <strong className="text-slate-800">
                {paperSize === "continuous"
                  ? "Continuous Roll"
                  : `${paperSize.toUpperCase()} Sheet (${labelsPerPage}/page)`}
              </strong>
            </span>
          </div>

          <button
            type="button"
            disabled={totalLabels === 0}
            onClick={handleExecutePrint}
            className="h-8.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print {totalLabels} Barcodes Now</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
