// ─── Shared Optical Manager Barcode Utility Engine ───────────────────────────
// Code 128 / Code 39 SVG generators, vertical barbell & butterfly roll presets,
// multi-column thermal roll spooling, and zero-lag hidden iframe print dispatcher.

export interface BarcodeItem {
  id?: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  productCode?: string | null;
  price: string | null;
}

export type LabelSizePreset =
  | "100x15 mm (Vertical 3-Up)"
  | "100x15 mm (Vertical 1-Up)"
  | "100x15 mm (Vertical 2-Up)"
  | "100x15 mm (Tag)"
  | "50x25 mm (Standard)"
  | "38x25 mm (Compact Jewel)"
  | "40x30 mm (Medium Box)"
  | "50x50 mm (Square Box)";

export interface LabelSpec {
  id: LabelSizePreset;
  displayName: string;
  widthMm: number;
  heightMm: number;
  type: "tag" | "vertical-tag" | "standard" | "compact" | "box";
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
  rollCols?: number;
  rollWidthMm?: number;
  rollHeightMm?: number;
}

export const LABEL_SPECS: Record<LabelSizePreset, LabelSpec> = {
  "100x15 mm (Vertical 3-Up)": {
    id: "100x15 mm (Vertical 3-Up)",
    displayName: "100×15 mm Vertical (3-Across Roll)",
    widthMm: 15,
    heightMm: 100,
    type: "vertical-tag",
    description: "3 Vertical Butterfly Tags Across Roll (50×100mm Thermal Web Standard)",
    defaultBarcodeHeight: 18,
    maxBarcodeHeight: 25,
    defaultBrandFontSize: 7.5,
    defaultPriceFontSize: 9.5,
    defaultDescFontSize: 6.5,
    a4Cols: 6,
    a4Rows: 2,
    a4Total: 12,
    a5Cols: 3,
    a5Rows: 1,
    a5Total: 3,
    rollCols: 3,
    rollWidthMm: 50,
    rollHeightMm: 100,
  },
  "100x15 mm (Vertical 1-Up)": {
    id: "100x15 mm (Vertical 1-Up)",
    displayName: "100×15 mm Vertical (1-Across Roll)",
    widthMm: 15,
    heightMm: 100,
    type: "vertical-tag",
    description: "Single-Column Vertical Butterfly Tag (15×100mm Continuous Roll)",
    defaultBarcodeHeight: 18,
    maxBarcodeHeight: 25,
    defaultBrandFontSize: 7.5,
    defaultPriceFontSize: 9.5,
    defaultDescFontSize: 6.5,
    a4Cols: 6,
    a4Rows: 2,
    a4Total: 12,
    a5Cols: 3,
    a5Rows: 1,
    a5Total: 3,
    rollCols: 1,
    rollWidthMm: 15,
    rollHeightMm: 100,
  },
  "100x15 mm (Vertical 2-Up)": {
    id: "100x15 mm (Vertical 2-Up)",
    displayName: "100×15 mm Vertical (2-Across Roll)",
    widthMm: 15,
    heightMm: 100,
    type: "vertical-tag",
    description: "2 Vertical Butterfly Tags Across Roll (34×100mm Thermal Web)",
    defaultBarcodeHeight: 18,
    maxBarcodeHeight: 25,
    defaultBrandFontSize: 7.5,
    defaultPriceFontSize: 9.5,
    defaultDescFontSize: 6.5,
    a4Cols: 6,
    a4Rows: 2,
    a4Total: 12,
    a5Cols: 3,
    a5Rows: 1,
    a5Total: 3,
    rollCols: 2,
    rollWidthMm: 34,
    rollHeightMm: 100,
  },
  "100x15 mm (Tag)": {
    id: "100x15 mm (Tag)",
    displayName: "100×15 mm Horizontal (Tag Sheet/Roll)",
    widthMm: 100,
    heightMm: 15,
    type: "tag",
    description: "Optical Frame Barbell Tag (Horizontal Dual-Wing, A4 Sheet / 4\" Wide Roll)",
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
    rollCols: 1,
    rollWidthMm: 100,
    rollHeightMm: 15,
  },
  "50x25 mm (Standard)": {
    id: "50x25 mm (Standard)",
    displayName: "50×25 mm (Standard Retail)",
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
    rollCols: 1,
    rollWidthMm: 50,
    rollHeightMm: 25,
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
    rollCols: 1,
    rollWidthMm: 38,
    rollHeightMm: 25,
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
    rollCols: 1,
    rollWidthMm: 40,
    rollHeightMm: 30,
  },
  "50x50 mm (Square Box)": {
    id: "50x50 mm (Square Box)",
    displayName: "50×50 mm (Square Box)",
    widthMm: 50,
    heightMm: 50,
    type: "box",
    description: "Square 50×50mm Eyewear Case & Frame Box Label",
    defaultBarcodeHeight: 36,
    maxBarcodeHeight: 44,
    defaultBrandFontSize: 13,
    defaultPriceFontSize: 15,
    defaultDescFontSize: 8.5,
    a4Cols: 3,
    a4Rows: 5,
    a4Total: 15,
    a5Cols: 2,
    a5Rows: 2,
    a5Total: 4,
    rollCols: 1,
    rollWidthMm: 50,
    rollHeightMm: 50,
  },
};

