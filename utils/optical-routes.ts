/**
 * Canonical registry of Optical Manager application routes for
 * fuzzy matching, 404 predictions, and quick navigation.
 */

export interface OpticalRouteItem {
  path: string;
  label: string;
  category: "Billing & POS" | "Clinical & Patients" | "Inventory & Supply" | "Reports & Management" | "General";
  keywords: string[];
  description: string;
}

export const OPTICAL_ROUTES: OpticalRouteItem[] = [
  {
    path: "/shop/invoices/new",
    label: "New POS Invoice / Bill",
    category: "Billing & POS",
    keywords: ["bill", "invoice", "pos", "sale", "checkout", "new invoice", "cashier", "gst"],
    description: "Create standard or tax invoices for spectacles, lenses, and accessories.",
  },
  {
    path: "/shop/invoices",
    label: "Invoices Ledger",
    category: "Billing & POS",
    keywords: ["invoices", "ledger", "receipts", "sales history", "past bills", "print bill"],
    description: "Browse, filter, print, and share historical customer invoices.",
  },
  {
    path: "/shop/customers",
    label: "Patients & Customer Directory",
    category: "Clinical & Patients",
    keywords: ["patient", "customer", "client", "rx", "profiles", "phone number", "medical"],
    description: "Patient directory with past refraction history, power prescriptions, and balances.",
  },
  {
    path: "/shop/prescriptions",
    label: "Prescriptions & Refraction",
    category: "Clinical & Patients",
    keywords: ["prescription", "power", "refraction", "sph", "cyl", "axis", "add", "optometry"],
    description: "Manage clinical eye examination records and optical refraction measurements.",
  },
  {
    path: "/shop/appointments",
    label: "Appointments & Optometry Schedule",
    category: "Clinical & Patients",
    keywords: ["appointment", "booking", "schedule", "optometrist", "eye test", "calendar"],
    description: "Schedule patient visits, doctor consultations, and vision screening appointments.",
  },
  {
    path: "/shop/inventory",
    label: "Stock & Eyewear Inventory",
    category: "Inventory & Supply",
    keywords: ["inventory", "stock", "frames", "lenses", "sunglasses", "sku", "barcode", "products"],
    description: "Real-time stock catalog with barcode printing and multi-category pricing.",
  },
  {
    path: "/shop/purchases",
    label: "Purchases & Inward Supplies",
    category: "Inventory & Supply",
    keywords: ["purchase", "inward", "supplier bill", "po", "procurement", "stock in"],
    description: "Record inward supplier invoices, track inward shipments, and print barcode tags.",
  },
  {
    path: "/shop/purchases/vendors",
    label: "Vendors & Lens Labs Directory",
    category: "Inventory & Supply",
    keywords: ["vendor", "supplier", "lab", "distributor", "contact lenses", "frames supplier", "gstin"],
    description: "Directory of frame suppliers, ophthalmic lens labs, and optical distributors.",
  },
  {
    path: "/shop/returns",
    label: "Sales Returns & Replacements",
    category: "Billing & POS",
    keywords: ["return", "refund", "credit note", "replacement", "damaged frame"],
    description: "Process customer product returns, frame exchanges, and credit adjustments.",
  },
  {
    path: "/shop/reports",
    label: "Sales & Tax Reports",
    category: "Reports & Management",
    keywords: ["reports", "daily collection", "gst report", "profit", "analytics", "tax summary"],
    description: "Day-wise collection summaries, GST filing tables, and category sales reports.",
  },
  {
    path: "/shop/settings",
    label: "Shop & Thermal Printer Settings",
    category: "Reports & Management",
    keywords: ["settings", "printer", "thermal", "barcode settings", "store profile", "gst number"],
    description: "Configure store details, WhatsApp notification templates, and printer formats.",
  },
  {
    path: "/shop/dashboard",
    label: "Store Operations Dashboard",
    category: "General",
    keywords: ["dashboard", "home", "stats", "store overview", "today sales", "kpis"],
    description: "Real-time operational dashboard with today's revenue, active orders, and alerts.",
  },
  {
    path: "/owner",
    label: "Multi-Store Owner Console",
    category: "Reports & Management",
    keywords: ["owner", "admin", "branches", "multi-shop", "chain", "consolidation"],
    description: "Consolidated enterprise analytics and branch management across multiple outlets.",
  },
];

/**
 * Predicts the most likely intended route from a broken URL pathname.
 */
export function predictIntendedRoute(currentPath: string): OpticalRouteItem | null {
  if (!currentPath || currentPath === "/") return null;
  const clean = currentPath.toLowerCase().replace(/[^a-z0-9]/g, "");

  let bestMatch: OpticalRouteItem | null = null;
  let highestScore = 0;

  for (const item of OPTICAL_ROUTES) {
    const routeClean = item.path.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Direct substring or inclusion check
    if (clean.includes(routeClean) || routeClean.includes(clean)) {
      return item;
    }

    // Keyword match scoring
    let score = 0;
    for (const kw of item.keywords) {
      const kwClean = kw.replace(/[^a-z0-9]/g, "");
      if (clean.includes(kwClean)) score += 3;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return highestScore >= 3 ? bestMatch : null;
}
