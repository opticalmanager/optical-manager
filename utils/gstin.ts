/**
 * Comprehensive Indian GSTIN Utilities & State Mapping
 * Deterministic, zero-cost offline intelligence for Indian GST identification numbers.
 */

export const GSTIN_STATE_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir",
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
  "25": "Dadra and Nagar Haveli and Daman and Diu", // Legacy Daman and Diu fallback
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh", // Legacy pre-bifurcation fallback
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

export const INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const PAN_ENTITY_TYPES: Record<string, string> = {
  P: "Individual / Proprietorship",
  C: "Company (Pvt Ltd / Ltd)",
  F: "Partnership Firm / LLP",
  H: "HUF (Hindu Undivided Family)",
  A: "Association of Persons (AOP)",
  T: "Trust",
  B: "Body of Individuals (BOI)",
  G: "Government Agency",
  J: "Artificial Juridical Person",
  L: "Local Authority",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOD_36_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Computes official Luhn Modulo 36 checksum character for the first 14 chars of GSTIN.
 */
export function calculateGSTINChecksum(gstin14: string): string | null {
  if (!gstin14 || gstin14.length !== 14) return null;
  const clean = gstin14.toUpperCase();
  let factor = 2;
  let sum = 0;

  for (let i = clean.length - 1; i >= 0; i--) {
    const cp = MOD_36_CHARS.indexOf(clean[i]);
    if (cp === -1) return null;

    let digit = cp * factor;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
    factor = factor === 2 ? 1 : 2;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return MOD_36_CHARS.charAt(checkCodePoint);
}

/**
 * Validates GSTIN structure and 15th-character Luhn Modulo 36 checksum.
 */
export function isValidGSTIN(gstin?: string | null): boolean {
  if (!gstin || typeof gstin !== "string") return false;
  const clean = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(clean)) return false;

  const expectedChecksum = calculateGSTINChecksum(clean.substring(0, 14));
  return expectedChecksum === clean.charAt(14);
}

/**
 * Extracts standard state name from digits 1-2 of GSTIN.
 * Returns null if input is fewer than 2 digits or not a recognized state code.
 */
export function getStateFromGSTIN(gstin?: string | null): string | null {
  if (!gstin || typeof gstin !== "string") return null;
  const clean = gstin.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length < 2) return null;
  const code = clean.substring(0, 2);
  return GSTIN_STATE_MAP[code] || null;
}

/**
 * Extracts 2-digit state code from GSTIN if valid.
 */
export function getStateCodeFromGSTIN(gstin?: string | null): string | null {
  if (!gstin || typeof gstin !== "string") return null;
  const clean = gstin.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length < 2) return null;
  const code = clean.substring(0, 2);
  return GSTIN_STATE_MAP[code] ? code : null;
}

export interface GSTINMetadata {
  stateCode: string | null;
  stateName: string | null;
  pan: string | null;
  entityType: string | null;
  isProprietorship: boolean;
  isValidFormat: boolean;
  isValidChecksum: boolean;
}

/**
 * Extracts all deterministic offline metadata from a GSTIN in 0ms with zero API cost.
 */
export function extractGSTINMetadata(gstin?: string | null): GSTINMetadata {
  const result: GSTINMetadata = {
    stateCode: null,
    stateName: null,
    pan: null,
    entityType: null,
    isProprietorship: false,
    isValidFormat: false,
    isValidChecksum: false,
  };

  if (!gstin || typeof gstin !== "string") return result;
  const clean = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 2) return result;

  // 1. State
  const code = clean.substring(0, 2);
  if (GSTIN_STATE_MAP[code]) {
    result.stateCode = code;
    result.stateName = GSTIN_STATE_MAP[code];
  }

  // 2. PAN (if >= 12 chars)
  if (clean.length >= 12) {
    result.pan = clean.substring(2, 12);
    const entityChar = clean.charAt(5);
    if (PAN_ENTITY_TYPES[entityChar]) {
      result.entityType = PAN_ENTITY_TYPES[entityChar];
      result.isProprietorship = entityChar === "P";
    }
  }

  // 3. Validation (if full 15 chars)
  if (clean.length === 15) {
    result.isValidFormat = GSTIN_REGEX.test(clean);
    if (result.isValidFormat) {
      const expectedCheck = calculateGSTINChecksum(clean.substring(0, 14));
      result.isValidChecksum = expectedCheck === clean.charAt(14);
    }
  }

  return result;
}
