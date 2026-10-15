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
  | "81x12 mm (Vertical 2-Up)"
  | "81x12 mm (Vertical 1-Up)"
  | "81x12 mm (D-Gum Flap Tag)"
  | "100x15 mm (Vertical 3-Up)"
  | "100x15 mm (Vertical 1-Up)"
  | "100x15 mm (Vertical 2-Up)"
  | "100x15 mm (Tag)"
  | "100x15 mm (D-Gum Flap Tag)"
  | "50x25 mm (Standard)"
  | "38x25 mm (Compact Jewel)"
  | "40x30 mm (Medium Box)"
  | "50x50 mm (Square Box)";

// ─── D-Gum Flap Label Specification & Configuration Engine ───────────────────
export interface DGumBarcodeConfig {
  orientation: "horizontal" | "vertical";
  widthMm: number;        // e.g. 28-30 mm physical print width
  heightMm: number;       // e.g. 7.0 mm physical print height
  quietZoneMm: number;    // e.g. 2.0 mm quiet zone margins
  symbology: "code128" | "code39";
}

export interface DGumPrinterMediaConfig {
  mediaWidthMm: number;   // Stock web width (e.g. 100 mm horizontal roll)
  feedLengthMm: number;   // Feed length per label pitch (e.g. 15 mm)
  pitchGapMm: number;     // Physical gap between labels (standard 2 mm)
  rollCols: number;       // Number of tags across roll (1 or 2)
}

export interface DGumFlapConfig {
  type: "D_GUM_FLAP";
  
  // Total physical label dimensions (never distorted by responsive layout)
  totalLengthMm: number;  // 100 mm (NTK standard) or 81 mm
  widthMm: number;        // 15 mm (NTK standard) or 12 mm

  // Asymmetric Head + Tail Architecture (NTK Optical Standard):
  headLengthMm?: number;     // 70 mm (wide printable foldable body)
  tailLengthMm?: number;     // 30 mm (narrow adhesive-free loop tail)
  tailThicknessMm?: number;  // 3.5 mm (thickness of the narrow tail)

  // Configurable physical sections:
  section1LengthMm: number;     // e.g. 35 mm (Front Wing: Brand, Specs, Price)
  foldSectionLengthMm: number;  // fold indicator / divider (0 for dotted line on 100mm, or 15 for 81mm)
  section2LengthMm: number;     // e.g. 35 mm (Back Wing: Barcode + SKU)
  
  // Section min/max bounds for calibration
  printableSectionMinMm: number; // 30 mm
  printableSectionMaxMm: number; // 40 mm

  // Fold and adhesive positions
  foldPositionMm: number;          // e.g. 35 mm (dotted fold guideline)
  adhesiveSectionLengthMm: number; // e.g. 30 mm (Adhesive-Free Tail)

  // Physical orientation & feed direction
  orientation: "horizontal" | "vertical";

  // Barcode specific physical configuration
  barcode: DGumBarcodeConfig;

  // Printer media dimensions (separated from label dimensions)
  media: DGumPrinterMediaConfig;

  // Calibration fine adjustments (in mm)
  calibration: {
    offsetXmm: number;  // horizontal shift +/- mm
    offsetYmm: number;  // vertical shift +/- mm
  };
}

export const DEFAULT_DGUM_CONFIG: DGumFlapConfig = {
  type: "D_GUM_FLAP",
  totalLengthMm: 81,
  widthMm: 12,
  headLengthMm: 50,
  tailLengthMm: 31,
  tailThicknessMm: 2.8,
  section1LengthMm: 25.0,
  foldSectionLengthMm: 0,
  section2LengthMm: 25.0,
  printableSectionMinMm: 20,
  printableSectionMaxMm: 30,
  foldPositionMm: 25.0,
  adhesiveSectionLengthMm: 31,
  orientation: "horizontal",
  barcode: {
    orientation: "horizontal",
    widthMm: 18.125,
    heightMm: 6.5,
    quietZoneMm: 3.4,
    symbology: "code128",
  },
  media: {
    mediaWidthMm: 81,
    feedLengthMm: 12,
    pitchGapMm: 2,
    rollCols: 1,
  },
  calibration: {
    offsetXmm: 0,
    offsetYmm: 0,
  },
};

export const DEFAULT_DGUM_81X12_CONFIG: DGumFlapConfig = DEFAULT_DGUM_CONFIG;

/**
 * Validates and recalculates D-Gum flap label sections to ensure the sum of all sections
 * always strictly equals totalLengthMm (81mm NTK standard: 51mm head [25.5mm + 25.5mm] + 30mm tail).
 */
export function recalculateDGumSections(
  section1: number,
  foldOrHead: number,
  total: number = 81
): {
  section1LengthMm: number;
  foldSectionLengthMm: number;
  section2LengthMm: number;
  headLengthMm: number;
  tailLengthMm: number;
  totalMm: number;
  isValid: boolean;
} {
  const safeTotal = Math.max(70, Math.min(120, Number(total) || 81));
  // 81mm Barbell Tag: 50mm Head (25.0mm + 25.0mm) + 31mm Tail = 81mm
  const defaultHead = safeTotal >= 95 ? 70 : 50;
  const safeHead = Math.max(35, Math.min(safeTotal - 15, foldOrHead > 30 ? Number(foldOrHead) : defaultHead));
  const defaultS1 = Number((safeHead / 2).toFixed(1));
  const safeS1 = Math.max(15, Math.min(safeHead - 10, Number(section1) || defaultS1));
  const safeS2 = Number((safeHead - safeS1).toFixed(1));
  const safeTail = Number((safeTotal - safeHead).toFixed(1));
  const sum = Number((safeS1 + safeS2 + safeTail).toFixed(1));

  return {
    section1LengthMm: safeS1,
    foldSectionLengthMm: 0,
    section2LengthMm: safeS2,
    headLengthMm: safeHead,
    tailLengthMm: safeTail,
    totalMm: sum,
    isValid: Math.abs(sum - safeTotal) < 0.01,
  };
}

