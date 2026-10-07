import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(value)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

export function formatCompactCurrency(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(value)) return "₹0.00";
  
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}k`;
  }
  
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateInvoiceNumber(prefix = "INV"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${dateStr}-${randomStr}`;
}

export interface GenerateSKUParams {
  category?: string | null;
  brand?: string | null;
  vendorName?: string | null;
  modelNumber?: string | null;
  colorCode?: string | null;
  sequentialNumber?: number;
}

export function generateSKU(params: GenerateSKUParams): string {
  // 1. Normalize Category Prefix (3 chars)
  const prefixMap: Record<string, string> = {
    FRAME: "FRM",
    FRAMES: "FRM",
    FRM: "FRM",
    SUNGLASSES: "SNG",
    SUNGLASS: "SNG",
    SNG: "SNG",
    LENS: "LNS",
    LENSES: "LNS",
    OPHTHALMIC_LENS: "LNS",
    LNS: "LNS",
    CONTACT_LENS: "CTL",
    CONTACT_LENSES: "CTL",
    CTL: "CTL",
    ACCESSORY: "ACC",
    ACCESSORIES: "ACC",
    ACC: "ACC",
    SOLUTION: "SOL",
    SOLUTIONS: "SOL",
    SOL: "SOL",
  };
  const categoryKey = (params.category || "").toUpperCase().trim();
  const prefix = prefixMap[categoryKey] || "FRM";

  // 2. Normalize Brand Code (3 chars)
  // Hierarchy: brand -> vendorName -> "GEN" (Generic)
  let brandCode = "GEN";
  if (params.brand && params.brand.trim()) {
    const clean = params.brand.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length > 0) {
      brandCode = clean.substring(0, 3).padEnd(3, "X");
    }
  } else if (params.vendorName && params.vendorName.trim()) {
    const clean = params.vendorName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length > 0) {
      brandCode = clean.substring(0, 3).padEnd(3, "X");
    }
  }

  // 3. Format Sequence (5 digits: 00001 - 99999)
  const seqNum = Math.max(1, params.sequentialNumber || 1);
  const seq = seqNum.toString().padStart(5, "0");

  return `${prefix}-${brandCode}-${seq}`;
}

export const generateOpticalSKU = generateSKU;



