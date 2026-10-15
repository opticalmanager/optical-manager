"use client";

import { useState, useMemo, useEffect } from "react";
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
  RotateCw,
  Maximize2,
  Sliders,
  CheckCheck,
  Glasses,
  Box,
  Info,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  LABEL_SPECS,
  type LabelSizePreset,
  buildBulkLabelsHtml,
  buildBarcodeSvgString,
  printBarcodeDocument,
  resolveDisplayTitle,
  BarcodeItem,
  loadBarcodePreferences,
  saveBarcodePreferences,
  DEFAULT_BARCODE_PRESET,
  DEFAULT_PAPER_SIZE,
  getDefaultStoreHeader,
  formatStoreHeaderForLabel,
  generateBulkOpticalTagsTSPL,
  downloadTSPLPrnFile,
} from "@/utils/barcode.utils";
import { getActiveOrganizationNameAction } from "@/actions/organization.actions";

export interface BulkBarcodeProduct {
  id: string;
  name: string;
  sku: string | null;
  productCode?: string | null;
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
  // Selected preset and paper size - Default to the 81x12 mm D-Gum Flap Tag on Continuous Thermal Roll
  const [selectedPreset, setSelectedPreset] = useState<LabelSizePreset>(DEFAULT_BARCODE_PRESET);
  const [paperSize, setPaperSize] = useState<"continuous" | "a4" | "a5">(DEFAULT_PAPER_SIZE);
  const [customHeader, setCustomHeader] = useState<string>(() => getDefaultStoreHeader("OPTICAL STORE"));
  const [rotation, setRotation] = useState<0 | 180>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Hydrate preferences automatically from localStorage on client mount
  useEffect(() => {
    const saved = loadBarcodePreferences();
    const storeHeader = getDefaultStoreHeader();
    if (saved) {
      if (saved.preset && LABEL_SPECS[saved.preset]) {
        if (saved.preset === "81x12 mm (Vertical 2-Up)" || saved.preset === "81x12 mm (Vertical 1-Up)") {
          setSelectedPreset("81x12 mm (D-Gum Flap Tag)");
          saveBarcodePreferences({ preset: "81x12 mm (D-Gum Flap Tag)" });
        } else {
          setSelectedPreset(saved.preset);
        }
      }
      if (saved.paperSize) {
        setPaperSize(saved.paperSize);
      }
      if (saved.rotation === 180 || saved.rotation === 0) {
        setRotation(saved.rotation);
      }
      if (saved.customHeader && saved.customHeader.trim().toUpperCase() !== "CLINICAL OPTICAL") {
        setCustomHeader(saved.customHeader);
      } else if (storeHeader && storeHeader !== "OPTICAL STORE") {
        setCustomHeader(storeHeader);
      }
    } else if (storeHeader && storeHeader !== "OPTICAL STORE") {
      setCustomHeader(storeHeader);
    }

    // Live server query for organization name
    getActiveOrganizationNameAction().then((name) => {
      if (name && name.trim()) {
        const cleanName = formatStoreHeaderForLabel(name);
        if (typeof window !== "undefined") {
          localStorage.setItem("om_organization_name", name.trim());
        }
        setCustomHeader((prev) => {
          if (!prev || prev === "CLINICAL OPTICAL" || prev === "OPTICAL STORE") {
            return cleanName;
          }
          return prev;
        });
      }
    });

    setIsLoaded(true);
  }, []);

  // Preview tab toggle: Single Label vs Sheet/Roll Preview
  const [activePreviewTab, setActivePreviewTab] = useState<"single" | "sheet">("single");
  const [sheetPage, setSheetPage] = useState<number>(1);

  // Selected preview item index (for Single Label tab)
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Stable product key helper to ensure every item in large batches (e.g. 73 items) has a unique key
  const getProductKey = (p: BulkBarcodeProduct, idx: number) => p.id || p.sku || p.productCode || `prod-${idx}`;

