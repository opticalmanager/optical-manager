/**
 * GST Utility library for Indian Tax Compliance (GSTR-1 & GSTR-3B)
 * Provides statutory state codes, Place of Supply determination,
 * GSTIN format validation, and HSN description mappings for optical retail.
 */

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

// Normalized state name mapping for reverse lookup from customer address
export const STATE_NAME_TO_CODE: Record<string, string> = {
  "jammu and kashmir": "01",
  "jammu & kashmir": "01",
  "j&k": "01",
  "himachal pradesh": "02",
  "himachal": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "uttaranchal": "05",
  "haryana": "06",
  "delhi": "07",
  "new delhi": "07",
  "nct of delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "up": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "wb": "19",
  "jharkhand": "20",
  "odisha": "21",
  "orissa": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "mp": "23",
  "gujarat": "24",
  "dadra and nagar haveli": "26",
  "daman and diu": "26",
  "maharashtra": "27",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "tamilnadu": "33",
  "puducherry": "34",
  "pondicherry": "34",
  "andaman and nicobar": "35",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "andhra pradesh": "37",
  "ap": "37",
  "ladakh": "38",
};

export const HSN_DESCRIPTIONS: Record<string, string> = {
  "9003": "Frames & Mountings for Spectacles",
  "9004": "Spectacles, Goggles & Sunglasses",
  "9001": "Optical Lenses & Contact Lenses",
  "7015": "Spectacle Glasses & Blanks",
  "3307": "Contact Lens Solutions & Cleansers",
  "9002": "Lenses, Prisms & Optical Elements",
  "9018": "Ophthalmic & Diagnostic Instruments",
  "4202": "Spectacle Cases & Covers",
  "6307": "Microfiber Lens Cleaning Cloths",
};

export const INSPECTION_REASON_LABELS: Record<string, string> = {
  "LOOKS_NEW": "Customer Return (Unused/New)",
  "MINOR_WEAR": "Minor Wear / Fit Issue",
  "DAMAGED": "Damaged / Broken",
  "WRONG_PRODUCT": "Incorrect Item Issued",
  "MANUFACTURING_DEFECT": "Manufacturing Defect",
  "WARRANTY_CLAIM": "Warranty Claim",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Normalizes statutory GSTIN string.
 * Automatically corrects common cashier typos like uppercase letter 'O' instead of digit '0' for state codes 01-09.
 */
export function normalizeGSTIN(gstin?: string | null): string {
  if (!gstin || typeof gstin !== "string") return "";
  let clean = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  // Common typo: cashiers type letter 'O' instead of digit '0' in state code (e.g. O7 -> 07, O8 -> 08)
  if (clean.length >= 2 && clean.startsWith("O") && /^[0-9]/.test(clean[1])) {
    clean = "0" + clean.substring(1);
  }
  return clean;
}

/**
 * Validates 15-character statutory GSTIN format
 */
export function isValidGSTIN(gstin?: string | null): boolean {
  if (!gstin) return false;
  const clean = normalizeGSTIN(gstin);
  if (clean === "URP" || clean === "UNREGISTERED" || clean === "N/A") return false;
  return GSTIN_REGEX.test(clean);
}

/**
 * Extracts 2-digit state code and human state name from GSTIN
 */
export function getStateFromGSTIN(gstin?: string | null): { code: string; name: string } | null {
  const clean = normalizeGSTIN(gstin);
  if (!clean || clean.length < 2) return null;
  const code = clean.substring(0, 2);
  const name = GST_STATE_CODES[code];
  if (!name) return null;
  return { code, name };
}

/**
 * Resolves 2-digit state code and name from full address text (e.g. "Cannaught Palace, new Delhi")
 */
export function getStateFromAddress(address?: string | null): { code: string; name: string } | null {
  if (!address || typeof address !== "string") return null;
  const lower = address.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(lower)) {
      return { code, name: GST_STATE_CODES[code] };
    }
  }
  return null;
}

/**
 * Resolves 2-digit state code from state name
 */
export function getStateCodeByName(stateName?: string | null): string | null {
  if (!stateName) return null;
  const normalized = stateName.trim().toLowerCase();
  if (STATE_NAME_TO_CODE[normalized]) {
    return STATE_NAME_TO_CODE[normalized];
  }
  // Try partial match
  for (const [key, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }
  return null;
}

/**
 * Returns formatted Place of Supply e.g. "07-Delhi"
 * Strictly adheres to authentic data - NEVER falls back to dummy/hardcoded states.
 */
export function getPlaceOfSupply(
  customerState?: string | null,
  customerGstin?: string | null,
  shopGstin?: string | null,
  shopAddress?: string | null
): string {
  // 1. If customer has valid GSTIN, place of supply is always derived from GSTIN state code
  const fromCustomerGstin = getStateFromGSTIN(customerGstin);
  if (fromCustomerGstin) {
    return `${fromCustomerGstin.code}-${fromCustomerGstin.name}`;
  }

  // 2. If customer has explicitly entered state, match it
  if (customerState && customerState.trim()) {
    const code = getStateCodeByName(customerState);
    if (code && GST_STATE_CODES[code]) {
      return `${code}-${GST_STATE_CODES[code]}`;
    }
  }

  // 3. For walk-in retail counter sales (where customer did not enter state):
  // Under Section 10(1)(c) of the IGST Act, the statutory Place of Supply is the store location where goods are handed over.
  const shopState = getStateFromGSTIN(shopGstin) || getStateFromAddress(shopAddress);
  if (shopState) {
    return `${shopState.code}-${shopState.name}`;
  }

  // 4. Zero dummy fallback: if neither customer nor shop has identifiable state
  return "Not Provided";
}

/**
 * Identifies if transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
 */
export function getSupplyType(
  placeOfSupply: string,
  shopGstin?: string | null,
  shopAddress?: string | null
): "Intra-State" | "Inter-State" {
  if (!placeOfSupply || placeOfSupply === "Not Provided" || placeOfSupply === "—") {
    // Over-the-counter retail sales without out-of-state shipping default to local Intra-State
    return "Intra-State";
  }

  const shopState = getStateFromGSTIN(shopGstin) || getStateFromAddress(shopAddress);
  const posCode = placeOfSupply.split("-")[0]?.trim();

  // If store state is known and matches POS -> Intra-State
  if (shopState && posCode) {
    return posCode === shopState.code ? "Intra-State" : "Inter-State";
  }

  return "Intra-State";
}

/**
 * Formats a Date object into DD/MM/YYYY Indian statutory tax format
 */
export function formatIndianDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a Date object into DD-MMM-YYYY (e.g. 08-Oct-2026)
 * Prevents Excel date overflow (########) and ensures unambiguous CA date recognition.
 */
export function formatDateOfSale(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Resolves the canonical public invoice URL.
 * Falls back to live production domain (https://www.opticalmanager.in)
 * when origin is localhost or missing.
 */
export function getLivePublicInvoiceUrl(invoiceId: string, origin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return `${envUrl.replace(/\/$/, "")}/share/invoice/${invoiceId}`;
  }
  if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return `${origin.replace(/\/$/, "")}/share/invoice/${invoiceId}`;
  }
  return `https://www.opticalmanager.in/share/invoice/${invoiceId}`;
}