// ─── User Barcode Preference Persistence System ─────────────────────────────
export interface UserBarcodePreferences {
  preset?: LabelSizePreset;
  paperSize?: "continuous" | "a4" | "a5";
  showBrand?: boolean;
  showItemName?: boolean;
  showPrice?: boolean;
  showSKU?: boolean;
  showBarcodeText?: boolean;
  customHeader?: string;
  brandFontSize?: number;
  priceFontSize?: number;
  descriptionFontSize?: number;
  barcodeHeight?: number;
  alignment?: "left" | "center" | "right";
  borderStyle?: "dashed" | "solid" | "none";
  fontFamily?: "modern" | "mono" | "classic";
  fontWeight?: "regular" | "bold";
  barcodeOrientation?: "horizontal" | "vertical";
  rotation?: 0 | 180;
}

export const BARCODE_PREFERENCES_STORAGE_KEY = "optical_barcode_preferences_v1";
export const DEFAULT_BARCODE_PRESET: LabelSizePreset = "81x12 mm (D-Gum Flap Tag)";
export const DEFAULT_PAPER_SIZE: "continuous" | "a4" | "a5" = "continuous";

/**
 * Smart adaptive organization / store name formatting for micro barcode labels.
 * Frame tags have strict physical printable boundaries (e.g. 14mm / ~15 chars max alongside the retail price badge).
 *
 * Rules:
 * 1. Strips URL protocols and domain extensions (e.g., https://, .store, www.)
 * 2. Strips automated metadata fluff like "'s Organization" or standalone "Organization"
 * 3. Strips corporate/legal entity suffixes (e.g. "Pvt Ltd", "Private Limited", "LLP", "Enterprises")
 * 4. If clean name <= maxLen (e.g. "Punjab Optics" = 13 chars <= 15), preserves completely in uppercase.
 * 5. If > maxLen, intelligently compresses optical retail terms:
 *    - "OPTICALS" / "OPTICIANS" -> "OPTICS" (if candidate <= maxLen)
 *    - "OPTICALS" / "OPTICIANS" / "OPTICAL" / "OPTICS" -> "OPT"
 *    - "EYEWEAR" / "EYECARE" -> "EYE"
 *    - "CLINIC" -> "CLN"
 *    - "STORE" / "SHOP" / "CENTER" / "CENTRE" -> stripped
 * 6. If still > maxLen for multi-word names:
 *    - Fits first word + abbreviated second word (e.g. "CHANDIGARH OPT.")
 *    - Or initials for preceding words (e.g. "SRI VENKATESHWARA OPT" -> "S.V. OPT")
 * 7. Guaranteed fallback cap <= maxLen with dot indicator (never exceeds fixed physical space).
 */
export function formatStoreHeaderForLabel(rawName?: string | null, maxLen = 15): string {
  if (!rawName || !rawName.trim()) return "OPTICAL";
  let name = rawName.trim();

  // 1. Strip URLs or domain prefixes/suffixes
  name = name.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\.[a-z]{2,}(\/.*)?$/i, "");

  // 2. Strip auto-generated organization suffixes
  name = name.replace(/['’]s\s+organization\b/gi, "");
  name = name.replace(/\borganization\b/gi, "");

  // 3. Strip legal entity & generic corporate fluff
  name = name.replace(/\b(pvt\.?\s*ltd\.?|private\s*limited|ltd\.?|limited|llp|inc\.?|solutions|enterprises)\b/gi, "");

  // Normalize spaces
  name = name.trim().replace(/\s+/g, " ");
  let clean = name.toUpperCase();
  if (!clean || clean === "CLINICAL OPTICAL") return "OPTICAL";

  if (clean.length <= maxLen) return clean;

  // 4a. Common Optical Soft Compression: OPTICALS / OPTICIANS to OPTICS if it fits
  if (clean.includes("OPTICALS") || clean.includes("OPTICIANS")) {
    const candidate = clean.replace(/\b(OPTICALS|OPTICIANS)\b/g, "OPTICS");
    if (candidate.length <= maxLen) return candidate;
  }

  // 4b. Deeper compression to standard industry abbreviations
  clean = clean.replace(/\b(OPTICALS?|OPTICIANS?|OPTICS?)\b/g, "OPT");
  if (clean.length <= maxLen) return clean;

  clean = clean.replace(/\b(EYEWEAR|EYECARE)\b/g, "EYE");
  if (clean.length <= maxLen) return clean;

  clean = clean.replace(/\bCLINIC\b/g, "CLN");
  clean = clean.replace(/\b(STORE|SHOP|CENTRE|CENTER)\b/g, "");
  clean = clean.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLen) return clean;

  // 5. Multi-word intelligent abbreviation
  const words = clean.split(" ").filter(Boolean);
  if (words.length >= 2) {
    const w1 = words[0];
    const w2 = words[1];

    // If first word fits with abbreviated second word
    if (w1.length <= maxLen - 4) {
      const candidate = `${w1} ${w2.slice(0, maxLen - w1.length - 2)}.`;
      if (candidate.length <= maxLen) return candidate;
    }

    // If 3+ words: use initials for preceding words + last word
    if (words.length >= 3) {
      const initials = words.slice(0, -1).map((w) => w[0]).join(".") + ".";
      const last = words[words.length - 1];
      const candidate = `${initials} ${last}`;
      if (candidate.length <= maxLen) return candidate;
    }
  }

  // 6. Hard limit guarantee: cleanly slice and append dot to never exceed maxLen
  return clean.slice(0, maxLen - 1).trim() + ".";
}

/**
 * Resolves the active store / organization header dynamically from local storage or cached user session,
 * eliminating hardcoded dummy/mock defaults like "CLINICAL OPTICAL" and auto-formatting for micro tags.
 */
export function getDefaultStoreHeader(fallback = "OPTICAL STORE"): string {
  if (typeof window !== "undefined") {
    try {
      const orgName = localStorage.getItem("om_organization_name");
      if (orgName && orgName.trim() && orgName.trim().toUpperCase() !== "CLINICAL OPTICAL") {
        return formatStoreHeaderForLabel(orgName);
      }
      const cached = localStorage.getItem("om_cached_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        const name = parsed.organizationName || parsed.shopName;
        if (name && name.trim() && name.trim().toUpperCase() !== "CLINICAL OPTICAL") {
          return formatStoreHeaderForLabel(name);
        }
      }
      const shopName = localStorage.getItem("om_active_shop_name");
      if (shopName && shopName.trim() && shopName.trim().toUpperCase() !== "CLINICAL OPTICAL") {
        return formatStoreHeaderForLabel(shopName);
      }
    } catch {}
  }
  return formatStoreHeaderForLabel(fallback);
}