  // Editable quantities per product
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialProducts.forEach((p, idx) => {
      initial[getProductKey(p, idx)] = Math.max(1, p.quantity || 1);
    });
    return initial;
  });

  // Re-sync quantities if initialProducts updates or mounts
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProductQuantities((prev) => {
        const next: Record<string, number> = { ...prev };
        let hasChanges = false;
        initialProducts.forEach((p, idx) => {
          const key = getProductKey(p, idx);
          if (next[key] === undefined) {
            next[key] = Math.max(1, p.quantity || 1);
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }
  }, [initialProducts]);

  // Search filter for product listing
  const [productSearch, setProductSearch] = useState<string>("");

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return initialProducts;
    const q = productSearch.trim().toLowerCase();
    return initialProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const code = (p.productCode || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || code.includes(q) || cat.includes(q);
    });
  }, [initialProducts, productSearch]);

  const currentSpec = LABEL_SPECS[selectedPreset] || LABEL_SPECS[DEFAULT_BARCODE_PRESET];

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

  const currentPreviewTitle = resolveDisplayTitle(
    currentPreviewProduct.name,
    currentPreviewProduct.category,
    null,
    null,
    currentPreviewProduct.productCode || currentPreviewProduct.sku
  );

  // Handle preset change: auto-select "continuous" for vertical tags & D-Gum flap tags + auto-save preference
  const handleSelectPreset = (preset: LabelSizePreset) => {
    setSelectedPreset(preset);
    setSheetPage(1);
    const spec = LABEL_SPECS[preset];
    let nextPaper = paperSize;
    if (spec?.type === "vertical-tag" || spec?.type === "dgum-flap") {
      nextPaper = "continuous";
      setPaperSize("continuous");
    }
    saveBarcodePreferences({ preset, paperSize: nextPaper });
  };

  // Handle paper size change + auto-save preference
  const handleSelectPaperSize = (newPaper: "continuous" | "a4" | "a5") => {
    setPaperSize(newPaper);
    setSheetPage(1);
    saveBarcodePreferences({ preset: selectedPreset, paperSize: newPaper });
  };

  // Handle single item quantity change
  const handleQuantityChange = (key: string, delta: number) => {
    setProductQuantities((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, Math.min(500, current + delta));
      return { ...prev, [key]: next };
    });
  };

  const handleSetExactQuantity = (key: string, val: string) => {
    const parsed = parseInt(val, 10);
    setProductQuantities((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? 0 : Math.max(0, Math.min(500, parsed)),
    }));
  };

  const handleResetToInward = () => {
    const next: Record<string, number> = {};
    initialProducts.forEach((p, idx) => {
      next[getProductKey(p, idx)] = Math.max(1, p.quantity || 1);
    });
    setProductQuantities(next);
    toast.info(`Reset all ${initialProducts.length} label counts to inward quantities.`);
  };

  const handleClearAll = () => {
    const next: Record<string, number> = {};
    initialProducts.forEach((p, idx) => {
      next[getProductKey(p, idx)] = 0;
    });
    setProductQuantities(next);
  };

  const handleAddOneToAll = () => {
    setProductQuantities((prev) => {
      const next = { ...prev };
      initialProducts.forEach((p, idx) => {
        const key = getProductKey(p, idx);
        next[key] = (next[key] || 0) + 1;
      });
      return next;
    });
  };

  // Dispatch batch print with zero lag
  const handleExecutePrint = () => {
    const itemsToPrint: Array<{ item: BarcodeItem; quantity: number }> = [];

    initialProducts.forEach((p, idx) => {
      const key = getProductKey(p, idx);
      const q = productQuantities[key] || 0;
      if (q > 0) {
        const fallbackSku = p.category
          ? `${p.category.slice(0, 3).toUpperCase()}-GEN-00001`
          : "FRM-GEN-00001";
        itemsToPrint.push({
          item: {
            id: p.id || key,
            name: p.name,
            category: p.category || "FRAME",
            brand: null,
            model: null,
            sku: p.sku || fallbackSku,
            productCode: p.productCode || p.sku || null,
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
      dGumConfig: currentSpec.dGumConfig,
      customHeader: customHeader || undefined,
      rotation,
    });

    const success = printBarcodeDocument(html);
    if (!success) {
      toast.error("Could not trigger printer. Please check browser print permissions.");
    } else {
      if (paperSize === "continuous") {
        toast.info("Thermal Print: In the print dialog, select your Thermal Printer & set Margins to 'None'.", {
          duration: 6000,
        });
      }
      toast.success(`Dispatched ${totalLabels} barcode labels (${currentSpec.displayName}) to printer.`);
      onClose();
    }
  };

  const handleDownloadBulkTSPL = () => {
    const itemsToPrint: Array<{ item: BarcodeItem; quantity: number }> = [];

    initialProducts.forEach((p, idx) => {
      const key = getProductKey(p, idx);
      const q = productQuantities[key] || 0;
      if (q > 0) {
        const fallbackSku = p.category
          ? `${p.category.slice(0, 3).toUpperCase()}-GEN-00001`
          : "FRM-GEN-00001";
        itemsToPrint.push({
          item: {
            id: p.id || key,
            name: p.name,
            category: p.category || "FRAME",
            brand: null,
            model: null,
            sku: p.sku || fallbackSku,
            productCode: p.productCode || p.sku || null,
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

    const tspl = generateBulkOpticalTagsTSPL(itemsToPrint, {
      shopName: formatStoreHeaderForLabel(customHeader, 15),
      currencySymbol: "Rs. ",
    });

    const safeInv = (invoiceNumber || "batch").replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadTSPLPrnFile(tspl, `tsc_bulk_tags_${safeInv}.prn`);
    toast.success(`Downloaded bulk TSC TSPL .PRN file for ${totalLabels} labels! Ready for TSC TTP-244 Plus.`);
  };

  // Format currency
  const formatPrice = (val: string | null) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN")}/-`;
  };

  // Groups of presets
  const tagPresets: LabelSizePreset[] = [
    "81x12 mm (D-Gum Flap Tag)",
    "100x15 mm (Vertical 3-Up)",
    "100x15 mm (Vertical 2-Up)",
    "100x15 mm (Vertical 1-Up)",
    "100x15 mm (Tag)",
  ];

  const boxPresets: LabelSizePreset[] = [
    "50x25 mm (Standard)",
    "38x25 mm (Compact Jewel)",
    "40x30 mm (Medium Box)",
    "50x50 mm (Square Box)",
  ];

  if (!isOpen) return null;

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
                Thermal roll &amp; sticker sheet printing with industrial 1-Up / 3-Up vertical roll support.
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
              
              {/* 1. Label Preset Selector with Grouping */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Glasses className="h-3.5 w-3.5 text-[#2563eb]" />
                    <span>Optical Frame &amp; Barbell Tags (Thermal Rolls / Sheets)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600">
                    Jewelry &amp; Eyewear Standard
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {tagPresets.map((key) => {
                    const spec = LABEL_SPECS[key];
                    if (!spec) return null;
                    const isSelected = selectedPreset === key;
                    const isPhotoStandard = key === "100x15 mm (Vertical 3-Up)";
                    const isDGumFlap = spec.type === "dgum-flap";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectPreset(key)}
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
                          {isDGumFlap && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                              NTK Flap ⭐
                            </span>
                          )}
                          {isPhotoStandard && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              3-Up Roll ⭐
                            </span>
                          )}
                          {isSelected && !isPhotoStandard && !isDGumFlap && <Check className="h-3.5 w-3.5 text-[#2563eb]" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                          {spec.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Box className="h-3.5 w-3.5 text-slate-500" />
                    <span>Box &amp; Case Barcode Labels</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {boxPresets.map((key) => {
                      const spec = LABEL_SPECS[key];
                      if (!spec) return null;
                      const isSelected = selectedPreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectPreset(key)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#2563eb] bg-blue-50/70 shadow-xs ring-1 ring-[#2563eb]"
                              : "border-slate-200 hover:border-blue-200 bg-white"
                          }`}
                        >
                          <span className={`text-[11px] font-bold block truncate ${isSelected ? "text-[#2563eb]" : "text-slate-800"}`}>
                            {spec.displayName}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate mt-0.5">
                            {spec.widthMm}×{spec.heightMm}mm
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                      ? `Continuous Thermal Roll (${currentSpec.rollWidthMm || currentSpec.widthMm}×${currentSpec.rollHeightMm || currentSpec.heightMm}mm)`
                      : `${paperSize.toUpperCase()} Sheet (${labelsPerPage} labels/page)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPaperSize("continuous")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "continuous"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Continuous Thermal Roll ({currentSpec.rollWidthMm || currentSpec.widthMm}×{currentSpec.rollHeightMm || currentSpec.heightMm}mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPaperSize("a4")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "a4"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    A4 Sheet ({currentSpec.a4Total}/pg)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPaperSize("a5")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paperSize === "a5"
                        ? "bg-[#2563eb] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    A5 Sheet ({currentSpec.a5Total}/pg)
                  </button>
                </div>
              </div>

              {/* 3. Thermal Printer Setup Guidance Card */}
              {paperSize === "continuous" ? (
                <div className="p-3 rounded-xl bg-blue-50/95 border border-blue-300 text-blue-950 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <Info className="h-4 w-4 text-[#2563eb] shrink-0" />
                    <span>TSC TTP-244 Plus &amp; Thermal Roll Print Checklist (Avoids distortion &amp; sideways prints):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-0.5">
                    <div className="bg-white/90 p-1.5 rounded-lg border border-blue-200">
                      <strong className="text-slate-800">1. Destination:</strong> Select <strong>TSC TTP-244 Plus</strong> (or your Thermal Printer).
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-lg border border-blue-200">
                      <strong className="text-slate-800">2. Paper Size:</strong> Select <strong>USER</strong> (In Windows printer preferences, set to <strong>Width: 81mm, Height: 12mm</strong>).
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-lg border border-blue-200">
                      <strong className="text-slate-800">3. Scale:</strong> Select <strong>Scale: 100%</strong> (⚠️ <em>Do NOT use &quot;Fit to page width&quot;</em>).
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-lg border border-blue-200">
                      <strong className="text-slate-800">4. Margins:</strong> In <em>More settings</em>, set <strong>Margins: None</strong>.
                    </div>
                  </div>

                  {/* Orientation / Rotation Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 mt-1">
                    <span className="text-[11px] font-bold text-blue-900">
                      Feed Orientation:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = rotation === 0 ? 180 : 0;
                        setRotation(next);
                        saveBarcodePreferences({ preset: selectedPreset, rotation: next });
                      }}
                      className={`px-2 py-0.8 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                        rotation === 180
                          ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                          : "bg-white text-blue-800 border-blue-200 hover:bg-blue-100/50"
                      }`}
                      title="Toggles 180° rotation if workstation TSC driver uses Portrait (0° / DIRECTION 0,0)"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>{rotation === 180 ? "Flipped 180° (Direction 0,0)" : "Standard (0° Normal Feed)"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-slate-700 text-xs">
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold">Sheet Printer Setup Tip:</span> In print dialog, select <strong>Paper size: {paperSize.toUpperCase()}</strong>, <strong>Scale: 100% (Actual Size)</strong>, and <strong>Margins: Default/None</strong>.
                  </div>
                </div>
              )}

              {/* Store Header Setting */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Store Header on Barcode Labels
                  </label>
                  <span className="text-[10px] text-[#2563eb] font-bold">
                    Organization Name
                  </span>
                </div>
                <input
                  type="text"
                  value={customHeader}
                  maxLength={25}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCustomHeader(val);
                    saveBarcodePreferences({ customHeader: val });
                  }}
                  placeholder="e.g. PUNJAB OPTICS"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 uppercase focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Top header printed on micro tag wings (fits 14mm / up to 15 chars, e.g. <span className="font-bold text-slate-700">PUNJAB OPTICS</span>). Longer names are auto-formatted.
                </p>
              </div>

              {/* 4. Products List & Stepper Controls */}
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
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Inward Qty
                    </button>
                    <button
                      type="button"
                      onClick={handleAddOneToAll}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      +1 All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Zero
                    </button>
                  </div>
                </div>

                {/* Search Bar for Large Batches (e.g. 73 items) */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={`Search among ${initialProducts.length} products by name, code, SKU...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-12 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Products Table with Steppers */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3">Product Name &amp; Code</th>
                        <th className="py-2 px-2">Retail Price</th>
                        <th className="py-2 px-3 text-right">Labels to Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                            No products match &ldquo;{productSearch}&rdquo;
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const originalIdx = initialProducts.findIndex((orig) => orig === p);
                          const idx = originalIdx >= 0 ? originalIdx : 0;
                          const key = getProductKey(p, idx);
                          const qty = productQuantities[key] || 0;
                          const isPreviewed = previewIndex === idx;
                          const title = resolveDisplayTitle(
                            p.name,
                            p.category,
                            null,
                            null,
                            p.productCode || p.sku
                          );
                          return (
                            <tr
                              key={key}
                              onClick={() => setPreviewIndex(idx)}
                              className={`cursor-pointer transition-colors ${
                                isPreviewed
                                  ? "bg-blue-50/80 font-medium"
                                  : qty > 0
                                  ? "hover:bg-slate-50/80"
                                  : "hover:bg-slate-50/50 opacity-60"
                              }`}
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${isPreviewed ? "bg-[#2563eb]" : "bg-slate-300"}`} />
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-800 block truncate max-w-[220px]" title={title}>
                                      {title}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                                      {p.sku || p.productCode || "Auto SKU"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-slate-600 font-semibold">
                                {formatPrice(p.price)}
                              </td>
                              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(key, -1)}
                                    disabled={qty <= 0}
                                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={500}
                                    value={qty}
                                    onChange={(e) => handleSetExactQuantity(key, e.target.value)}
                                    className="w-11 h-6 text-center text-xs font-bold rounded border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(key, 1)}
                                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
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
              </div>

            </div>

            {/* ─── RIGHT COLUMN: Live Interactive Preview (5 cols) ─── */}
            <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 min-w-0">
              
              {/* Segmented Control Header: Single vs Sheet */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-[#2563eb]" />
                  <span>Real-Time Label Preview</span>
                </span>
                
                {/* Segmented Switcher */}
                <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("single")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      activePreviewTab === "single"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Single Label
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("sheet")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      activePreviewTab === "sheet"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {paperSize === "continuous" ? "Roll Feed" : "Sheet Grid"}
                  </button>
                </div>
              </div>

              {/* Main Visualizer Container */}
              {activePreviewTab === "single" ? (
                // ─── TAB 1: SINGLE LABEL VIEW ───
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]" title={currentPreviewTitle}>
                      {currentPreviewTitle}
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

                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs min-h-[220px]">
                    {currentSpec.type === "dgum-flap" ? (
                      (() => {
                        const previewSku =
                          currentPreviewProduct.sku ||
                          currentPreviewProduct.productCode ||
                          (currentPreviewProduct.category
                            ? `${currentPreviewProduct.category.slice(0, 3).toUpperCase()}-GEN-00001`
                            : "FRM-GEN-00001");

                        const headMm = currentSpec.dGumConfig?.headLengthMm || 51;
                        const tailMm = currentSpec.dGumConfig?.tailLengthMm || 30;
                        const s1Mm = currentSpec.dGumConfig?.section1LengthMm || 25.5;
                        const s2Mm = currentSpec.dGumConfig?.section2LengthMm || 25.5;
                        const totalMm = headMm + tailMm; // 81mm

                        return (
                          <div className="w-full flex flex-col items-center">
                            {/* Physical Label HUD Metric Tags */}
                            <div className="w-full max-w-[540px] flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 mb-1.5 px-1">
                              <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <span>81 mm × 12 mm NTK D-Gum Flap Tag</span>
                              </span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Wing 1 ({s1Mm}mm) + Wing 2 ({s2Mm}mm) + Tail ({tailMm}mm) = {totalMm}mm
                              </span>
                            </div>

                            {/* Authentic NTK Die-Cut Tag Outline (540px × 72px scaled for 81×12 mm) */}
                            <div
                              className="w-full max-w-[540px] h-[72px] flex items-stretch select-none font-sans overflow-hidden transition-transform duration-300"
                              style={{
                                fontFamily: "Inter, sans-serif",
                                transform: rotation === 180 ? "rotate(180deg)" : "none",
                              }}
                            >
                              {/* Left Foldable Head (51mm / 81mm ≈ 62.96%) */}
                              <div
                                style={{ width: `${(headMm / totalMm) * 100}%` }}
                                className="h-full bg-white border border-slate-300 rounded-l-md shadow-xs flex items-stretch overflow-hidden"
                              >
                                {/* Wing 1 (0 to 25.5mm): Front Wing */}
                                <div
                                  style={{ width: `${(s1Mm / headMm) * 100}%` }}
                                  className="h-full flex flex-col justify-between p-1.5 pr-1 text-left overflow-hidden bg-white"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[5.5px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[70px]">
                                      {formatStoreHeaderForLabel(customHeader || "OPTICAL STORE", 15)}
                                    </span>
                                    <span className="text-[9px] font-extrabold text-[#2563eb] shrink-0">
                                      {formatPrice(currentPreviewProduct.price)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col w-full overflow-hidden leading-tight">
                                    <span className="text-[7.5px] font-extrabold text-slate-900 truncate block">
                                      {currentPreviewProduct.category || "OPTICAL FRAME"}
                                    </span>
                                    <span className="text-[6.5px] text-slate-500 block truncate" title={currentPreviewTitle}>
                                      {currentPreviewTitle}
                                    </span>
                                  </div>
                                </div>

                                {/* Center Dotted Fold Guideline (at 25.5mm) */}
                                <div className="w-0 h-full border-r border-dashed border-blue-400 relative flex items-center justify-center">
                                  <span className="text-[5px] font-extrabold text-blue-600 tracking-widest uppercase bg-white px-0.5 py-0.5 rounded shadow-2xs z-2 border border-blue-200 absolute -translate-x-1/2">
                                    FOLD
                                  </span>
                                </div>

                                {/* Wing 2 (25.5mm to 51mm): Back Wing (Barcode + SKU) */}
                                <div
                                  style={{ width: `${(s2Mm / headMm) * 100}%` }}
                                  className="h-full flex flex-col items-center justify-center text-center overflow-hidden bg-white p-1 pl-1"
                                >
                                  <div
                                    className="w-full max-w-[140px] h-6 flex items-center justify-center overflow-hidden"
                                    dangerouslySetInnerHTML={{
                                      __html: buildBarcodeSvgString(previewSku, 20, 0.85, "code128"),
                                    }}
                                  />
                                  <span className="text-[6.5px] font-mono tracking-[0.12em] font-bold text-slate-800 mt-0.5 truncate">
                                    {previewSku}
                                  </span>
                                </div>
                              </div>

                              {/* Right Tail: Narrow Adhesive-Free Loop Strap (30mm / 81mm ≈ 37.04%) */}
                              <div
                                style={{ width: `${(tailMm / totalMm) * 100}%` }}
                                className="h-full flex items-center justify-start overflow-hidden relative pl-0"
                              >
                                <div className="w-full h-[18px] bg-amber-50/90 border-t border-b border-r border-dashed border-amber-300 rounded-r-full shadow-2xs flex items-center justify-center px-1 text-center relative">
                                  <span className="text-[7px] font-mono font-bold text-amber-700 tracking-wide uppercase select-none truncate">
                                    ◀ Adhesive Free ▶
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Dimension Rulers (51mm Head [25.5mm Front + 25.5mm Back] + 30mm Tail) */}
                            <div className="w-full max-w-[540px] flex items-center justify-between text-[7.5px] font-mono font-bold text-slate-400 mt-1 px-1">
                              <div
                                style={{ width: `${(headMm / totalMm) * 100}%` }}
                                className="flex items-center justify-between text-indigo-600 border-t border-indigo-200 pt-0.5"
                              >
                                <span className="w-1/2 text-left">├── {s1Mm}mm Front</span>
                                <span className="w-1/2 text-right">{s2Mm}mm Back ──┤</span>
                              </div>
                              <div
                                style={{ width: `${(tailMm / totalMm) * 100}%` }}
                                className="text-center text-amber-700 truncate border-t border-amber-300 pt-0.5 ml-1"
                              >
                                ├── {tailMm}mm Tail ──┤
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : currentSpec.type === "vertical-tag" ? (
                      currentSpec.heightMm === 81 ? (
                        // VERTICAL 81x12 mm NTK FLAP TAG PREVIEW
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              12mm × 81mm Vertical Roll
                            </span>
                            <span className="text-[8px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              NTK Flap Standard ⭐
                            </span>
                          </div>
                          <div
                            className="w-[44px] h-[304px] flex flex-col justify-start items-center select-none text-slate-900 shadow-sm"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {/* Head Body: 51mm = Wing 1 (25.5mm) + Fold + Wing 2 (25.5mm) */}
                            <div className="w-full h-[192px] bg-white border border-dashed border-slate-700 rounded-t-sm shadow-xs flex flex-col overflow-hidden">
                              {/* Top Wing 1 (Front Wing - 96px) */}
                              <div className="w-full h-[96px] flex items-center justify-center overflow-hidden relative">
                                <div className="w-[88px] h-[38px] rotate-90 transform-gpu flex flex-col justify-between p-1 select-none leading-tight">
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[5.5px] uppercase font-bold text-slate-800 tracking-wider truncate max-w-[46px]">
                                      {formatStoreHeaderForLabel(customHeader || "OPTICAL STORE", 15)}
                                    </span>
                                    <span className="text-[8px] font-black text-black shrink-0">
                                      {formatPrice(currentPreviewProduct.price)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col w-full overflow-hidden">
                                    <span className="text-[7px] font-bold text-black truncate block" title={currentPreviewTitle}>
                                      {currentPreviewTitle}
                                    </span>
                                    <span className="text-[5.5px] font-semibold text-slate-700 uppercase tracking-wide truncate block">
                                      {currentPreviewProduct.category || "FRAME"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Center Fold Divider at 25.5mm */}
                              <div className="w-full h-0 border-t border-dashed border-slate-500 relative shrink-0" />

                              {/* Bottom Wing 2 (Back Wing - 96px: Barcode & SKU Rotated 90°) */}
                              <div className="w-full h-[96px] flex items-center justify-center overflow-hidden relative">
                                {(() => {
                                  const previewSku =
                                    currentPreviewProduct.sku ||
                                    (currentPreviewProduct.category
                                      ? `${currentPreviewProduct.category.slice(0, 3).toUpperCase()}-GEN-00001`
                                      : "FRM-GEN-00001");
                                  return (
                                    <div className="w-[88px] h-[38px] rotate-90 transform-gpu flex flex-col items-center justify-center select-none p-0.5">
                                      <div
                                        className="w-[80px] h-6 flex items-center justify-center overflow-hidden"
                                        dangerouslySetInnerHTML={{
                                          __html: buildBarcodeSvgString(previewSku, 20, 0.85, "code128"),
                                        }}
                                      />
                                      <span className="text-[6.5px] font-mono font-bold text-black tracking-widest mt-0.5 truncate">
                                        {previewSku}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Adhesive-Free Tail (30mm = 112px, narrow 12px loop) */}
                            <div className="w-full h-[112px] flex flex-col items-center justify-start overflow-hidden bg-transparent shrink-0">
                              <div className="w-[12px] h-full border-x border-b border-dashed border-amber-400 bg-amber-50/80 rounded-b-md flex items-center justify-center">
                                <span className="text-[5px] font-mono font-bold text-amber-800 rotate-90 uppercase tracking-widest whitespace-nowrap">
                                  TAIL
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // 1. VERTICAL DUMBBELL / BUTTERFLY OPTICAL TAG (15x100mm Narrow Strip Standard)
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              15mm × 100mm Tag
                            </span>
                            <span className="text-[8px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              Fold at 50mm Center
                            </span>
                          </div>
                          <div
                            className="w-[48px] h-[320px] flex flex-col justify-between items-center select-none text-slate-900 shadow-sm"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {/* Top Flap (Wing 1 - 48px wide x 122px tall: Vertical Rectangle, Rotated 90° along length) */}
                            <div className="w-full h-[122px] bg-white border border-dashed border-slate-400 rounded-t-sm shadow-xs flex items-center justify-center overflow-hidden relative">
                              <div className="w-[114px] h-[42px] rotate-90 transform-gpu flex flex-col justify-between p-1 select-none leading-tight">
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[6px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[50px]">
                                    {formatStoreHeaderForLabel(customHeader || "OPTICAL STORE", 15)}
                                  </span>
                                  <span className="text-[8.5px] font-extrabold text-[#2563eb] shrink-0">
                                    {formatPrice(currentPreviewProduct.price)}
                                  </span>
                                </div>
                                <div className="flex flex-col w-full overflow-hidden">
                                  <span className="text-[7.5px] font-bold text-slate-800 truncate block mt-0.5" title={currentPreviewTitle}>
                                    {currentPreviewTitle}
                                  </span>
                                  <span className="text-[6px] font-semibold text-slate-500 uppercase tracking-wide truncate block mt-0.5">
                                    {currentPreviewProduct.category || "FRAME"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Center Narrow Tail / Strap (16px wide x 76px tall with 50mm Center Fold Divider) */}
                            <div className="w-[16px] h-[76px] bg-white border-x border-dashed border-slate-400 shadow-2xs flex flex-col items-center justify-center my-[-1px] z-1 relative">
                              <div className="w-full border-t border-dashed border-slate-400 absolute top-1/2 left-0 -translate-y-1/2" />
                              <span className="text-[5px] text-slate-400 font-bold uppercase tracking-widest rotate-90 select-none bg-white px-0.5 z-2">
                                FOLD
                              </span>
                            </div>

                            {/* Bottom Flap (Wing 2 - 48px wide x 122px tall: Vertical Rectangle, Barcode Rotated 90° along length) */}
                            <div className="w-full h-[122px] bg-white border border-dashed border-slate-400 rounded-b-sm shadow-xs flex items-center justify-center overflow-hidden relative">
                              {(() => {
                                const previewSku =
                                  currentPreviewProduct.sku ||
                                  (currentPreviewProduct.category
                                    ? `${currentPreviewProduct.category.slice(0, 3).toUpperCase()}-GEN-00001`
                                    : "FRM-GEN-00001");
                                return (
                                  <div className="w-[114px] h-[42px] rotate-90 transform-gpu flex flex-col items-center justify-center select-none p-1">
                                    <div
                                      className="w-[104px] h-6 flex items-center justify-center overflow-hidden"
                                      dangerouslySetInnerHTML={{
                                        __html: buildBarcodeSvgString(previewSku, 22, 0.85, "code128"),
                                      }}
                                    />
                                    <span className="text-[7px] font-mono font-bold text-slate-800 tracking-widest mt-0.5 truncate">
                                      {previewSku}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )
                    ) : currentSpec.type === "tag" ? (
                      // 2. HORIZONTAL DUAL-WING OPTICAL BUTTERFLY TAG (100x15 mm)
                      <div
                        className="w-full max-w-[360px] h-[72px] bg-white border border-dashed border-slate-400 rounded-xs flex items-center justify-between p-2 select-none shadow-xs text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        <div className="w-[42%] flex flex-col justify-center text-left overflow-hidden leading-tight">
                          <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">
                            {formatStoreHeaderForLabel(customHeader || "OPTICAL STORE", 15)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-800 truncate" title={currentPreviewTitle}>
                            {currentPreviewTitle}
                          </span>
                          <span className="text-[10px] font-extrabold text-[#2563eb] mt-0.5">
                            {formatPrice(currentPreviewProduct.price)}
                          </span>
                        </div>

                        <div className="w-[16%] h-full border-l border-r border-dashed border-slate-300 flex flex-col items-center justify-center px-0.5">
                          <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-widest">
                            FOLD
                          </span>
                          <span className="text-[5px] text-slate-300">———</span>
                        </div>

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
                                    __html: buildBarcodeSvgString(previewSku, 24, 1.2, "code128"),
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
                      // 3. STANDARD RETAIL BOX LABEL (50x25, 38x25, 40x30, 50x50 mm)
                      <div
                        className="w-full max-w-[280px] h-[105px] bg-white border border-dashed border-slate-400 rounded-xs p-2.5 flex flex-col justify-between select-none shadow-xs text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex flex-col text-left min-w-0 flex-1">
                            <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">
                              {formatStoreHeaderForLabel(customHeader || "OPTICAL STORE", 20)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-800 truncate" title={currentPreviewTitle}>
                              {currentPreviewTitle}
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
                                    __html: buildBarcodeSvgString(previewSku, 28, 1.3, "code128"),
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
                      Live preview of single label for <span className="font-bold text-slate-700">{currentPreviewTitle}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // ─── TAB 2: SHEET / ROLL PREVIEW ───
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs min-h-[220px]">
                  {paperSize === "continuous" ? (
                    currentSpec.type === "dgum-flap" ? (
                      // ─── AUTHENTIC D-GUM FLAP CONTINUOUS ROLL MOCKUP ───
                      <div className="w-full flex flex-col items-center justify-center py-1">
                        <div className="w-[300px] bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden transition-all">
                          {/* Spool Header */}
                          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white px-2.5 py-1.5 flex items-center justify-between text-[8px] font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>FEED DIRECTION ↓</span>
                            </span>
                            <span className="font-mono text-slate-300 text-[8px]">
                              {currentSpec.rollWidthMm || currentSpec.widthMm}mm Web (Horizontal)
                            </span>
                          </div>

                          {/* Continuous Liner Web - Scrollable Feed */}
                          <div className="bg-slate-200/90 px-2.5 py-2 border-b border-slate-300 space-y-2 max-h-[300px] overflow-y-auto">
                            {initialProducts
                              .filter((p, i) => (productQuantities[getProductKey(p, i)] || 0) > 0)
                              .map((prod, idx) => {
                                const key = getProductKey(prod, idx);
                                const qty = productQuantities[key] || 1;
                                const sku = prod.sku || prod.productCode || (prod.category ? `${prod.category.slice(0, 3).toUpperCase()}-GEN-00001` : "FRM-GEN-00001");
                                const headMm = currentSpec.dGumConfig?.headLengthMm || 51;
                                const tailMm = currentSpec.dGumConfig?.tailLengthMm || 30;
                                const totalMm = headMm + tailMm;
                                const headPct = Math.round((headMm / totalMm) * 100);
                                const tailPct = 100 - headPct;

                                return (
                                  <div key={key} className="w-full bg-white rounded-[2px] border border-slate-300 shadow-2xs p-1 flex items-stretch h-[34px]">
                                    {/* Head Section (51mm / ~63%) */}
                                    <div style={{ width: `${headPct}%` }} className="flex items-stretch border-r border-dashed border-slate-300 pr-1">
                                      {/* Wing 1 (25.5mm Front Flap) */}
                                      <div className="w-1/2 text-[5.5px] text-slate-600 truncate pr-1 flex flex-col justify-center leading-tight">
                                        <span className="font-bold text-slate-800 truncate">{prod.category || "FRAME"}</span>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[#2563eb] font-extrabold">{formatPrice(prod.price)}</span>
                                          {qty > 1 && (
                                            <span className="text-[5px] font-mono font-bold bg-blue-50 text-blue-700 px-0.5 rounded">
                                              ×{qty}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Central Fold Indicator */}
                                      <div className="border-r border-dashed border-blue-400 my-0.5" />
                                      {/* Wing 2 (25.5mm Back Flap Barcode) */}
                                      <div className="w-1/2 flex flex-col items-center justify-center pl-1">
                                        <div
                                          className="w-full max-w-[65px] h-3 flex items-center justify-center overflow-hidden"
                                          dangerouslySetInnerHTML={{
                                            __html: buildBarcodeSvgString(sku, 12, 0.7, "code128"),
                                          }}
                                        />
                                        <span className="text-[4px] font-mono font-bold text-slate-700 tracking-wider truncate">
                                          {sku}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Tail Section (30mm / ~37%) */}
                                    <div style={{ width: `${tailPct}%` }} className="flex items-center justify-center pl-1">
                                      <div className="w-full h-[12px] bg-amber-50/90 border border-dashed border-amber-300 rounded-r-full flex items-center justify-center">
                                        <span className="text-[4.5px] font-mono font-bold text-amber-700 tracking-wider uppercase truncate">
                                          ◀ Tail ▶
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            {/* Perforation Cut Guideline */}
                            <div className="pt-1 border-t-2 border-dashed border-indigo-400 flex items-center justify-between text-[7px] font-bold text-indigo-600 px-1">
                              <span>- - -</span>
                              <span className="uppercase tracking-wider">
                                {currentSpec.rollHeightMm || currentSpec.heightMm}mm Feed Pitch Cut
                              </span>
                              <span>- - -</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] font-extrabold text-slate-700 mt-2 text-center">
                          Continuous Thermal Roll ({currentSpec.rollWidthMm || currentSpec.widthMm}×{currentSpec.rollHeightMm || currentSpec.heightMm} mm)
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium text-center">
                          D-Gum Flap Tag Roll • {currentSpec.rollHeightMm || currentSpec.heightMm}mm feed pitch • Total <strong className="text-slate-700">{totalLabels} labels</strong>
                        </p>
                      </div>
                    ) : currentSpec.type === "vertical-tag" ? (
                      // ─── AUTHENTIC MULTI-COLUMN VERTICAL ROLL MOCKUP (IMAGE 2 STANDARD) ───
                      <div className="w-full flex flex-col items-center justify-center py-1">
                        <div className={`${currentSpec.rollCols === 1 ? "w-[68px]" : currentSpec.rollCols === 2 ? "w-[110px]" : "w-[154px]"} bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden transition-all`}>
                          {/* Cylinder Spool Header */}
                          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white px-2 py-1.5 flex items-center justify-between text-[8px] font-bold">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>FEED ↓</span>
                            </span>
                            <span className="font-mono text-slate-300 text-[7.5px]">
                              {currentSpec.rollWidthMm || currentSpec.widthMm}mm Web
                            </span>
                          </div>

                          {/* Continuous Paper Liner Web */}
                          <div className="bg-slate-200/90 px-1.5 py-2 border-b border-slate-300">
                            {/* Vertical Tags Grid (Side-by-Side Horizontally Across Web Width) */}
                            <div className="flex flex-row items-center justify-center gap-[3px]">
                              {Array.from({ length: currentSpec.rollCols || 2 }).map((_, colIdx) => {
                                const prodIndex = (previewIndex + colIdx) % initialProducts.length;
                                const prod = initialProducts[prodIndex] || currentPreviewProduct;
                                const sku = prod.sku || prod.productCode || (prod.category ? `${prod.category.slice(0, 3).toUpperCase()}-GEN-00001` : "FRM-GEN-00001");
                                const title = resolveDisplayTitle(prod.name, prod.category, null, null, prod.productCode || prod.sku);

                                return (
                                  <div key={colIdx} className="flex flex-col items-center shrink-0">
                                    {/* Die-Cut Barbell Tag (15mm x 100mm Narrow Strip: 40px x 270px) */}
                                    <div className="w-[40px] h-[270px] flex flex-col justify-between items-center select-none shadow-xs rounded-[2px] bg-white">
                                      {/* Top Flap (Wing 1 - 40px wide x 102px tall: Vertical Rectangle, Rotated 90° along length) */}
                                      <div className="w-full h-[102px] bg-white border border-slate-300 rounded-t-[2px] flex items-center justify-center overflow-hidden relative shadow-2xs">
                                        <div className="w-[94px] h-[34px] rotate-90 transform-gpu flex flex-col justify-between p-1 select-none leading-tight">
                                          <div className="flex justify-between items-center w-full">
                                            <span className="text-[4px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[42px]">
                                              CLINICAL
                                            </span>
                                            <span className="text-[6.5px] font-extrabold text-[#2563eb] shrink-0">
                                              {formatPrice(prod.price)}
                                            </span>
                                          </div>
                                          <div className="flex flex-col w-full overflow-hidden">
                                            <span className="text-[6px] font-bold text-slate-800 truncate block" title={title}>
                                              {title}
                                            </span>
                                            <span className="text-[4.5px] font-semibold text-slate-500 uppercase tracking-wide truncate block mt-0.5">
                                              {prod.category || "FRAME"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Narrow Die-Cut Strap (13px wide x 66px tall with 50mm Center Fold Divider) */}
                                      <div className="w-[13px] h-[66px] bg-white border-x border-dashed border-slate-400 flex flex-col items-center justify-center my-[-1px] z-1 shadow-2xs relative">
                                        <div className="w-full border-t border-dashed border-slate-400 absolute top-1/2 left-0 -translate-y-1/2" />
                                        <span className="text-[4px] font-bold text-slate-400 tracking-widest rotate-90 select-none bg-white px-0.5 z-2">
                                          FOLD
                                        </span>
                                      </div>

                                      {/* Bottom Flap with Barcode (Wing 2 - 40px wide x 102px tall: Vertical Rectangle, Rotated 90° along length) */}
                                      <div className="w-full h-[102px] bg-white border border-slate-300 rounded-b-[2px] flex items-center justify-center overflow-hidden relative shadow-2xs">
                                        <div className="w-[94px] h-[34px] rotate-90 transform-gpu flex flex-col items-center justify-center select-none p-0.5">
                                          <div
                                            className="w-[86px] h-3.5 flex items-center justify-center overflow-hidden"
                                            dangerouslySetInnerHTML={{
                                              __html: buildBarcodeSvgString(sku, 14, 0.72, "code128"),
                                            }}
                                          />
                                          <span className="text-[4.5px] font-mono font-bold text-slate-700 tracking-wider mt-0.5 truncate">
                                            {sku}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-[7px] font-mono font-bold text-slate-600 bg-white/90 px-1 py-0.5 rounded border border-slate-300 mt-1 shadow-2xs">
                                      #{colIdx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Perforation / Feed Pitch Cut Guideline */}
                            <div className="pt-1.5 mt-1 border-t-2 border-dashed border-indigo-400 flex items-center justify-between text-[7px] font-bold text-indigo-600 px-1">
                              <span>- - -</span>
                              <span className="uppercase tracking-wider">{currentSpec.rollHeightMm || 100}mm Feed Pitch Cut</span>
                              <span>- - -</span>
                            </div>

                            {/* Next Row Peek (Showing Continuous Flow) */}
                            <div className="flex flex-row items-center justify-center gap-[3px] opacity-40 mt-1">
                              {Array.from({ length: currentSpec.rollCols || 2 }).map((_, nextIdx) => (
                                <div key={nextIdx} className="w-[40px] h-6 bg-white border border-slate-300 rounded-t-[2px] flex items-center justify-center text-[5.5px] font-mono font-bold text-slate-600">
                                  #{(currentSpec.rollCols || 2) + nextIdx + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] font-extrabold text-slate-700 mt-2 text-center">
                          Continuous Thermal Roll ({currentSpec.rollWidthMm || currentSpec.widthMm}×{currentSpec.rollHeightMm || currentSpec.heightMm} mm)
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium text-center">
                          {currentSpec.rollCols}-Across Vertical Tag Roll • {currentSpec.rollHeightMm || 100}mm feed length per pitch • Total <strong className="text-slate-700">{totalLabels} labels</strong>
                        </p>
                      </div>
                    ) : (
                      // Standard Box Labels Continuous Roll Mockup
                      <div className="w-full flex flex-col items-center justify-center py-2">
                        <div className="w-[200px] bg-slate-50 border border-slate-300 rounded-sm shadow-sm p-2 flex flex-col items-center space-y-2 overflow-hidden">
                          <div className="w-full border-b border-dashed border-slate-300 pb-1 flex items-center justify-between text-[8px] font-bold text-slate-400">
                            <span>THERMAL ROLL FEED</span>
                            <span>{currentSpec.rollWidthMm || currentSpec.widthMm}×{currentSpec.rollHeightMm || currentSpec.heightMm}mm</span>
                          </div>
                          {[0, 1, 2].map((idx) => {
                            const p = initialProducts[idx % initialProducts.length] || currentPreviewProduct;
                            const isQueued = idx < totalLabels;
                            return (
                              <div
                                key={idx}
                                className={`w-full py-2 px-2.5 rounded-[2px] border border-dashed flex items-center justify-between text-[8px] font-bold ${
                                  isQueued
                                    ? "bg-white border-blue-300 text-blue-900 shadow-xs"
                                    : "bg-slate-100 border-slate-200 text-slate-400 opacity-40"
                                }`}
                              >
                                <span className="truncate max-w-[100px]">{p.name}</span>
                                <span className="font-mono text-[7.5px] text-[#2563eb]">#{idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] font-extrabold text-slate-600 mt-2 text-center">
                          Continuous Thermal Roll ({currentSpec.widthMm}×{currentSpec.heightMm} mm)
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium text-center">
                          1 label per feed cut • Total <strong className="text-slate-700">{totalLabels} labels</strong>
                        </p>
                      </div>
                    )
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
                                currentSpec.type === "dgum-flap"
                                  ? "aspect-[81/12]"
                                  : currentSpec.type === "vertical-tag"
                                  ? "aspect-[1/6]"
                                  : currentSpec.type === "tag"
                                  ? "aspect-[6/1]"
                                  : "aspect-[2/1]"
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
                      ? `Continuous Roll (${currentSpec.rollWidthMm || currentSpec.widthMm}×${currentSpec.rollHeightMm || currentSpec.heightMm}mm)`
                      : `${paperSize.toUpperCase()} Sheet (${labelsPerPage} labels/page • ${paperSize === "a4" ? `${currentSpec.a4Cols}×${currentSpec.a4Rows}` : `${currentSpec.a5Cols}×${currentSpec.a5Rows}`})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Media Units Required:</span>
                  <span className="font-bold text-[#2563eb]">
                    {paperSize === "continuous"
                      ? `${Math.ceil(totalLabels / (currentSpec.rollCols || 1))} roll feed cuts (${totalLabels} labels)`
                      : `${totalPages} ${totalPages === 1 ? "sheet" : "sheets"} (${labelsPerPage} labels/sheet)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Barcode Symbology:</span>
                  <span className="font-mono font-bold text-slate-800">Code 128 (High-Density Sharp)</span>
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={totalLabels === 0}
              onClick={handleDownloadBulkTSPL}
              className="h-8.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download direct TSPL .PRN file for TSC TTP-244 Plus"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Direct Thermal (.PRN)</span>
            </button>

            <button
              type="button"
              disabled={totalLabels === 0}
              onClick={handleExecutePrint}
              className="h-8.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print {totalLabels} Barcodes Now</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
