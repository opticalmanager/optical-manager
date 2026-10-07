// ─── Shared Optical Manager Barcode Utility Engine ───────────────────────────
// Code 39 SVG generator, label layout presets, and multi-label print spooler.

export interface BarcodeItem {
  id?: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: string | null;
}

export type LabelSizePreset =
  | "100x15 mm (Tag)"
  | "50x25 mm (Standard)"
  | "38x25 mm (Compact Jewel)"
  | "40x30 mm (Medium Box)";

export interface LabelSpec {
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

export const LABEL_SPECS: Record<LabelSizePreset, LabelSpec> = {
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
export const CODE39_MAP: Record<string, string> = {
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

export function encodeCode39(text: string): string {
  const cleanText = text.toUpperCase().replace(/[^0-9A-Z\-\. ]/g, "");
  const starred = `*${cleanText}*`;
  let pattern = "";
  for (let i = 0; i < starred.length; i++) {
    const ch = starred[i];
    pattern += (CODE39_MAP[ch] || CODE39_MAP[" "]) + "0";
  }
  return pattern;
}

export function buildBarcodeSvgString(text: string, height: number, barScale = 1.4): string {
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

export interface BarcodeLabelOptions {
  barcodeHeight?: number;
  showBrand?: boolean;
  showItemName?: boolean;
  showPrice?: boolean;
  showSKU?: boolean;
  showBarcodeText?: boolean;
  customHeader?: string;
  brandFontSize?: number;
  priceFontSize?: number;
  descriptionFontSize?: number;
  fontWeight?: "normal" | "bold";
  fontFamily?: "sans" | "mono" | "classic";
  borderStyle?: "dashed" | "solid" | "none";
  currencySymbol?: string;
}

export function buildOneLabelHtml(
  item: BarcodeItem,
  spec: LabelSpec,
  options?: BarcodeLabelOptions
): string {
  const { widthMm, heightMm, type, maxBarcodeHeight } = spec;
  const barcodeHeight = Math.min(
    options?.barcodeHeight ?? spec.defaultBarcodeHeight,
    maxBarcodeHeight
  );

  const showBrand = options?.showBrand ?? true;
  const showItemName = options?.showItemName ?? true;
  const showPrice = options?.showPrice ?? true;
  const showSKU = options?.showSKU ?? true;
  const showBarcodeText = options?.showBarcodeText ?? true;
  const customHeader = options?.customHeader ?? "";
  const brandFontSize = options?.brandFontSize ?? spec.defaultBrandFontSize;
  const priceFontSize = options?.priceFontSize ?? spec.defaultPriceFontSize;
  const descriptionFontSize = options?.descriptionFontSize ?? spec.defaultDescFontSize;
  const fontWeight = options?.fontWeight ?? "bold";
  const fontFamily = options?.fontFamily ?? "sans";
  const borderStyle = options?.borderStyle ?? "dashed";
  const currencySymbol = options?.currencySymbol ?? "₹";

  const numPrice = item.price ? parseFloat(item.price) : 0;
  const formattedPrice = numPrice > 0 ? `${currencySymbol}${numPrice.toLocaleString("en-IN")}` : "";

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

  const headerHtml = customHeader
    ? `<span style="font-size:${type === "tag" ? "5.5px" : "6.5px"};text-transform:uppercase;letter-spacing:0.08em;color:#64748b;display:block;line-height:1;margin-bottom:1px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${customHeader}</span>`
    : "";

  const brandHtml = showBrand
    ? `<span style="font-size:${brandFontSize}px;color:#0f172a;display:block;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:${fontWeightCss};">${item.brand || item.category || "GENERIC"}</span>`
    : "";

  const itemNameHtml = showItemName
    ? `<span style="font-size:${descriptionFontSize}px;color:#475569;display:block;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:1px;">${item.name}</span>`
    : "";

  const priceHtml =
    showPrice && formattedPrice
      ? `<span style="font-size:${priceFontSize}px;color:#2563eb;font-weight:800;display:block;line-height:1.1;margin-top:1px;">${formattedPrice}</span>`
      : "";

  const skuCode = item.sku || "0000";
  const barcodeSvg = buildBarcodeSvgString(skuCode, barcodeHeight, type === "tag" ? 1.2 : 1.4);

  const skuTextHtml =
    showSKU && showBarcodeText
      ? `<span style="font-size:${type === "tag" ? "6.5px" : "7.5px"};font-family:'Courier New',monospace;letter-spacing:0.15em;font-weight:700;color:#1e293b;display:block;margin-top:1px;line-height:1;">${skuCode}</span>`
      : "";

  // 1. Tag Butterfly Fold (100x15 mm)
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
        <div style="width:38mm;display:flex;flex-direction:column;justify-content:center;text-align:left;overflow:hidden;line-height:1.1;">
          ${headerHtml}
          ${brandHtml}
          ${itemNameHtml}
          <div style="margin-top:1px;">${priceHtml}</div>
        </div>
        <div style="width:18mm;height:100%;border-left:1px dashed #cbd5e1;border-right:1px dashed #cbd5e1;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:0 1mm;">
          <span style="font-size:5px;color:#94a3b8;letter-spacing:1px;font-weight:700;text-transform:uppercase;">FOLD</span>
          <span style="font-size:4.5px;color:#cbd5e1;line-height:1;">———</span>
        </div>
        <div style="width:38mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;text-align:center;">
          ${barcodeSvg}
          ${skuTextHtml}
        </div>
      </div>`;
  }

  // 2. Standard / Compact / Box Labels
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
      text-align:left;
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
}

export function buildBulkLabelsHtml(
  items: Array<{ item: BarcodeItem; quantity: number }>,
  spec: LabelSpec,
  options?: BarcodeLabelOptions & { paperSize?: "continuous" | "a4" | "a5" }
): string {
  const paperSize = options?.paperSize ?? "a4";
  const allLabels: string[] = [];

  for (const entry of items) {
    const qty = Math.max(1, entry.quantity || 1);
    const labelHtml = buildOneLabelHtml(entry.item, spec, options);
    for (let i = 0; i < qty; i++) {
      allLabels.push(labelHtml);
    }
  }

  let pageCSS = "";
  let bodyContent = "";

  if (paperSize === "continuous") {
    // Industrial Standard Continuous Roll (Zebra / TSC / Citizen / TVS / Godex)
    pageCSS = `
      @page {
        size: ${spec.widthMm}mm ${spec.heightMm}mm;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .barcode-continuous-label {
          width: ${spec.widthMm}mm !important;
          height: ${spec.heightMm}mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      }
    `;
    bodyContent = allLabels
      .map((lbl) => `<div class="barcode-continuous-label">${lbl}</div>`)
      .join("");
  } else {
    // Multi-label sheet layout using HTML Table (A4 / A5) - matching inventory BarcodeDesignerModal
    const effectivePaperSize = paperSize;
    const cols = effectivePaperSize === "a4" ? spec.a4Cols : spec.a5Cols;
    const margin = effectivePaperSize === "a4" ? "5mm 4mm" : "4mm 3mm";

    pageCSS = `
      @page {
        size: ${effectivePaperSize.toUpperCase()} portrait;
        margin: ${margin};
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          page-break-inside: auto !important;
          border-spacing: 0 !important;
          border-collapse: collapse !important;
          width: 100% !important;
          table-layout: fixed !important;
          margin: 0 auto !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: auto !important;
        }
        td {
          padding: 1mm !important;
          vertical-align: top !important;
          text-align: center !important;
          box-sizing: border-box !important;
        }
      }
    `;

    let rows = "";
    for (let i = 0; i < allLabels.length; i += cols) {
      let cells = "";
      for (let j = 0; j < cols; j++) {
        if (i + j < allLabels.length) {
          cells += `<td style="vertical-align:top;padding:1mm;text-align:center;">${allLabels[i + j]}</td>`;
        } else {
          cells += `<td></td>`;
        }
      }
      rows += `<tr style="page-break-inside:avoid;break-inside:avoid;">${cells}</tr>`;
    }
    bodyContent = `<table style="border-collapse:collapse;width:100%;margin:0 auto;table-layout:fixed;"><tbody>${rows}</tbody></table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Optical Manager - Barcode Print Spool (${spec.displayName})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #ffffff; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    ${pageCSS}
  </style>
</head>
<body onload="window.focus();">
  ${bodyContent}
</body>
</html>`;
}

/**
 * Ultra-smooth, lag-free barcode printer dispatcher.
 * Uses an isolated hidden iframe for instant zero-lag printing without browser popup blocks.
 * Seamlessly falls back to window.open if iframe is constrained.
 */
export function printBarcodeDocument(htmlContent: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    let iframe = document.getElementById("barcode-print-frame") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "barcode-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch {
          openBarcodePrintWindow(htmlContent);
        }
      }, 100);
      return true;
    }
  } catch (err) {
    console.warn("Iframe print initialization fallback:", err);
  }

  return openBarcodePrintWindow(htmlContent);
}

export function openBarcodePrintWindow(htmlContent: string): boolean {
  if (typeof window === "undefined") return false;
  const popup = window.open("", "barcode_print", "width=920,height=720,scrollbars=yes");
  if (!popup) {
    return false;
  }
  popup.document.open();
  popup.document.write(htmlContent);
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    try {
      popup.print();
    } catch {}
  }, 200);
  return true;
}
