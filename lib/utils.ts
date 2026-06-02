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

export function generateSKU(params: {
  category: "FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY" | "SOLUTION";
  brand?: string;
  modelNumber?: string;
  colorCode?: string;
  sequentialNumber: number;
}): string {
  const prefixMap = {
    FRAME: "FRM",
    LENS: "LNS",
    CONTACT_LENS: "CTL",
    ACCESSORY: "ACC",
    SOLUTION: "SOL",
  };
  const prefix = prefixMap[params.category];
  const brand = (params.brand || "GEN")
    .replace(/[^A-Za-z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const model = (params.modelNumber || "000000")
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 6)
    .toUpperCase();
  const color = (params.colorCode || "000")
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase();
  const seq = params.sequentialNumber.toString().padStart(3, "0");
  return `${prefix}-${brand}${model}-${color}-${seq}`;
}