// ─── Code 128 (Subset B) High-Density Barcode Generator ───────────────────────
// Standard 107 pattern table (widths of 6 elements: bar-space-bar-space-bar-space)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function code128PatternToBits(p: string): string {
  let bits = "";
  let isBar = true;
  for (let i = 0; i < p.length; i++) {
    const width = parseInt(p[i], 10);
    bits += (isBar ? "1" : "0").repeat(width);
    isBar = !isBar;
  }
  return bits;
}

export function encodeCode128B(text: string): string {
  // Start Code B is index 104
  const startBIndex = 104;
  const values: number[] = [startBIndex];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Code 128B maps ASCII 32..126 to 0..94
    const val = code >= 32 && code <= 126 ? code - 32 : 0;
    values.push(val);
  }

  // Calculate checksum: (startVal + sum(i * val)) % 103
  let checksum = startBIndex;
  for (let i = 1; i < values.length; i++) {
    checksum += i * values[i];
  }
  checksum %= 103;
  values.push(checksum);

  // Stop character is index 106
  values.push(106);

  let totalBits = "";
  for (const v of values) {
    totalBits += code128PatternToBits(CODE128_PATTERNS[v]);
  }
  return totalBits;
}

export function buildCode128SvgString(text: string, height: number, barScale = 1.0): string {
  const pattern = encodeCode128B(text);
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

// ─── Code 39 barcode encoding table (Fallback / Legacy) ───────────────────────
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

export function buildCode39SvgString(text: string, height: number, barScale = 1.4): string {
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

export function buildBarcodeSvgString(
  text: string,
  height: number,
  barScale = 1.4,
  symbology: "code128" | "code39" = "code128"
): string {
  if (symbology === "code128") {
    return buildCode128SvgString(text, height, Math.max(0.7, barScale * 0.75));
  }
  return buildCode39SvgString(text, height, barScale);
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
  symbology?: "code128" | "code39";
}

/**
 * Derives an optical industry-standard display title when the product name is blank or missing.
 */
export function resolveDisplayTitle(
  name?: string | null,
  category?: string | null,
  brand?: string | null,
  model?: string | null,
  productCode?: string | null
): string {
  const cleanName = (name || "").trim();
  if (cleanName) return cleanName;

  const cleanBrand = (brand || "").trim();
  const cleanModel = (model || "").trim();
  const cleanCode = (productCode || "").trim();
  const cleanCat = (category || "").trim().toUpperCase();

  let catLabel = "Optical Frame";
  if (cleanCat.includes("SUN") || cleanCat === "SNG") catLabel = "Sunglasses";
  else if (cleanCat.includes("LENS") && !cleanCat.includes("CONTACT")) catLabel = "Ophthalmic Lens";
  else if (cleanCat.includes("CONTACT") || cleanCat === "CTL") catLabel = "Contact Lens";
  else if (cleanCat.includes("ACC")) catLabel = "Optical Accessory";
  else if (cleanCat.includes("SOL")) catLabel = "Cleaning Solution";
  else if (cleanCat.includes("FRAME") || cleanCat === "FRM") catLabel = "Optical Frame";

  if (cleanBrand && cleanModel) return `${cleanBrand} ${cleanModel}`;

  if (cleanCode && !cleanCode.includes("-GEN-")) {
    if (cleanBrand && !cleanCode.toUpperCase().includes(cleanBrand.toUpperCase())) {
      return `${cleanBrand} ${cleanCode}`;
    }
    return cleanCode;
  }

  if (cleanBrand) return `${cleanBrand} ${catLabel}`;
  if (cleanModel) return `${catLabel} ${cleanModel}`;
  if (cleanCode) return cleanCode;

  return catLabel;
}

/**
 * Generates an authentic vertical dumbbell / butterfly optical tag (15mm width × 100mm height)
 * designed specifically for longitudinal continuous rolls (1-Up, 2-Up, 3-Up).
 */
export function buildOneVerticalTagHtml(
  item: BarcodeItem,
  spec: LabelSpec,
  options?: BarcodeLabelOptions
): string {
  const { widthMm, heightMm, maxBarcodeHeight } = spec;
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
  const formattedPrice = numPrice > 0 ? `${currencySymbol}${numPrice.toLocaleString("en-IN")}/-` : "";

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
    ? `<span style="font-size:5px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:18mm;">${customHeader}</span>`
    : `<span style="font-size:5px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:18mm;">CLINICAL OPTICAL</span>`;

  const brandHtml = showBrand
    ? `<span style="font-size:${Math.min(brandFontSize, 7.5)}px;color:#0f172a;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:${fontWeightCss};display:block;">${item.brand || item.category || "OPTICAL"}</span>`
    : "";

  const displayTitle = resolveDisplayTitle(
    item.name,
    item.category,
    item.brand,
    item.model,
    item.productCode || item.sku
  );
  const itemNameHtml = showItemName
    ? `<span style="font-size:${Math.min(descriptionFontSize, 6.5)}px;color:#475569;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block;margin-top:0.5px;">${displayTitle}</span>`
    : "";

  const priceHtml =
    showPrice && formattedPrice
      ? `<span style="font-size:${Math.min(priceFontSize, 8)}px;color:#2563eb;font-weight:800;white-space:nowrap;flex-shrink:0;margin-left:2px;">${formattedPrice}</span>`
      : "";

  const fallbackSku = item.category
    ? `${item.category.slice(0, 3).toUpperCase()}-GEN-00001`
    : "FRM-GEN-00001";
  const skuCode = item.sku || fallbackSku;
  const barcodeSvg = buildCode128SvgString(skuCode, 24, 0.95);

  const skuTextHtml =
    showSKU && showBarcodeText
      ? `<span style="font-size:5.5px;font-family:'Courier New',monospace;letter-spacing:0.12em;font-weight:700;color:#1e293b;display:block;margin-top:0.5mm;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${skuCode}</span>`
      : "";

  const flapBorderCss =
    borderStyle === "none"
      ? "none"
      : borderStyle === "solid"
      ? "1px solid #000000"
      : "1px dashed #cbd5e1";

  return `
    <div class="barcode-vertical-tag" style="
      width:${widthMm}mm;
      max-width:${widthMm}mm;
      min-width:${widthMm}mm;
      height:${heightMm}mm;
      max-height:${heightMm}mm;
      min-height:${heightMm}mm;
      flex-shrink:0;
      flex-grow:0;
      box-sizing:border-box;
      background:transparent;
      font-family:${fontFamilyCss};
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      align-items:center;
      overflow:hidden;
      break-inside:avoid;
      page-break-inside:avoid;
      border:1px solid transparent;
    ">
      <!-- Top Flap (Wing 1): Brand, Details, Price (Vertical Tag 90° Orientation along 38mm length) -->
      <div style="width:100%;height:38mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;border:${flapBorderCss};border-radius:1mm 1mm 0 0;position:relative;">
        <div style="width:36mm;height:13mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:0.5mm 1mm;transform:rotate(90deg);transform-origin:center center;overflow:hidden;line-height:1.15;flex-shrink:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;min-width:0;">
            ${headerHtml}
            ${priceHtml}
          </div>
          <div style="display:flex;flex-direction:column;width:100%;min-width:0;overflow:hidden;">
            ${brandHtml}
            ${itemNameHtml}
          </div>
        </div>
      </div>

      <!-- Center Tail / Strap: Narrow Bridge (~24mm with 50mm center fold dividing 100mm length) -->
      <div style="width:5mm;height:24mm;box-sizing:border-box;background:#ffffff;border-left:${flapBorderCss};border-right:${flapBorderCss};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative;">
        <div style="position:absolute;top:50%;left:0;width:100%;border-top:1px dashed #cbd5e1;transform:translateY(-50%);"></div>
        <span style="font-size:4px;color:#94a3b8;font-weight:700;transform:rotate(90deg);white-space:nowrap;letter-spacing:1px;text-transform:uppercase;background:#ffffff;position:relative;z-index:1;padding:0 1px;">FOLD</span>
      </div>

      <!-- Bottom Flap (Wing 2): Barcode & SKU (Vertical Tag 90° Orientation along 38mm length) -->
      <div style="width:100%;height:38mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;border:${flapBorderCss};border-radius:0 0 1mm 1mm;position:relative;">
        <div style="width:36mm;height:13mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(90deg);transform-origin:center center;overflow:hidden;flex-shrink:0;">
          <div style="width:34mm;height:8.5mm;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${barcodeSvg}
          </div>
          ${skuTextHtml}
        </div>
      </div>
    </div>`;
}

export function buildOneLabelHtml(
  item: BarcodeItem,
  spec: LabelSpec,
  options?: BarcodeLabelOptions
): string {
  if (spec.type === "vertical-tag") {
    return buildOneVerticalTagHtml(item, spec, options);
  }

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

  const displayTitle = resolveDisplayTitle(
    item.name,
    item.category,
    item.brand,
    item.model,
    item.productCode || item.sku
  );
  const itemNameHtml = showItemName
    ? `<span style="font-size:${descriptionFontSize}px;color:#475569;display:block;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:1px;">${displayTitle}</span>`
    : "";

  const priceHtml =
    showPrice && formattedPrice
      ? `<span style="font-size:${priceFontSize}px;color:#2563eb;font-weight:800;display:block;line-height:1.1;margin-top:1px;">${formattedPrice}</span>`
      : "";

  const fallbackSku = item.category
    ? `${item.category.slice(0, 3).toUpperCase()}-GEN-00001`
    : "FRM-GEN-00001";
  const skuCode = item.sku || fallbackSku;
  const barcodeSvg = buildBarcodeSvgString(skuCode, barcodeHeight, type === "tag" ? 1.2 : 1.4, options?.symbology || "code128");

  const skuTextHtml =
    showSKU && showBarcodeText
      ? `<span style="font-size:${type === "tag" ? "6.5px" : "7.5px"};font-family:'Courier New',monospace;letter-spacing:0.15em;font-weight:700;color:#1e293b;display:block;margin-top:1px;line-height:1;">${skuCode}</span>`
      : "";

  // 1. Tag Butterfly Fold (100x15 mm Horizontal)
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
    // Industrial Standard Continuous Roll (Zebra / TSC / Citizen / TVS / Godex / Xprinter)
    const rollWidth = spec.rollWidthMm ?? spec.widthMm;
    const rollHeight = spec.rollHeightMm ?? spec.heightMm;
    const rollCols = spec.rollCols ?? 1;

    pageCSS = `
      @page {
        size: ${rollWidth}mm ${rollHeight}mm portrait;
        margin: 0;
      }
      html, body {
        width: ${rollWidth}mm;
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .barcode-continuous-page {
        width: ${rollWidth}mm;
        height: ${rollHeight}mm;
        max-width: ${rollWidth}mm;
        min-width: ${rollWidth}mm;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        margin: 0;
        padding: ${rollCols === 2 ? "0 1.5mm" : rollCols === 3 ? "0 1mm" : "0"};
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: stretch;
        justify-content: ${rollCols === 2 ? "space-between" : rollCols > 1 ? "space-between" : "center"};
        gap: ${rollCols === 2 ? "1mm" : rollCols === 3 ? "1.5mm" : "0"};
        overflow: hidden;
      }
      .barcode-vertical-tag {
        width: ${spec.widthMm}mm;
        max-width: ${spec.widthMm}mm;
        min-width: ${spec.widthMm}mm;
        height: ${spec.heightMm}mm;
        max-height: ${spec.heightMm}mm;
        min-height: ${spec.heightMm}mm;
        flex-shrink: 0;
        flex-grow: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
      }
      @media print {
        @page {
          size: ${rollWidth}mm ${rollHeight}mm portrait;
          margin: 0;
        }
        html, body {
          width: ${rollWidth}mm !important;
          height: ${rollHeight}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .barcode-continuous-page {
          width: ${rollWidth}mm !important;
          height: ${rollHeight}mm !important;
          max-width: ${rollWidth}mm !important;
          min-width: ${rollWidth}mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin: 0 !important;
          padding: ${rollCols === 2 ? "0 1.5mm" : rollCols === 3 ? "0 1mm" : "0"} !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: stretch !important;
          justify-content: ${rollCols === 2 ? "space-between" : rollCols > 1 ? "space-between" : "center"} !important;
          gap: ${rollCols === 2 ? "1mm" : rollCols === 3 ? "1.5mm" : "0"} !important;
          overflow: hidden !important;
        }
        .barcode-vertical-tag {
          width: ${spec.widthMm}mm !important;
          max-width: ${spec.widthMm}mm !important;
          min-width: ${spec.widthMm}mm !important;
          height: ${spec.heightMm}mm !important;
          max-height: ${spec.heightMm}mm !important;
          min-height: ${spec.heightMm}mm !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;

    if (rollCols === 1) {
      bodyContent = allLabels
        .map((lbl) => `<div class="barcode-continuous-page">${lbl}</div>`)
        .join("");
    } else {
      // Multi-column continuous roll (e.g. 3-across or 2-across as in reference photo)
      const rowsHtml: string[] = [];
      for (let i = 0; i < allLabels.length; i += rollCols) {
        let colsHtml = "";
        for (let c = 0; c < rollCols; c++) {
          if (i + c < allLabels.length) {
            colsHtml += allLabels[i + c];
          } else {
            colsHtml += `<div style="width:${spec.widthMm}mm;height:${spec.heightMm}mm;max-width:${spec.widthMm}mm;min-width:${spec.widthMm}mm;flex-shrink:0;visibility:hidden;"></div>`;
          }
        }
        rowsHtml.push(`<div class="barcode-continuous-page">${colsHtml}</div>`);
      }
      bodyContent = rowsHtml.join("");
    }
  } else {
    // Multi-label sheet layout using HTML Table (A4 / A5)
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
