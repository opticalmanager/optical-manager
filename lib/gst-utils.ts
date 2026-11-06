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
 * Validates 15-character statutory GSTIN format
 */
export function isValidGSTIN(gstin?: string | null): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  if (clean === "URP" || clean === "UNREGISTERED" || clean === "N/A") return false;
  return GSTIN_REGEX.test(clean);
}

/**
 * Extracts 2-digit state code and human state name from GSTIN
 */
export function getStateFromGSTIN(gstin?: string | null): { code: string; name: string } | null {
  if (!isValidGSTIN(gstin)) return null;
  const clean = gstin!.trim().toUpperCase();
  const code = clean.substring(0, 2);
  const name = GST_STATE_CODES[code] || "Unknown State";
  return { code, name };
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
 * Returns formatted Place of Supply e.g. "27-Maharashtra"
 */
export function getPlaceOfSupply(
  customerState?: string | null,
  customerGstin?: string | null,
  shopGstin?: string | null
): string {
  // 1. If customer has valid GSTIN, place of supply is always derived from GSTIN state code
  const fromGstin = getStateFromGSTIN(customerGstin);
  if (fromGstin) {
    return `${fromGstin.code}-${fromGstin.name}`;
  }

  // 2. If customer has state text, match it
  if (customerState) {
    const code = getStateCodeByName(customerState);
    if (code && GST_STATE_CODES[code]) {
      return `${code}-${GST_STATE_CODES[code]}`;
    }
  }

  // 3. Fallback to supplier shop's state from shopGstin
  const shopState = getStateFromGSTIN(shopGstin);
  if (shopState) {
    return `${shopState.code}-${shopState.name}`;
  }

  // 4. Default if no shop GSTIN available
  return "27-Maharashtra";
}

/**
 * Identifies if transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
 */
export function getSupplyType(
  placeOfSupply: string,
  shopGstin?: string | null
): "Intra-State" | "Inter-State" {
  const shopState = getStateFromGSTIN(shopGstin);
  const shopCode = shopState?.code || "27"; // Default home state
  const posCode = placeOfSupply.split("-")[0]?.trim();

  if (posCode && posCode === shopCode) {
    return "Intra-State";
  }
  return "Inter-State";
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
