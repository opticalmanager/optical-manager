import type { DocumentSequenceConfig } from "@/db/schema/shops";

/**
 * Calculate the Indian Financial Year string (e.g., "24-25" or "2024-25").
 * In India, FY runs from April 1 to March 31.
 */
export function getIndianFinancialYear(date: Date = new Date(), format: "SHORT" | "LONG" = "SHORT"): string {
  const month = date.getMonth() + 1; // 1 to 12
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  if (format === "SHORT") {
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`; // e.g. "24-25"
  }
  return `${startYear}-${String(endYear).slice(-2)}`; // e.g. "2024-25"
}

/**
 * Default fallback configurations for shops without custom configuration.
 */
export const DEFAULT_DOCUMENT_SERIES = {
  invoice: {
    prefix: "INV",
    separator: "-",
    includeYear: true,
    yearFormat: "YYYY" as const,
    includeShopCode: true,
    paddingDigits: 4,
    nextNumber: 1,
    suffix: "",
  },
  customer: {
    prefix: "OP",
    separator: "-",
    includeYear: true,
    yearFormat: "YYYY" as const,
    includeShopCode: true,
    paddingDigits: 4,
    nextNumber: 1,
    suffix: "",
  },
  order: {
    matchInvoice: false,
    prefix: "ORD",
    separator: "-",
    includeYear: true,
    yearFormat: "YYYY" as const,
    includeShopCode: true,
    paddingDigits: 4,
    nextNumber: 1,
    suffix: "",
  },
};

/**
 * Builds the pattern prefix (everything before the serial number counter)
 * Example outputs: "INV-1-2026-", "OM/24-25/", "REG-2026-", "INV2026" (when separator is empty "")
 */
export function buildSeriesPrefix(
  config: Partial<DocumentSequenceConfig>,
  shopNum: number = 1,
  date: Date = new Date()
): string {
  const sep = typeof config.separator === "string" ? config.separator : "-";
  const parts: string[] = [];

  // 1. Prefix
  if (config.prefix && config.prefix.trim()) {
    parts.push(config.prefix.trim().toUpperCase());
  }

  // 2. Shop Code
  if (config.includeShopCode) {
    parts.push(String(shopNum));
  }

  // 3. Year
  if (config.includeYear && config.yearFormat && config.yearFormat !== "NONE") {
    if (config.yearFormat === "YYYY") {
      parts.push(date.getFullYear().toString());
    } else if (config.yearFormat === "YY") {
      parts.push(date.getFullYear().toString().slice(-2));
    } else if (config.yearFormat === "FY") {
      parts.push(getIndianFinancialYear(date, "SHORT"));
    }
  }

  if (parts.length === 0) return "";
  return parts.join(sep) + sep;
}

/**
 * Formats a complete document number given config, serial, shop number and date.
 * Example: formatDocumentNumber(config, 501, 1) => "INV-1-2026-0501"
 */
export function formatDocumentNumber(
  config: Partial<DocumentSequenceConfig>,
  serial: number,
  shopNum: number = 1,
  date: Date = new Date()
): string {
  const prefix = buildSeriesPrefix(config, shopNum, date);
  const padding = typeof config.paddingDigits === "number" ? config.paddingDigits : 4;
  const numStr = padding > 0 ? String(serial).padStart(padding, "0") : String(serial);
  const suffix = (config.suffix || "").trim();
  return `${prefix}${numStr}${suffix}`;
}

/**
 * Safely extracts the trailing serial number from a formatted document number.
 * Works across hyphens, slashes, or seamless empty separators (e.g. "INV-1-2026-0042" => 42, "OM/24-25/1042" => 1042, "INV20260042" => 42).
 */
export function extractTrailingSerial(
  documentNumber: string | null | undefined,
  knownPrefix?: string
): number | null {
  if (!documentNumber) return null;

  // 1. If a known prefix is provided and the document starts with it, extract immediately
  if (knownPrefix && documentNumber.startsWith(knownPrefix)) {
    const remainder = documentNumber.slice(knownPrefix.length);
    const match = remainder.match(/^(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return num;
    }
  }

  // 2. Fallback: match trailing digits at end of string or before optional suffix
  const match = documentNumber.match(/(\d+)(?:[A-Za-z\-_/]*)$/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}