export function loadBarcodePreferences(): UserBarcodePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BARCODE_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserBarcodePreferences;
    // Automatically upgrade legacy placeholder "CLINICAL OPTICAL" to the actual store/organization name
    if (parsed.customHeader && parsed.customHeader.trim().toUpperCase() === "CLINICAL OPTICAL") {
      parsed.customHeader = getDefaultStoreHeader();
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBarcodePreferences(prefs: Partial<UserBarcodePreferences>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadBarcodePreferences() || {};
    const merged = { ...existing, ...prefs };
    localStorage.setItem(BARCODE_PREFERENCES_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Gracefully ignore local storage quota / access limits
  }
}

export interface LabelSpec {
  id: LabelSizePreset;
  displayName: string;
  widthMm: number;
  heightMm: number;
  type: "tag" | "vertical-tag" | "dgum-flap" | "standard" | "compact" | "box";
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
  dGumConfig?: DGumFlapConfig;
}

export const LABEL_SPECS: Record<LabelSizePreset, LabelSpec> = {
  "81x12 mm (Vertical 2-Up)": {
    id: "81x12 mm (Vertical 2-Up)",
    displayName: "81×12 mm Vertical (2-Across Roll) ⭐",
    widthMm: 12,
    heightMm: 81,
    type: "vertical-tag",
    description: "2 Vertical Flap Tags Across Roll (28×81mm Thermal Web, NTK Standard)",
    defaultBarcodeHeight: 14,
    maxBarcodeHeight: 18,
    defaultBrandFontSize: 6.5,
    defaultPriceFontSize: 7.5,
    defaultDescFontSize: 5.5,
    a4Cols: 6,
    a4Rows: 2,
    a4Total: 12,
    a5Cols: 3,
    a5Rows: 1,
    a5Total: 3,
    rollCols: 2,
    rollWidthMm: 28,
    rollHeightMm: 81,
  },
  "81x12 mm (Vertical 1-Up)": {
    id: "81x12 mm (Vertical 1-Up)",
    displayName: "81×12 mm Vertical (1-Across Roll)",
    widthMm: 12,
    heightMm: 81,
    type: "vertical-tag",
    description: "Single-Column Vertical Flap Tag (12×81mm Continuous Roll, NTK Standard)",
    defaultBarcodeHeight: 14,
    maxBarcodeHeight: 18,
    defaultBrandFontSize: 6.5,
    defaultPriceFontSize: 7.5,
    defaultDescFontSize: 5.5,
    a4Cols: 6,
    a4Rows: 2,
    a4Total: 12,
    a5Cols: 3,
    a5Rows: 1,
    a5Total: 3,
    rollCols: 1,
    rollWidthMm: 12,
    rollHeightMm: 81,
  },
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
  "100x15 mm (D-Gum Flap Tag)": {
    id: "100x15 mm (D-Gum Flap Tag)",
    displayName: "81×12 mm D-Gum Flap Tag (NTK Standard)",
    widthMm: 81,
    heightMm: 12,
    type: "dgum-flap",
    description: "NTK Optical Frame Flap Tag (51mm Head [25.5mm + 25.5mm] + 30mm Tail)",
    defaultBarcodeHeight: 14,
    maxBarcodeHeight: 18,
    defaultBrandFontSize: 6.5,
    defaultPriceFontSize: 7.5,
    defaultDescFontSize: 5.5,
    a4Cols: 2,
    a4Rows: 22,
    a4Total: 44,
    a5Cols: 1,
    a5Rows: 15,
    a5Total: 15,
    rollCols: 1,
    rollWidthMm: 81,
    rollHeightMm: 12,
    dGumConfig: DEFAULT_DGUM_CONFIG,
  },
  "81x12 mm (D-Gum Flap Tag)": {
    id: "81x12 mm (D-Gum Flap Tag)",
    displayName: "81×12 mm Optical Dumbbell Tag (TSC TTP-244 Plus / 1-Across Roll) ⭐",
    widthMm: 81,
    heightMm: 12,
    type: "dgum-flap",
    description: "Standard 81×12 mm Horizontal Roll for TSC TTP-244 Plus & Thermal Printers (51mm Head + 30mm Tail)",
    defaultBarcodeHeight: 14,
    maxBarcodeHeight: 18,
    defaultBrandFontSize: 6.5,
    defaultPriceFontSize: 7.5,
    defaultDescFontSize: 5.5,
    a4Cols: 2,
    a4Rows: 22,
    a4Total: 44,
    a5Cols: 1,
    a5Rows: 15,
    a5Total: 15,
    rollCols: 1,
    rollWidthMm: 81,
    rollHeightMm: 12,
    dGumConfig: DEFAULT_DGUM_CONFIG,
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

/**
 * Encodes text into Code 128 module patterns.
 * Automatically engages Subset C compression for 4+ consecutive numeric digit pairs
 * when text length > 12 characters, keeping module count <= 160 dots (20.0 mm).
 * For 10-char SKUs (e.g. TH1111C453), uses standard Code 128B resulting in exactly 145 modules.
 */
export function encodeCode128Pattern(text: string): {
  values: number[];
  totalModules: number;
  rects: Array<{ x: number; width: number }>;
} {
  const clean = text && text.trim() ? text.trim() : "FRM-00001";
  let values: number[] = [];

  const shouldCompressSubsetC = clean.length > 12 && /\d{4,}/.test(clean);

  if (shouldCompressSubsetC) {
    let mode: "B" | "C" = /^\d{4}/.test(clean) ? "C" : "B";
    values.push(mode === "C" ? 105 : 104);

    let i = 0;
    while (i < clean.length) {
      if (mode === "B") {
        const remaining = clean.slice(i);
        if (/^\d{4,}/.test(remaining)) {
          values.push(99); // Switch to Subset C
          mode = "C";
          continue;
        }
        const code = clean.charCodeAt(i);
        values.push(code >= 32 && code <= 126 ? code - 32 : 0);
        i++;
      } else {
        if (i + 1 < clean.length && /^\d\d$/.test(clean.slice(i, i + 2))) {
          values.push(parseInt(clean.slice(i, i + 2), 10));
          i += 2;
        } else {
          values.push(100); // Switch back to Subset B
          mode = "B";
        }
      }
    }
  } else {
    // Standard Code 128B
    values = [104];
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      values.push(code >= 32 && code <= 126 ? code - 32 : 0);
    }
  }

  // Checksum calculation: (startVal + sum(pos * val)) % 103
  let checksum = values[0];
  for (let pos = 1; pos < values.length; pos++) {
    checksum += values[pos] * pos;
  }
  values.push(checksum % 103);
  values.push(106); // Stop character (13 modules: 2331112)

  let currentX = 0;
  const rects: Array<{ x: number; width: number }> = [];

  for (const v of values) {
    const pattern = CODE128_PATTERNS[v] || "212222";
    let isBar = true;
    for (let c = 0; c < pattern.length; c++) {
      const w = parseInt(pattern[c], 10);
      if (isBar) {
        rects.push({ x: currentX, width: w });
      }
      currentX += w;
      isBar = !isBar;
    }
  }

  return { values, totalModules: currentX, rects };
}

/**
 * Builds an Integer-Dot Crisp SVG Barcode locked to exact thermal printhead dot geometry.
 * 1 module = 1 dot @ 203.2 DPI = 0.125 mm.
 * Eliminates fractional pixel bar width stretching and prevents barcode bars from merging.
 */
export function buildCrispIntegerDotBarcodeSvg(
  text: string,
  options?: {
    dotMm?: number;        // default 0.125 mm (203.2 DPI / 8 dots per mm)
    heightDots?: number;   // default 52 dots = 6.5 mm
  }
): { svg: string; totalModules: number; widthMm: number; heightMm: number } {
  const dotMm = options?.dotMm ?? 0.125;
  const heightDots = options?.heightDots ?? 52;
  const heightMm = Number((heightDots * dotMm).toFixed(2));

  const { totalModules, rects } = encodeCode128Pattern(text);
  const widthMm = Number((totalModules * dotMm).toFixed(3));

  const svgRects = rects
    .map((r) => `<rect x="${r.x}" y="0" width="${r.width}" height="${heightDots}" fill="#000000"/>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${heightDots}" width="${widthMm}mm" height="${heightMm}mm" shape-rendering="crispEdges" style="display:block;width:${widthMm}mm;height:${heightMm}mm;shape-rendering:crispEdges;margin:0 auto;">${svgRects}</svg>`;

  return { svg, totalModules, widthMm, heightMm };
}

export function buildCode128SvgString(text: string, height: number, barScale = 1.0): string {
  const clean = text && text.trim() ? text.trim() : "FRM-00001";
  const { totalModules, rects } = encodeCode128Pattern(clean);

  const scaledRects = rects
    .map((r) => `<rect x="${(r.x * barScale).toFixed(2)}" y="0" width="${(r.width * barScale).toFixed(2)}" height="${height}" fill="#000000"/>`)
    .join("");
  const totalWidth = (totalModules * barScale).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="100%" preserveAspectRatio="none" style="display:block;width:100%;height:100%;shape-rendering:crispEdges;">${scaledRects}</svg>`;
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
  let currentX = 0;
  const rects: string[] = [];
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    let runLen = 0;
    while (i < pattern.length && pattern[i] === bit) {
      runLen++;
      i++;
    }
    const w = runLen * barScale;
    if (bit === "1") {
      rects.push(`<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000000"/>`);
    }
    currentX += w;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${currentX} ${height}" width="100%" height="100%" preserveAspectRatio="none" style="display:block;width:100%;height:100%;shape-rendering:crispEdges;">${rects.join("")}</svg>`;
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
  dGumConfig?: DGumFlapConfig;
  rotation?: 0 | 180;
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
  const is81mmFlap = heightMm === 81;

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

  // Thermal printheads require pure solid black for lines and text
  const flapBorderCss =
    borderStyle === "none"
      ? "none"
      : borderStyle === "solid"
      ? "1px solid #000000"
      : "1px dashed #000000";

  const defaultHeader = getDefaultStoreHeader();
  const rawHeader =
    customHeader && customHeader.trim() && customHeader.trim().toUpperCase() !== "CLINICAL OPTICAL"
      ? customHeader.trim()
      : defaultHeader;
  const effectiveHeader = formatStoreHeaderForLabel(rawHeader, 15);

  const headerHtml = effectiveHeader
    ? `<span style="font-size:4.8px;text-transform:uppercase;letter-spacing:0.06em;color:#000000;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:14mm;line-height:1;">${effectiveHeader}</span>`
    : "";

  const brandHtml = showBrand
    ? `<span style="font-size:${Math.min(brandFontSize, 7)}px;color:#000000;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:${fontWeightCss};display:block;">${item.brand || item.category || "OPTICAL"}</span>`
    : "";

  const displayTitle = resolveDisplayTitle(
    item.name,
    item.category,
    item.brand,
    item.model,
    item.productCode || item.sku
  );
  const itemNameHtml = showItemName
    ? `<span style="font-size:${Math.min(descriptionFontSize, 5.8)}px;color:#000000;line-height:1.05;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block;margin-top:0.3mm;max-width:22mm;">${displayTitle}</span>`
    : "";

  const priceHtml =
    showPrice && formattedPrice
      ? `<span style="font-size:${Math.min(priceFontSize, 8)}px;color:#000000;font-weight:900;white-space:nowrap;flex-shrink:0;margin-left:2px;">${formattedPrice}</span>`
      : "";

  const fallbackSku = item.category
    ? `${item.category.slice(0, 3).toUpperCase()}-GEN-00001`
    : "FRM-GEN-00001";
  const skuCode = item.sku || fallbackSku;
  const barcodeSvg = buildCode128SvgString(skuCode, 22, 0.9);

  const skuTextHtml =
    showSKU && showBarcodeText
      ? `<span style="font-size:5px;font-family:'Courier New',monospace;letter-spacing:0.08em;font-weight:700;color:#000000;display:block;margin-top:0.3mm;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${skuCode}</span>`
      : "";

  // 81mm NTK Flap Tag layout (25.5mm Wing 1 + Fold + 25.5mm Wing 2 + 30mm Tail = 81mm total)
  if (is81mmFlap) {
    return `
    <div class="barcode-vertical-tag barcode-vertical-81x12" style="
      width:${widthMm}mm;
      max-width:${widthMm}mm;
      min-width:${widthMm}mm;
      height:${heightMm}mm;
      max-height:${heightMm}mm;
      min-height:${heightMm}mm;
      flex-shrink:0;
      flex-grow:0;
      box-sizing:border-box;
      background:#ffffff;
      font-family:${fontFamilyCss};
      display:flex;
      flex-direction:column;
      justify-content:flex-start;
      align-items:center;
      overflow:hidden;
      break-inside:avoid;
      page-break-inside:avoid;
      border:none;
      margin:0;
      padding:0;
    ">
      <!-- 51mm Head: Foldable Printable Body (Wing 1 [25.5mm] + Fold Line + Wing 2 [25.5mm]) -->
      <div style="width:100%;height:51mm;max-height:51mm;min-height:51mm;box-sizing:border-box;display:flex;flex-direction:column;border:${flapBorderCss};border-radius:1mm 1mm 0 0;overflow:hidden;background:#ffffff;flex-shrink:0;">
        <!-- Wing 1 (Front Wing along feed: 25.5mm length) -->
        <div style="width:100%;height:25.5mm;max-height:25.5mm;min-height:25.5mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;flex-shrink:0;">
          <div style="width:23.5mm;height:10.5mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:0.3mm 0.6mm;transform:rotate(90deg);transform-origin:center center;overflow:hidden;line-height:1.15;flex-shrink:0;">
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

        <!-- Central Fold Indicator at exactly 25.5mm -->
        <div style="width:100%;height:0;border-top:1px dashed #000000;position:relative;flex-shrink:0;"></div>

        <!-- Wing 2 (Back Wing along feed: 25.5mm length with 90° Barcode & SKU) -->
        <div style="width:100%;height:25.5mm;max-height:25.5mm;min-height:25.5mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;flex-shrink:0;">
          <div style="width:23.5mm;height:10.5mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(90deg);transform-origin:center center;overflow:hidden;flex-shrink:0;">
            <div style="width:21.5mm;height:6.8mm;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${barcodeSvg}
            </div>
            ${skuTextHtml}
          </div>
        </div>
      </div>

      <!-- Adhesive-Free Tail (30mm length along feed, 2.8mm thickness) -->
      <div style="width:100%;height:30mm;max-height:30mm;min-height:30mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:transparent;flex-shrink:0;">
        <div style="width:2.8mm;height:100%;border-left:${flapBorderCss};border-right:${flapBorderCss};border-bottom:${flapBorderCss};border-radius:0 0 1.4mm 1.4mm;background:#ffffff;"></div>
      </div>
    </div>`;
  }

  // Standard 100mm Vertical Butterfly Tag (38mm Wing 1 + 24mm Bridge + 38mm Wing 2)
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
        <div style="position:absolute;top:50%;left:0;width:100%;border-top:1px dashed #000000;transform:translateY(-50%);"></div>
        <span style="font-size:4px;color:#000000;font-weight:700;transform:rotate(90deg);white-space:nowrap;letter-spacing:1px;text-transform:uppercase;background:#ffffff;position:relative;z-index:1;padding:0 1px;">FOLD</span>
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

/**
 * Generates a production-accurate D-Gum Flap Label for optical spectacle frames (81mm × 12mm).
 * Engineered as a multi-section fold-over tag with:
 * - Printable Section 1 (~30-35mm): Brand, model, size specs, and retail price.
 * - Non-Printable Fold / Flap Section (~10-20mm): Wraps around frame temple/arm.
 * - Printable Section 2 (~30-35mm): Physical mm barcode with quiet zones and human-readable code.
 * Sum of all physical sections strictly equals totalLengthMm (81mm) without distortion.
 */
export function buildOneDGumFlapTagHtml(
  item: BarcodeItem,
  spec: LabelSpec,
  options?: BarcodeLabelOptions
): string {
  const dGumConfig = options?.dGumConfig || spec.dGumConfig || DEFAULT_DGUM_CONFIG;
  const sections = recalculateDGumSections(
    dGumConfig.section1LengthMm,
    dGumConfig.foldSectionLengthMm,
    dGumConfig.totalLengthMm
  );
  const s1Mm = sections.section1LengthMm;
  const foldMm = sections.foldSectionLengthMm;
  const s2Mm = sections.section2LengthMm;
  const totalLengthMm = dGumConfig.totalLengthMm || 81;
  const tagWidthMm = dGumConfig.widthMm || 12;

  const isVerticalFeed = dGumConfig.orientation === "vertical";
  const calX = dGumConfig.calibration?.offsetXmm || 0;
  const calY = dGumConfig.calibration?.offsetYmm || 0;

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

  const outerBorderCss =
    borderStyle === "dashed"
      ? "1px dashed #000000"
      : borderStyle === "solid"
      ? "1px solid #000000"
      : "1px solid transparent";

  const dividerBorderCss =
    borderStyle === "none"
      ? "1px dashed #000000"
      : "1px dashed #000000";

  const defaultHeader = getDefaultStoreHeader();
  const rawHeader =
    customHeader && customHeader.trim() && customHeader.trim().toUpperCase() !== "CLINICAL OPTICAL"
      ? customHeader.trim()
      : defaultHeader;
  const effectiveHeader = formatStoreHeaderForLabel(rawHeader, 15);

  const headerHtml = effectiveHeader
    ? `<span style="font-size:4.5px;text-transform:uppercase;letter-spacing:0.06em;color:#000000;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:14mm;line-height:1;">${effectiveHeader}</span>`
    : "";

  const brandHtml = showBrand
    ? `<span style="font-size:${Math.min(brandFontSize, 7)}px;color:#000000;line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:${fontWeightCss};display:block;">${item.brand || item.category || "OPTICAL"}</span>`
    : "";

  const displayTitle = resolveDisplayTitle(
    item.name,
    item.category,
    item.brand,
    item.model,
    item.productCode || item.sku
  );
  const itemNameHtml = showItemName
    ? `<span style="font-size:${Math.min(descriptionFontSize, 5.5)}px;color:#000000;line-height:1.05;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block;margin-top:0.3mm;max-width:23mm;">${displayTitle}</span>`
    : "";

  const priceHtml =
    showPrice && formattedPrice
      ? `<span style="font-size:${Math.min(priceFontSize, 7.5)}px;color:#000000;font-weight:900;white-space:nowrap;flex-shrink:0;">${formattedPrice}</span>`
      : "";

  const fallbackSku = item.category
    ? `${item.category.slice(0, 3).toUpperCase()}-GEN-00001`
    : "FRM-GEN-00001";
  const skuCode = item.sku || fallbackSku;

  const isBarcodeVertical =
    dGumConfig.barcode?.orientation === "vertical" ||
    options?.dGumConfig?.barcode?.orientation === "vertical";

  // Physical Barcode: Uses millimeter-based container dimensions with quiet zones
  const barcodeMaxW = Math.max(18, s2Mm - 3);
  const barcodeHeight = dGumConfig.barcode?.heightMm || 6.5;

  // Crisp Integer-Dot SVG Barcode (1 module = 1 dot = 0.125mm @ 203.2 DPI)
  // For TH1111C453, exactly 145 modules = 18.125mm wide × 6.5mm / 52 dots high
  const crispBarcode = buildCrispIntegerDotBarcodeSvg(skuCode, {
    dotMm: 0.125,
    heightDots: 52,
  });

  const skuTextHtml =
    showSKU && showBarcodeText
      ? `<span style="font-family:monospace;font-size:5.5pt;letter-spacing:0.3px;font-weight:700;color:#000000;display:block;margin-top:0.3mm;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${skuCode}</span>`
      : "";

  // Calibration and rotation transform
  const transforms: string[] = [];
  if (calX !== 0 || calY !== 0) {
    transforms.push(`translate(${calX}mm, ${calY}mm)`);
  }
  if (options?.rotation === 180) {
    transforms.push("rotate(180deg)");
  }
  const calTransform = transforms.length > 0 ? `transform: ${transforms.join(" ")}; transform-origin: center center;` : "";

  // NTK 81x12mm standard: 50mm foldable head (25.0mm + 25.0mm) + 31mm adhesive-free tail
  const headLengthMm = sections.headLengthMm || 50;
  const tailLengthMm = sections.tailLengthMm || 31;

  // If vertical feed, rotate content 90° for continuous longitudinal roll feed
  if (isVerticalFeed) {
    return `
      <div class="optical-tag-page barcode-dgum-label barcode-dgum-vertical" style="
        width:${tagWidthMm}mm;
        max-width:${tagWidthMm}mm;
        min-width:${tagWidthMm}mm;
        height:${totalLengthMm}mm;
        max-height:${totalLengthMm}mm;
        min-height:${totalLengthMm}mm;
        flex-shrink:0;
        flex-grow:0;
        box-sizing:border-box;
        background:#ffffff;
        font-family:${fontFamilyCss};
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        align-items:center;
        overflow:hidden;
        break-inside:avoid;
        page-break-inside:avoid;
        page-break-after:always;
        break-after:page;
        ${calTransform}
      ">
        <!-- Foldable Head (Top along feed: ${headLengthMm}mm) -->
        <div style="width:100%;height:${headLengthMm}mm;box-sizing:border-box;display:flex;flex-direction:column;border:${outerBorderCss};border-radius:1mm 1mm 0 0;overflow:hidden;background:#ffffff;">
          <!-- Top Section (Printable Wing 1 rotated: ${s1Mm}mm length along feed) -->
          <div style="width:100%;height:${s1Mm}mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
            <div style="width:${Math.max(16, s1Mm - 2)}mm;height:${tagWidthMm - 1}mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:0.3mm 0.6mm;transform:rotate(90deg);transform-origin:center center;overflow:hidden;line-height:1.15;flex-shrink:0;">
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

          <!-- Dotted Fold Line Divider at ${s1Mm}mm -->
          <div style="width:100%;height:0;border-top:${dividerBorderCss};position:relative;"></div>

          <!-- Bottom Section (Printable Wing 2 rotated: ${s2Mm}mm length along feed) -->
          <div style="width:100%;height:${s2Mm}mm;box-sizing:border-box;background:#ffffff;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
            <div style="width:${Math.max(16, s2Mm - 2)}mm;height:${tagWidthMm - 1}mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(90deg);transform-origin:center center;overflow:hidden;flex-shrink:0;">
              <div style="width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                ${crispBarcode.svg}
              </div>
              ${skuTextHtml}
            </div>
          </div>
        </div>

        <!-- 31mm Adhesive-Free Tail (Narrow Non-Printable Loop along Feed aligned within ${tagWidthMm}mm) -->
        <div style="width:100%;height:${tailLengthMm}mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:transparent;">
          <div style="width:2.8mm;height:100%;border-left:${outerBorderCss};border-right:${outerBorderCss};border-bottom:${outerBorderCss};border-radius:0 0 1.4mm 1.4mm;background:#ffffff;"></div>
        </div>
      </div>`;
  }

  // 2. Production Standard 81mm × 12mm 3-Zone Architecture (TSC TTP-244 Plus / Barbell Tag Blueprint)
  // Total Canvas: 81.0mm × 12.0mm = 648 × 96 dots @ 203.2 DPI
  // Zone 1: Left Text Flap (0.0mm – 25.0mm / 0 – 200 dots)
  // Center Fold Line: X = 25.0mm (border-right: 0.25mm dashed #000000)
  // Zone 2: Middle Barcode Flap (25.0mm – 50.0mm / 200 – 400 dots)
  // Zone 3: Right Unprinted Rat-Tail (50.0mm – 81.0mm / 400 – 648 dots)
  const cleanCategory = item.category ? item.category.trim().toUpperCase() : "FRAME";

  return `
    <div class="optical-tag-page barcode-dgum-label barcode-dgum-horizontal" style="
      width: 81mm !important;
      max-width: 81mm !important;
      min-width: 81mm !important;
      height: 12mm !important;
      max-height: 12mm !important;
      min-height: 12mm !important;
      flex-shrink: 0 !important;
      flex-grow: 0 !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      font-family: Arial, Helvetica, sans-serif !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      overflow: hidden !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 !important;
      padding: 0 !important;
      ${calTransform}
    ">
      <!-- Zone 1: Left Text Flap (0.0 mm – 25.0 mm / 0 – 200 dots) -->
      <div style="
        width: 25mm !important;
        max-width: 25mm !important;
        min-width: 25mm !important;
        height: 12mm !important;
        max-height: 12mm !important;
        min-height: 12mm !important;
        box-sizing: border-box !important;
        padding: 0.6mm 1.0mm 0.8mm 1.0mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        text-align: left !important;
        background: #ffffff !important;
        flex-shrink: 0 !important;
        border-right: 0.25mm dashed #000000 !important;
      ">
        <!-- Line 1: Shop Name -->
        <div style="font-size: 5.5pt !important; font-weight: 700 !important; line-height: 1.05 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; color: #000000 !important; font-family: Arial, Helvetica, sans-serif !important;">
          ${effectiveHeader}
        </div>
        <!-- Line 2: Category -->
        <div style="font-size: 7.0pt !important; font-weight: 800 !important; line-height: 1.05 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; color: #000000 !important; text-transform: uppercase !important; font-family: Arial, Helvetica, sans-serif !important;">
          ${cleanCategory}
        </div>
        <!-- Line 3: Model / Variant -->
        <div style="font-size: 5.2pt !important; font-weight: 700 !important; line-height: 1.05 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; color: #000000 !important; font-family: Arial, Helvetica, sans-serif !important;">
          ${displayTitle}
        </div>
        <!-- Line 4: Price -->
        <div style="font-size: 7.5pt !important; font-weight: 900 !important; line-height: 1.05 !important; white-space: nowrap !important; color: #000000 !important; font-family: Arial, Helvetica, sans-serif !important;">
          ${formattedPrice}
        </div>
      </div>

      <!-- Zone 2: Middle Barcode Flap (25.0 mm – 50.0 mm / 200 – 400 dots) -->
      <div style="
        width: 25mm !important;
        max-width: 25mm !important;
        min-width: 25mm !important;
        height: 12mm !important;
        max-height: 12mm !important;
        min-height: 12mm !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 0.5mm 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
        flex-shrink: 0 !important;
      ">
        <div style="width: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden !important;">
          ${crispBarcode.svg}
        </div>
        <span style="font-family: monospace !important; font-size: 5.5pt !important; font-weight: 700 !important; letter-spacing: 0.3px !important; margin-top: 0.3mm !important; line-height: 1 !important; color: #000000 !important; white-space: nowrap !important; overflow: hidden !important;">
          ${skuCode}
        </span>
      </div>

      <!-- Zone 3: Right Unprinted Rat-Tail (50.0 mm – 81.0 mm / 400 – 648 dots) -->
      <div style="
        flex: 0 0 31mm !important;
        width: 31mm !important;
        max-width: 31mm !important;
        min-width: 31mm !important;
        height: 12mm !important;
        max-height: 12mm !important;
        min-height: 12mm !important;
        box-sizing: border-box !important;
        background: transparent !important;
        overflow: hidden !important;
      ">
        <!-- Unprinted rat-tail MUST remain 100% empty -->
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
  if (spec.type === "dgum-flap") {
    return buildOneDGumFlapTagHtml(item, spec, options);
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

  const defaultHeader = getDefaultStoreHeader("");
  const rawHeader =
    customHeader && customHeader.trim() && customHeader.trim().toUpperCase() !== "CLINICAL OPTICAL"
      ? customHeader.trim()
      : defaultHeader;
  const effectiveHeader = formatStoreHeaderForLabel(rawHeader, type === "tag" ? 15 : 22);

  const headerHtml = effectiveHeader
    ? `<span style="font-size:${type === "tag" ? "5.5px" : "6.5px"};text-transform:uppercase;letter-spacing:0.08em;color:#64748b;display:block;line-height:1;margin-bottom:1px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${effectiveHeader}</span>`
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
    const isDGum = spec.type === "dgum-flap";
    const dGumCfg = options?.dGumConfig || spec.dGumConfig;
    const rollWidth = (isDGum && dGumCfg?.media?.mediaWidthMm)
      ? dGumCfg.media.mediaWidthMm
      : (spec.rollWidthMm ?? spec.widthMm);
    const rollHeight = (isDGum && dGumCfg?.media?.feedLengthMm)
      ? dGumCfg.media.feedLengthMm
      : (spec.rollHeightMm ?? spec.heightMm);
    const rollCols = (isDGum && dGumCfg?.media?.rollCols)
      ? dGumCfg.media.rollCols
      : (spec.rollCols ?? 1);

    pageCSS = `
      @media print {
        @page {
          size: ${rollWidth}mm ${rollHeight}mm;
          margin: 0mm !important;
        }
        html, body {
          width: ${rollWidth}mm !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0mm !important;
          padding: 0mm !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          overflow: visible !important;
        }
        .optical-tag-page, .barcode-continuous-page, .barcode-dgum-label, .barcode-vertical-tag {
          width: ${rollWidth}mm !important;
          height: ${rollHeight}mm !important;
          max-width: ${rollWidth}mm !important;
          min-width: ${rollWidth}mm !important;
          max-height: ${rollHeight}mm !important;
          min-height: ${rollHeight}mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: row !important;
          overflow: hidden !important;
        }
        .optical-tag-page:last-child, .barcode-continuous-page:last-child, .barcode-dgum-label:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    `;

    if (rollCols === 1) {
      bodyContent = allLabels.join("");
    } else {
      // Multi-column continuous roll (e.g. 3-across or 2-across)
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
        rowsHtml.push(`<div class="optical-tag-page barcode-continuous-page">${colsHtml}</div>`);
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
  <title></title>
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
    if (iframe) {
      try {
        iframe.remove();
      } catch {}
    }
    iframe = document.createElement("iframe");
    iframe.id = "barcode-print-frame";
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "400px";
    iframe.style.height = "200px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

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
      }, 250);
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

// ─── Native Raw TSPL2 Generator for TSC TTP-244 Plus (Direct .PRN Mode) ────────
export interface OpticalTagTSPLOptions {
  shopName?: string;
  category?: string;
  modelName?: string;
  priceText?: string;
  barcodeSku?: string;
  copies?: number;
  isGaplessContinuous?: boolean;
  ribbonInstalled?: boolean;
}

/**
 * Generates native TSPL2 commands for an 81 x 12 mm die-cut optical barbell tag
 * on a 203.2 DPI (8 dots/mm) TSC TTP-244 Plus printer.
 *
 * Physical Roll Layout (with DIRECTION 0,0 hardware origin at top-left of printhead,
 * or DIRECTION 1,0 where origin (0,0) is the left printable flap exiting the printer):
 */
export function generateOpticalTagTSPL({
  shopName = "PUNJAB OPTICALS",
  category = "FRAME",
  modelName = "TH 1111 C4 53 with case",
  priceText = "Rs. 10,900/-",
  barcodeSku = "TH1111C453",
  copies = 1,
  isGaplessContinuous = false,
  ribbonInstalled = true,
}: OpticalTagTSPLOptions = {}): string {
  const sanitize = (str: string) => String(str || "").replace(/"/g, '\\"').trim();
  const mediaSensorCmd = isGaplessContinuous ? "GAP 0 mm, 0 mm" : "GAP 2 mm, 0 mm";
  const ribbonCmd = ribbonInstalled ? "SET RIBBON ON" : "SET RIBBON OFF";

  // Using DIRECTION 0,0 with 180-degree rotated elements at X = 251..648
  // so that when the label exits the front of the TSC TTP-244 Plus:
  // - Left Flap (physical 0..25 mm = buffer X 648..448) has Shop Name, Category, Model, Price
  // - Fold Line (physical 25 mm = buffer X 444) has vertical bar
  // - Middle Flap (physical 25..50 mm = buffer X 444..248) has native Code 128 BARCODE
  // - Right Rat-Tail (physical 50..81 mm = buffer X 248..0) is 100% blank
  return [
    "SIZE 81 mm, 12 mm",
    mediaSensorCmd,
    ribbonCmd,
    "DIRECTION 0,0",
    "REFERENCE 0,0",
    "OFFSET 0 mm",
    "SET PEEL OFF",
    "SET CUTTER OFF",
    "SET PARTIAL_CUTTER OFF",
    "SET TEAR ON",
    "CLS",
    // Zone 1: Left Flap Text (rotated 180 deg so it reads left-to-right as tag exits printer)
    `TEXT 640,88,"1",180,1,1,"${sanitize(shopName)}"`,
    `TEXT 640,72,"2",180,1,1,"${sanitize(category)}"`,
    `TEXT 640,50,"1",180,1,1,"${sanitize(modelName)}"`,
    `TEXT 640,26,"2",180,1,1,"${sanitize(priceText)}"`,
    // Center Fold Line at X = 444 dots (25.5 mm from physical left edge)
    "BAR 444,0,2,16",
    "BAR 444,24,2,16",
    "BAR 444,48,2,16",
    "BAR 444,72,2,24",
    // Zone 2: Native Code 128 Barcode (narrow=1 dot, wide=2 dots, height=52 dots, human-readable=1)
    `BARCODE 420,82,"128",52,1,180,1,2,"${sanitize(barcodeSku)}"`,
    `PRINT 1,${Math.max(1, parseInt(String(copies), 10) || 1)}`,
    "",
  ].join("\r\n");
}

export function generateBulkOpticalTagsTSPL(
  items: Array<{ item: BarcodeItem; quantity: number }>,
  options?: {
    shopName?: string;
    isGaplessContinuous?: boolean;
    ribbonInstalled?: boolean;
    currencySymbol?: string;
  }
): string {
  const mediaSensorCmd = options?.isGaplessContinuous ? "GAP 0 mm, 0 mm" : "GAP 2 mm, 0 mm";
  const ribbonCmd = options?.ribbonInstalled === false ? "SET RIBBON OFF" : "SET RIBBON ON";
  const shopName = options?.shopName || "OPTICAL";
  const currencySymbol = options?.currencySymbol || "Rs. ";

  const sanitize = (str: string) => String(str || "").replace(/"/g, '\\"').trim();

  const lines: string[] = [
    "SIZE 81 mm, 12 mm",
    mediaSensorCmd,
    ribbonCmd,
    "DIRECTION 0,0",
    "REFERENCE 0,0",
    "OFFSET 0 mm",
    "SET PEEL OFF",
    "SET CUTTER OFF",
    "SET PARTIAL_CUTTER OFF",
    "SET TEAR ON",
  ];

  for (const entry of items) {
    const item = entry.item;
    const copies = Math.max(1, entry.quantity || 1);
    const cat = item.category ? item.category.trim().toUpperCase() : "FRAME";
    const displayTitle = resolveDisplayTitle(item.name, item.category, item.brand, item.model, item.productCode || item.sku);
    const numPrice = item.price ? parseFloat(item.price) : 0;
    const priceText = numPrice > 0 ? `${currencySymbol}${numPrice.toLocaleString("en-IN")}/-` : "";
    const skuCode = item.sku || (item.category ? `${item.category.slice(0, 3).toUpperCase()}-GEN-00001` : "FRM-GEN-00001");

    lines.push(
      "CLS",
      `TEXT 640,88,"1",180,1,1,"${sanitize(shopName)}"`,
      `TEXT 640,72,"2",180,1,1,"${sanitize(cat)}"`,
      `TEXT 640,50,"1",180,1,1,"${sanitize(displayTitle)}"`,
      `TEXT 640,26,"2",180,1,1,"${sanitize(priceText)}"`,
      "BAR 444,0,2,16",
      "BAR 444,24,2,16",
      "BAR 444,48,2,16",
      "BAR 444,72,2,24",
      `BARCODE 420,82,"128",52,1,180,1,2,"${sanitize(skuCode)}"`,
      `PRINT 1,${copies}`
    );
  }

  lines.push("");
  return lines.join("\r\n");
}

export function downloadTSPLPrnFile(tsplContent: string, fileName = "tsc_optical_tags.prn"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([tsplContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
