"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Printer, 
  Bolt, 
  Settings, 
  Star, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Eye, 
  LayoutGrid, 
  ChevronDown,
  Tag,
  Glasses
} from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: string;
}

interface BarcodeDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

// ─── Supported Label & Paper Size Presets ──────────────────────────────────────
export type LabelSizePreset = 
  | "100x15 mm (Tag)"
  | "50x25 mm (Standard)"
  | "38x25 mm (Compact Jewel)"
  | "40x30 mm (Medium Box)";

interface LabelSpec {
  id: LabelSizePreset;
  displayName: string;
  widthMm: number;
  heightMm: number;
  type: "tag" | "standard" | "compact" | "box";
  description: string;
  defaultBarcodeHeight: number;
  maxBarcodeHeight: number;
  defaultBrandFontSize: number;
  defaultPriceFontSize: number;
  defaultDescFontSize: number;
  a4Cols: number;
  a4Rows: number;
  a4Total: number;
  a5Cols: number;
  a5Rows: number;
  a5Total: number;
}

const LABEL_SPECS: Record<LabelSizePreset, LabelSpec> = {
  "100x15 mm (Tag)": {
    id: "100x15 mm (Tag)",
    displayName: "100×15 mm (Tag)",
    widthMm: 100,
    heightMm: 15,
    type: "tag",
    description: "Optical Frame Barbell Tag (Dual-Wing with Center Fold)",
    defaultBarcodeHeight: 18,
    maxBarcodeHeight: 22,
    defaultBrandFontSize: 9,
    defaultPriceFontSize: 11,
    defaultDescFontSize: 7,
    a4Cols: 2,
    a4Rows: 18,
    a4Total: 36,
    a5Cols: 1,
    a5Rows: 9,
    a5Total: 9,
  },
  "50x25 mm (Standard)": {
    id: "50x25 mm (Standard)",
    displayName: "50×25 mm (Standard)",
    widthMm: 50,
    heightMm: 25,
    type: "standard",
    description: "Standard 2\"×1\" Retail Box & Case Label",
    defaultBarcodeHeight: 32,
    maxBarcodeHeight: 38,
    defaultBrandFontSize: 12,
    defaultPriceFontSize: 14,
    defaultDescFontSize: 8,
    a4Cols: 3,
    a4Rows: 10,
    a4Total: 30,
    a5Cols: 2,
    a5Rows: 5,
    a5Total: 10,
  },
  "38x25 mm (Compact Jewel)": {
    id: "38x25 mm (Compact Jewel)",
    displayName: "38×25 mm (Compact Jewel)",
    widthMm: 38,
    heightMm: 25,
    type: "compact",
    description: "Compact 1.5\"×1\" Lens & Blister Pack Tag",
    defaultBarcodeHeight: 24,
    maxBarcodeHeight: 28,
    defaultBrandFontSize: 10,
    defaultPriceFontSize: 12,
    defaultDescFontSize: 7,
    a4Cols: 4,
    a4Rows: 10,
    a4Total: 40,
    a5Cols: 2,
    a5Rows: 5,
    a5Total: 10,
  },
  "40x30 mm (Medium Box)": {
    id: "40x30 mm (Medium Box)",
    displayName: "40×30 mm (Medium Box)",
    widthMm: 40,
    heightMm: 30,
    type: "box",
    description: "Medium 40×30mm Eyewear Box & Accessory Label",
    defaultBarcodeHeight: 32,
    maxBarcodeHeight: 42,
    defaultBrandFontSize: 12,
    defaultPriceFontSize: 14,
    defaultDescFontSize: 8,
    a4Cols: 4,
    a4Rows: 8,
    a4Total: 32,
    a5Cols: 2,
    a5Rows: 4,
    a5Total: 8,
  },
};

// ─── Code 39 barcode encoding table ───────────────────────────────────────────
const CODE39_MAP: Record<string, string> = {
  "0": "101001101101", "1": "110100101011", "2": "101100101011",
  "3": "110110010101", "4": "101001101011", "5": "110100110101",
  "6": "101100110101", "7": "101001011011", "8": "110100101101",
  "9": "101100101101", "A": "110101001011", "B": "101101001011",
  "C": "110110100101", "D": "101011001011", "E": "110101100101",
  "F": "101101100101", "G": "101010011011", "H": "110101001101",
  "I": "101101001101", "J": "101011001101", "K": "110101010011",
  "L": "101101010011", "M": "110110101001", "N": "101011010011",
  "O": "110101101001", "P": "101101101001", "Q": "101010110011",
  "R": "110101011001", "S": "101101011001", "T": "101011011001",
  "U": "110010101011", "V": "100110101011", "W": "110011010101",
  "X": "100101101011", "Y": "110010110101", "Z": "100110110101",
  "-": "100101011011", ".": "110010101101", " ": "100110101101",
  "*": "100101101101",
};

