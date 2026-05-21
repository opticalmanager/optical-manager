/**
 * Application-wide constants.
 */

export const APP_NAME = "Optical Manager";
export const APP_DESCRIPTION =
  "Multi-tenant SaaS CRM for optical stores — manage shops, customers, prescriptions, inventory, and invoices.";

/** User roles */
export const ROLES = {
  OWNER: "OWNER",
  SHOP_MANAGER: "SHOP_MANAGER",
} as const;

/** Subscription plans */
export const PLANS = {
  TRIAL: "TRIAL",
  BASIC: "BASIC",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
} as const;

/** Subscription statuses */
export const SUBSCRIPTION_STATUSES = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

/** Invoice statuses */
export const INVOICE_STATUSES = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

/** Payment methods */
export const PAYMENT_METHODS = {
  CASH: "CASH",
  CARD: "CARD",
  UPI: "UPI",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;

/** Inventory categories */
export const INVENTORY_CATEGORIES = {
  FRAME: "FRAME",
  LENS: "LENS",
  CONTACT_LENS: "CONTACT_LENS",
  ACCESSORY: "ACCESSORY",
  SOLUTION: "SOLUTION",
} as const;

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 14;

/** Navigation items for the sidebar */
export const OWNER_NAV_ITEMS = [
  { label: "Dashboard", href: "/owner", icon: "LayoutDashboard" },
  { label: "Shops", href: "/owner/shops", icon: "Store" },
  { label: "Shop Managers", href: "/owner/shop-managers", icon: "Users" },
  { label: "Settings", href: "/owner/settings", icon: "Settings" },
] as const;

export const SHOP_NAV_ITEMS = [
  { label: "Dashboard", href: "/shop/dashboard", icon: "LayoutDashboard" },
  { label: "Customers", href: "/shop/customers", icon: "Users" },
  { label: "Prescriptions", href: "/shop/prescriptions", icon: "FileText" },
  { label: "Inventory", href: "/shop/inventory", icon: "Package" },
  { label: "Invoices", href: "/shop/invoices", icon: "Receipt" },
] as const;