// Pure function: encodes a string to Code 39 bit pattern
function encodeCode39(text: string): string {
  const cleanText = text.toUpperCase().replace(/[^0-9A-Z\-\. ]/g, "");
  const starred = `*${cleanText}*`;
  let pattern = "";
  for (let i = 0; i < starred.length; i++) {
    const ch = starred[i];
    pattern += (CODE39_MAP[ch] || CODE39_MAP[" "]) + "0";
  }
  return pattern;
}

// Pure function: returns a self-contained SVG string for the barcode
function buildBarcodeSvgString(text: string, height: number, barScale = 1.4): string {
  const pattern = encodeCode39(text);
  const barWidth = barScale;
  const totalWidth = pattern.length * barWidth;
  const bars = pattern
    .split("")
    .map((bit, idx) =>
      bit === "1"
        ? `<rect x="${idx * barWidth}" y="0" width="${barWidth}" height="${height}" fill="black"/>`
        : ""
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${bars}</svg>`;
}

// ─── React BarcodeSVG component (used in the on-screen preview) ────────────────
interface BarcodeSVGProps {
  text: string;
  height?: number;
  className?: string;
  barScale?: number;
}

export function BarcodeSVG({ text, height = 36, className, barScale = 1.6 }: BarcodeSVGProps) {
  const pattern = useMemo(() => encodeCode39(text), [text]);
  const barWidth = barScale;
  const width = pattern.length * barWidth;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      <g fill="black">
        {pattern.split("").map((bit, idx) => {
          if (bit === "1") {
            return <rect key={idx} x={idx * barWidth} y={0} width={barWidth} height={height} />;
          }
          return null;
        })}
      </g>
    </svg>
  );
}

// ─── Main Modal Component ──────────────────────────────────────────────────────
export function BarcodeDesignerModal({ isOpen, onClose, item }: BarcodeDesignerModalProps) {
  if (!item) return null;

  const defaultCustomHeader = item.category === "FRAME" ? "CLINICAL OPTICAL" : "SPECIAL VALUE";
  const formattedPrice = `Rs. ${Number(item.price).toLocaleString("en-IN")}/-`;

  // UI state
  const [paperSize, setPaperSize] = useState<"continuous" | "a4" | "a5">("a4");
  const [labelSize, setLabelSize] = useState<LabelSizePreset>("100x15 mm (Tag)");
  const [printQuantity, setPrintQuantity] = useState<number | "">(8);
  const [activeTab, setActiveTab] = useState<"single" | "sheet">("single");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active Label Spec Configuration
  const currentSpec = LABEL_SPECS[labelSize] || LABEL_SPECS["100x15 mm (Tag)"];

  // Element visibility
  const [showBrand, setShowBrand] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showSKU, setShowSKU] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);

  // Typography & Dimensions
  const [brandFontSize, setBrandFontSize] = useState(currentSpec.defaultBrandFontSize);
  const [priceFontSize, setPriceFontSize] = useState(currentSpec.defaultPriceFontSize);
  const [descriptionFontSize, setDescriptionFontSize] = useState(currentSpec.defaultDescFontSize);
  const [barcodeHeight, setBarcodeHeight] = useState(currentSpec.defaultBarcodeHeight);

  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center");
  const [borderStyle, setBorderStyle] = useState<"dashed" | "solid" | "none">("dashed");
  const [fontFamily, setFontFamily] = useState<"modern" | "mono" | "classic">("modern");
  const [fontWeight, setFontWeight] = useState<"regular" | "bold">("bold");
  const [customHeader, setCustomHeader] = useState(defaultCustomHeader);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Handle Label Size change with adaptive auto-tuning
  const handleLabelSizeChange = (newSize: LabelSizePreset) => {
    setLabelSize(newSize);
    const spec = LABEL_SPECS[newSize];
    if (spec) {
      setBrandFontSize(spec.defaultBrandFontSize);
      setPriceFontSize(spec.defaultPriceFontSize);
      setDescriptionFontSize(spec.defaultDescFontSize);
      setBarcodeHeight(spec.defaultBarcodeHeight);
    }
  };

  // Preset configuration handlers
  const applyPreset = (preset: "minimal" | "contrast" | "elegant" | "promo") => {
    switch (preset) {
      case "minimal":
        setFontFamily("modern"); 
        setFontWeight("regular"); 
        setAlignment("left");
        setBorderStyle("none"); 
        setBrandFontSize(currentSpec.type === "tag" ? 9 : 11); 
        setPriceFontSize(currentSpec.type === "tag" ? 10 : 13);
        setDescriptionFontSize(currentSpec.type === "tag" ? 6 : 8); 
        setBarcodeHeight(currentSpec.type === "tag" ? 16 : 28);
        break;
      case "contrast":
        setFontFamily("mono"); 
        setFontWeight("bold"); 
        setAlignment("center");
        setBorderStyle("solid"); 
        setBrandFontSize(currentSpec.type === "tag" ? 10 : 13); 
        setPriceFontSize(currentSpec.type === "tag" ? 12 : 15);
        setDescriptionFontSize(currentSpec.type === "tag" ? 7 : 9); 
        setBarcodeHeight(currentSpec.type === "tag" ? 18 : 34);
        break;
      case "elegant":
        setFontFamily("modern"); 
        setFontWeight("regular"); 
        setAlignment("left");
        setBorderStyle("dashed"); 
        setBrandFontSize(currentSpec.type === "tag" ? 9 : 12); 
        setPriceFontSize(currentSpec.type === "tag" ? 11 : 13);
        setDescriptionFontSize(currentSpec.type === "tag" ? 6 : 8); 
        setBarcodeHeight(currentSpec.type === "tag" ? 16 : 30);
        break;
      case "promo":
        setFontFamily("classic"); 
        setFontWeight("bold"); 
        setAlignment("center");
        setBorderStyle("dashed"); 
        setBrandFontSize(currentSpec.type === "tag" ? 9 : 10); 
        setPriceFontSize(currentSpec.type === "tag" ? 13 : 16);
        setDescriptionFontSize(currentSpec.type === "tag" ? 6 : 8); 
        setBarcodeHeight(currentSpec.type === "tag" ? 15 : 26);
        break;
    }
    toast.success(`Applied ${preset.toUpperCase()} styling preset`);
  };

  const getFontClassName = () => {
    switch (fontFamily) {
      case "mono": return "font-mono";
      case "classic": return "font-serif";
      default: return "font-sans";
    }
  };

  // ─── Industry-Standard Multi-Format Label HTML Generator ────────────────────
  const buildOneLabelHtml = (): string => {
    const { widthMm, heightMm, type, maxBarcodeHeight } = currentSpec;
    const clampedBarcodeH = Math.min(barcodeHeight, maxBarcodeHeight);

    const fontFamilyCss =
      fontFamily === "mono"
        ? "'Courier New', Courier, monospace"
        : fontFamily === "classic"
        ? "Georgia, 'Times New Roman', Times, serif"
        : "Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif";
    const fontWeightCss = fontWeight === "bold" ? "700" : "400";

    const borderCss =
      borderStyle === "dashed"
        ? "1px dashed #64748b"
        : borderStyle === "solid"
        ? "1px solid #000000"
        : "1px solid transparent";

    const headerHtml =
      customHeader
        ? `<span style="font-size:${type === "tag" ? "5.5px" : "6.5px"};text-transform:uppercase;letter-spacing:0.08em;color:#64748b;display:block;line-height:1;margin-bottom:1px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${customHeader}</span>`
        : "";

    const brandHtml =
      showBrand
        ? `<span style="font-size:${brandFontSize}px;color:#0f172a;display:block;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:${fontWeightCss};">${item.brand || "GENERIC"}</span>`
        : "";

    const itemNameHtml =
      showItemName
        ? `<span style="font-size:${descriptionFontSize}px;color:#475569;display:block;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:1px;">${item.name}</span>`
        : "";

    const priceHtml =
      showPrice
        ? `<span style="font-size:${priceFontSize}px;color:#2563eb;font-weight:800;display:block;line-height:1.1;margin-top:1px;">${formattedPrice}</span>`
        : "";

    const barcodeSvg = buildBarcodeSvgString(item.sku || "0000", clampedBarcodeH, type === "tag" ? 1.2 : 1.4);

    const skuTextHtml =
      showSKU && showBarcodeText
        ? `<span style="font-size:${type === "tag" ? "6.5px" : "7.5px"};font-family:'Courier New',monospace;letter-spacing:0.15em;font-weight:700;color:#1e293b;display:block;margin-top:1px;line-height:1;">${item.sku}</span>`
        : "";

    // 1. SPECIFIC OPTICAL FRAME TAG (100x15 mm Butterfly Barbell Tag)
    if (type === "tag") {
      return `
        <div style="
          width:${widthMm}mm;
          height:${heightMm}mm;
          box-sizing:border-box;
          padding:1mm 2mm;
          border:${borderCss};
          background:#ffffff;
          font-family:${fontFamilyCss};
          display:flex;
          align-items:center;
          justify-content:space-between;
          overflow:hidden;
          break-inside:avoid;
          page-break-inside:avoid;
        ">
          <!-- Left Wing: Brand, Model, Price -->
          <div style="width:38mm;display:flex;flex-direction:column;justify-content:center;text-align:left;overflow:hidden;line-height:1.1;">
            ${headerHtml}
            ${brandHtml}
            ${itemNameHtml}
            <div style="margin-top:1px;">${priceHtml}</div>
          </div>

          <!-- Center Bridge: Frame Temple Fold Zone -->
          <div style="width:18mm;height:100%;border-left:1px dashed #cbd5e1;border-right:1px dashed #cbd5e1;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:0 1mm;">
            <span style="font-size:5px;color:#94a3b8;letter-spacing:1px;font-weight:700;text-transform:uppercase;">FOLD</span>
            <span style="font-size:4.5px;color:#cbd5e1;line-height:1;">———</span>
          </div>

          <!-- Right Wing: Barcode & SKU -->
          <div style="width:38mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;text-align:center;">
            ${barcodeSvg}
            ${skuTextHtml}
          </div>
        </div>`;
    }

    // 2. STANDARD BOX / RECTANGULAR LABEL LAYOUT (50x25, 38x25, 40x30)
    return `
      <div style="
        width:${widthMm}mm;
        height:${heightMm}mm;
        box-sizing:border-box;
        padding:1.5mm 2mm;
        border:${borderCss};
        background:#ffffff;
        font-family:${fontFamilyCss};
        font-weight:${fontWeightCss};
        text-align:${alignment};
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        overflow:hidden;
        break-inside:avoid;
        page-break-inside:avoid;
      ">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;">
          <div style="display:flex;flex-direction:column;text-align:left;min-width:0;flex:1;overflow:hidden;">
            ${headerHtml}
            ${brandHtml}
            ${itemNameHtml}
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:4px;">
            ${priceHtml}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;margin-top:1.5px;flex-shrink:0;width:100%;">
          ${barcodeSvg}
          ${skuTextHtml}
        </div>
      </div>`;
  };

  const handlePrint = () => {
    const qty = Number(printQuantity) || 1;
    const labels = Array.from({ length: qty }).map(() => buildOneLabelHtml());

    // In continuous roll mode, if multiple labels are printed, auto-switch sheet layout for standard A4/A5 printers
    const effectivePaperSize = (paperSize === "continuous" && qty > 1) ? "a4" : paperSize;

    let pageCSS = "";
    let bodyContent = "";

    if (effectivePaperSize === "continuous") {
      // Single continuous roll tag (Thermal Barcode Printer)
      pageCSS = `@page { size: ${currentSpec.widthMm}mm ${currentSpec.heightMm}mm; margin: 0; }`;
      bodyContent = labels.join("");
    } else {
      // Multi-label sheet layout using HTML Table (rock-solid cross-browser print consistency)
      const cols = effectivePaperSize === "a4" ? currentSpec.a4Cols : currentSpec.a5Cols;
      const margin = effectivePaperSize === "a4" ? "5mm 4mm" : "4mm 3mm";
      pageCSS = `@page { size: ${effectivePaperSize.toUpperCase()} portrait; margin: ${margin}; }`;

      let rows = "";
      for (let i = 0; i < labels.length; i += cols) {
        let cells = "";
        for (let j = 0; j < cols; j++) {
          if (i + j < labels.length) {
            cells += `<td style="vertical-align:top;padding:1mm;text-align:center;">${labels[i + j]}</td>`;
          } else {
            cells += `<td></td>`;
          }
        }
        rows += `<tr style="page-break-inside:avoid;break-inside:avoid;">${cells}</tr>`;
      }
      bodyContent = `<table style="border-collapse:collapse;width:100%;margin:0 auto;"><tbody>${rows}</tbody></table>`;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Optical Manager - Barcode Print Spool (${currentSpec.displayName})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #ffffff; margin: 0; padding: 0; }
    ${pageCSS}
    @media print {
      body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { page-break-inside: auto; border-spacing: 0; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      td { padding: 1mm; }
    }
  </style>
</head>
<body onload="setTimeout(function(){window.print();},300);">
  ${bodyContent}
</body>
</html>`;

    // Open clean print window
    const popup = window.open("", "barcode_print", "width=920,height=720,scrollbars=yes");
    if (!popup) {
      toast.error("Please allow popups for this site to enable instant printing.");
      return;
    }

    popup.document.open();
    popup.document.write(fullHtml);
    popup.document.close();
    popup.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-slate-50 w-full max-w-7xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 animate-in fade-in zoom-in duration-200">

        {/* Modal Header */}
        <header className="bg-white border-b border-slate-200 flex justify-between items-center h-16 px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 text-base leading-tight flex items-center gap-2">
                Optical Barcode &amp; Tag Designer
                <span className="bg-blue-50 text-[#2563eb] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                  {currentSpec.displayName}
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Item: {item.name} ({item.sku}) • Category: {item.category}
              </p>
            </div>
          </div>
          <button
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">

          {/* Left Configuration Column */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* 1. Layout Config */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 w-6 h-6 rounded-lg flex items-center justify-center font-black">1</span>
                Layout &amp; Paper Size
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paper Template Selector */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                    Paper Size / Template
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as "continuous" | "a4" | "a5")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="continuous">Continuous Roll (Thermal Tag Printer)</option>
                    <option value="a4">{`A4 Sheet (${currentSpec.a4Cols}×${currentSpec.a4Rows} Grid - ${currentSpec.a4Total} labels)`}</option>
                    <option value="a5">{`A5 Sheet (${currentSpec.a5Cols}×${currentSpec.a5Rows} Grid - ${currentSpec.a5Total} labels)`}</option>
                  </select>
                </div>

                {/* Label Card Size Selector with Exact Specs */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide flex items-center justify-between">
                    <span>Label Card Size</span>
                    <span className="text-[9px] text-indigo-600 font-bold lowercase">({currentSpec.widthMm}×{currentSpec.heightMm}mm)</span>
                  </label>
                  <select
                    value={labelSize}
                    onChange={(e) => handleLabelSizeChange(e.target.value as LabelSizePreset)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="100x15 mm (Tag)">100×15 mm (Tag)</option>
                    <option value="50x25 mm (Standard)">50×25 mm (Standard)</option>
                    <option value="38x25 mm (Compact Jewel)">38×25 mm (Compact Jewel)</option>
                    <option value="40x30 mm (Medium Box)">40×30 mm (Medium Box)</option>
                  </select>
                </div>
              </div>

              {/* Tag Format Badge Description */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs">
                {currentSpec.type === "tag" ? (
                  <Glasses className="w-4 h-4 text-indigo-600 shrink-0" />
                ) : (
                  <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-slate-800 block text-[11px] leading-tight">
                    {currentSpec.displayName} — {currentSpec.description}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                    {currentSpec.type === "tag" 
                      ? "Specialized butterfly dumbbell tag with center fold bridge for eyeglasses frame temples."
                      : "Optimized rectangular thermal barcode label with automatic text scaling."}
                  </span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pt-2">
                <div className="w-full md:w-32">
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                    Print Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={printQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setPrintQuantity("");
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed)) setPrintQuantity(parsed);
                      }
                    }}
                    onBlur={() => {
                      if (printQuantity === "" || printQuantity < 1) setPrintQuantity(1);
                      else if (printQuantity > 100) setPrintQuantity(100);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-sm font-extrabold text-indigo-600 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex-1 flex gap-1.5 items-end pb-1.5 overflow-x-auto w-full">
                  <span className="text-[10px] font-extrabold text-slate-400 mr-2 self-center uppercase">Presets:</span>
                  {[1, 5, 8, 12, 16, 32].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setPrintQuantity(qty)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        printQuantity === qty
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {qty}
                      {qty === 8 && <Star className="w-3 h-3 fill-current text-amber-300" />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Advanced Settings Accordion */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-200">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                    <Settings className={`w-4 h-4 transition-transform duration-300 ${showAdvanced ? "rotate-90" : ""}`} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Advanced Design &amp; Styling Settings
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Presets, element visibility, fine-tune font sizes, custom text
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-all">
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`} />
                </div>
              </button>

              {showAdvanced && (
                <div className="p-6 border-t border-slate-200 bg-slate-50/30 space-y-6">
                  {/* 2. Style Presets */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-600 w-6 h-6 rounded-lg flex items-center justify-center font-black">2</span>
                      Intelligent Style Presets
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        { id: "minimal", label: "Minimal Clean" },
                        { id: "contrast", label: "High-Contrast" },
                        { id: "elegant", label: "Elegant Left" },
                        { id: "promo", label: "Promo Price" }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.id as "minimal" | "contrast" | "elegant" | "promo")}
                          className="py-2.5 border border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all bg-white hover:bg-indigo-50/10 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* 3. Visibility Controls */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-600 w-6 h-6 rounded-lg flex items-center justify-center font-black">3</span>
                      Visibility of Design Elements
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Brand Name", state: showBrand, setter: setShowBrand },
                        { label: "Item Name", state: showItemName, setter: setShowItemName },
                        { label: "Retail Price", state: showPrice, setter: setShowPrice },
                        { label: "SKU Code", state: showSKU, setter: setShowSKU },
                        { label: "Barcode Text", state: showBarcodeText, setter: setShowBarcodeText }
                      ].map((el, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => el.setter(!el.state)}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all cursor-pointer ${
                            el.state
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          {el.state ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className="text-[11px] truncate">{el.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* 4. Fine-Tune Sizes & Layout */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-600 w-6 h-6 rounded-lg flex items-center justify-center font-black">4</span>
                      Fine-Tune Sizes &amp; Layout Arrange
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        { label: "Brand Font Size", value: brandFontSize, setter: setBrandFontSize, min: 6, max: 20, unit: "px" },
                        { label: "Price Font Size", value: priceFontSize, setter: setPriceFontSize, min: 8, max: 24, unit: "px" },
                        { label: "Description Font Size", value: descriptionFontSize, setter: setDescriptionFontSize, min: 5, max: 14, unit: "px" },
                        { label: "Barcode Height", value: barcodeHeight, setter: setBarcodeHeight, min: 12, max: currentSpec.maxBarcodeHeight + 10, unit: "px" },
                      ].map(({ label, value, setter, min, max, unit }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                            <span>{label}</span>
                            <span className="text-indigo-600">{value}{unit}</span>
                          </div>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={value}
                            onChange={(e) => setter(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Grid Segmented buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Content Align</label>
                        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
                          {["left", "center", "right"].map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setAlignment(align as "left" | "center" | "right")}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                alignment === align
                                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/30"
                                  : "text-slate-400 hover:text-slate-800"
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Border Style</label>
                        <select
                          value={borderStyle}
                          onChange={(e) => setBorderStyle(e.target.value as "dashed" | "solid" | "none")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="dashed">Dashed Box</option>
                          <option value="solid">Solid Line</option>
                          <option value="none">No Border</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Font Family</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value as "modern" | "mono" | "classic")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="modern">Inter (Modern)</option>
                          <option value="mono">Courier (Mono)</option>
                          <option value="classic">Times (Serif)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">Font Weight</label>
                        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
                          {["regular", "bold"].map((weight) => (
                            <button
                              key={weight}
                              type="button"
                              onClick={() => setFontWeight(weight as "regular" | "bold")}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                fontWeight === weight
                                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/30"
                                  : "text-slate-400 hover:text-slate-800"
                              }`}
                            >
                              {weight.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 5. Custom Header */}
                  <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="bg-indigo-50 text-indigo-600 w-6 h-6 rounded-lg flex items-center justify-center font-black">5</span>
                      Custom Tag Header or Store Sub-Text
                    </h3>
                    <div className="relative">
                      <input
                        type="text"
                        value={customHeader}
                        onChange={(e) => setCustomHeader(e.target.value.toUpperCase())}
                        placeholder="e.g. CLINICAL OPTICAL • 100% UV PROTECTION • BOSTON EYE CLINIC"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 outline-none transition-all placeholder-slate-300"
                      />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 italic">
                        Appears aligned at the top of the label tag (or on the left wing of optical frame tags).
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Preview Column */}
          <div className="w-full lg:w-[480px] bg-slate-100 border-l border-slate-200 p-6 flex flex-col justify-between shrink-0">

            <div className="space-y-5">
              {/* Preview header */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" /> Real-time Preview
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-white border border-slate-200 text-[9px] px-2 py-0.5 rounded font-mono font-bold text-slate-600 shadow-xs">
                      {currentSpec.displayName}
                    </span>
                  </div>
                </div>

                {/* Preview Toggles */}
                <div className="flex bg-slate-200/70 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("single")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "single" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Single Label
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sheet")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "sheet" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Sheet Preview
                  </button>
                </div>
              </div>

              {/* Label Visualizer Container */}
              <div className="relative min-h-[220px] bg-slate-200 rounded-2xl flex items-center justify-center border border-slate-300 shadow-inner p-4 overflow-hidden">

                {activeTab === "single" ? (
                  // SINGLE LABEL VIEW
                  currentSpec.type === "tag" ? (
                    // Specialized 100x15 mm Butterfly Optical Tag
                    <div
                      className={`bg-white rounded-sm shadow-xl p-2 flex items-center justify-between transition-all select-none font-sans ${
                        borderStyle === "dashed"
                          ? "border-2 border-dashed border-slate-400"
                          : borderStyle === "solid"
                          ? "border border-black"
                          : "border-0 shadow-lg"
                      } ${getFontClassName()} ${fontWeight === "bold" ? "font-bold" : "font-normal"}`}
                      style={{ width: "420px", height: "68px" }}
                    >
                      {/* Left Wing */}
                      <div className="w-[160px] flex flex-col justify-center text-left leading-tight overflow-hidden pr-1">
                        {customHeader && (
                          <span className="text-[6px] uppercase tracking-wider text-slate-400 font-bold block truncate">{customHeader}</span>
                        )}
                        {showBrand && (
                          <span style={{ fontSize: `${brandFontSize}px` }} className="text-slate-900 truncate block font-extrabold">{item.brand || "GENERIC"}</span>
                        )}
                        {showItemName && (
                          <span style={{ fontSize: `${descriptionFontSize}px` }} className="text-slate-500 block truncate">{item.name}</span>
                        )}
                        {showPrice && (
                          <span style={{ fontSize: `${priceFontSize}px` }} className="text-indigo-600 font-extrabold block mt-0.5">{formattedPrice}</span>
                        )}
                      </div>

                      {/* Center Fold Bridge */}
                      <div className="w-[70px] h-full border-l border-r border-dashed border-slate-300 flex flex-col items-center justify-center px-1">
                        <span className="text-[6px] font-bold text-slate-400 tracking-widest uppercase">FOLD</span>
                        <span className="text-[5px] text-slate-300">——</span>
                      </div>

                      {/* Right Wing */}
                      <div className="w-[160px] flex flex-col items-center justify-center text-center overflow-hidden pl-1">
                        <BarcodeSVG text={item.sku || "0000"} height={barcodeHeight} barScale={1.2} className="w-full max-w-[140px]" />
                        {showSKU && showBarcodeText && (
                          <span className="text-[8px] font-mono tracking-[0.15em] font-bold text-slate-800 mt-0.5">{item.sku}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Standard Rectangular Labels (50x25, 38x25, 40x30)
                    <div
                      className={`bg-white rounded-md shadow-xl p-3 flex flex-col justify-between transition-all select-none font-sans ${
                        borderStyle === "dashed"
                          ? "border-2 border-dashed border-slate-400"
                          : borderStyle === "solid"
                          ? "border border-black"
                          : "border-0 shadow-lg"
                      } ${getFontClassName()} ${fontWeight === "bold" ? "font-bold" : "font-normal"}`}
                      style={{
                        width: currentSpec.type === "compact" ? "270px" : currentSpec.type === "box" ? "280px" : "300px",
                        height: currentSpec.type === "compact" ? "170px" : currentSpec.type === "box" ? "200px" : "150px",
                        textAlign: alignment
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0">
                          {customHeader && (
                            <span className="text-[7px] uppercase tracking-wider text-slate-400 mb-0.5 truncate block font-bold">{customHeader}</span>
                          )}
                          {showBrand && (
                            <span style={{ fontSize: `${brandFontSize}px` }} className="text-slate-800 truncate block font-extrabold">{item.brand || "GENERIC"}</span>
                          )}
                          {showItemName && (
                            <span style={{ fontSize: `${descriptionFontSize}px` }} className="text-slate-500 block truncate mt-0.5 max-w-[160px]">{item.name}</span>
                          )}
                        </div>
                        {showPrice && (
                          <div className="text-right">
                            <span style={{ fontSize: `${priceFontSize}px` }} className="text-indigo-600 font-extrabold">{formattedPrice}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-0.5 mt-auto">
                        <BarcodeSVG text={item.sku || "0000"} height={barcodeHeight} className="w-full max-w-[190px]" />
                        {showSKU && showBarcodeText && (
                          <span className="text-[9px] font-mono tracking-[0.2em] font-bold text-slate-700">{item.sku}</span>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  // SHEET PREVIEW
                  <div className="w-full h-full p-3 flex flex-col items-center justify-center">
                    <div 
                      className="bg-white aspect-[1/1.414] w-[160px] shadow-2xl border border-slate-200 p-1.5 grid gap-0.5"
                      style={{ 
                        gridTemplateColumns: `repeat(${paperSize === "a4" ? currentSpec.a4Cols : currentSpec.a5Cols}, minmax(0, 1fr))` 
                      }}
                    >
                      {Array.from({ length: paperSize === "a4" ? currentSpec.a4Total : currentSpec.a5Total }).map((_, i) => {
                        const isFilled = i < (Number(printQuantity) || 0);
                        return (
                          <div
                            key={i}
                            className={`border rounded-[1px] transition-colors ${
                              currentSpec.type === "tag" ? "aspect-[6/1]" : "aspect-[2/1]"
                            } ${
                              isFilled
                                ? "bg-indigo-500/20 border-indigo-500/40"
                                : "bg-slate-50 border-slate-200 opacity-20"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-500 mt-2 uppercase tracking-wide text-center">
                      Visualizing {printQuantity} labels on {paperSize.toUpperCase()} sheet ({paperSize === "a4" ? `${currentSpec.a4Cols}×${currentSpec.a4Rows}` : `${currentSpec.a5Cols}×${currentSpec.a5Rows}`} Grid)
                    </p>
                  </div>
                )}
              </div>

              {/* Spool Commands Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Spool Parameters</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div>
                    <span className="block text-slate-400 font-semibold text-[8px] mb-0.5">Quantity:</span>
                    <span className="text-indigo-600 font-extrabold">{printQuantity} labels</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-semibold text-[8px] mb-0.5">Label Size:</span>
                    <span className="text-slate-800 font-extrabold">{currentSpec.displayName}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-50">
                    <span className="block text-slate-400 font-semibold text-[8px] mb-0.5">Print Target:</span>
                    <span className="text-slate-700">
                      {paperSize === "continuous"
                        ? `Continuous Thermal Roll (${currentSpec.widthMm}×${currentSpec.heightMm}mm)`
                        : `${paperSize.toUpperCase()} Sheet Grid (${paperSize === "a4" ? `${currentSpec.a4Cols}×${currentSpec.a4Rows} = ${currentSpec.a4Total}` : `${currentSpec.a5Cols}×${currentSpec.a5Rows} = ${currentSpec.a5Total}`} labels/page)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Action Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full bg-[#00a86b] hover:bg-[#008f5a] text-white py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print {printQuantity} Labels ({currentSpec.displayName})
                <Bolt className="w-4 h-4 ml-0.5 text-amber-200 fill-current animate-pulse" />
              </button>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <footer className="bg-white border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
          <button
            type="button"
            className="px-5 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            onClick={onClose}
          >
            Close Designer
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-[#00a86b] hover:bg-[#008f5a] text-white py-2.5 px-6 rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Labels Now
          </button>
        </footer>

      </div>
    </div>
  );
}
