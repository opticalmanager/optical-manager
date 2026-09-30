/**
 * Optical Category Resolver
 * Normalizes raw category strings and item descriptions into standardized
 * optical product classifications with consistent display names and tax summary sorting.
 */

export interface OpticalCategoryInfo {
  code: string;
  name: string;
  sortOrder: number;
}

const CATEGORY_MAP: Record<string, OpticalCategoryInfo> = {
  FRAME: { code: "FRAME", name: "Frames", sortOrder: 1 },
  FRAMES: { code: "FRAME", name: "Frames", sortOrder: 1 },
  SPECTACLE_FRAME: { code: "FRAME", name: "Frames", sortOrder: 1 },
  SPECTACLES: { code: "FRAME", name: "Frames", sortOrder: 1 },

  SUNGLASS: { code: "SUNGLASSES", name: "Sunglasses", sortOrder: 2 },
  SUNGLASSES: { code: "SUNGLASSES", name: "Sunglasses", sortOrder: 2 },
  SHADES: { code: "SUNGLASSES", name: "Sunglasses", sortOrder: 2 },

  LENS: { code: "LENS", name: "Lenses", sortOrder: 3 },
  LENSES: { code: "LENS", name: "Lenses", sortOrder: 3 },
  OPHTHALMIC_LENS: { code: "LENS", name: "Lenses", sortOrder: 3 },
  SPECTACLE_LENS: { code: "LENS", name: "Lenses", sortOrder: 3 },

  CONTACT_LENS: { code: "CONTACT_LENS", name: "Contact Lenses", sortOrder: 4 },
  CONTACT_LENSES: { code: "CONTACT_LENS", name: "Contact Lenses", sortOrder: 4 },
  CL: { code: "CONTACT_LENS", name: "Contact Lenses", sortOrder: 4 },

  SOLUTION: { code: "SOLUTION", name: "Solutions", sortOrder: 5 },
  SOLUTIONS: { code: "SOLUTION", name: "Solutions", sortOrder: 5 },
  CONTACT_LENS_SOLUTION: { code: "SOLUTION", name: "Solutions", sortOrder: 5 },

  ACCESSORY: { code: "ACCESSORY", name: "Accessories", sortOrder: 6 },
  ACCESSORIES: { code: "ACCESSORY", name: "Accessories", sortOrder: 6 },
  SPECTACLE_ACCESSORY: { code: "ACCESSORY", name: "Accessories", sortOrder: 6 },

  READING_GLASSES: { code: "READING_GLASSES", name: "Reading Glasses", sortOrder: 7 },
  READERS: { code: "READING_GLASSES", name: "Reading Glasses", sortOrder: 7 },
};

/**
 * Converts a raw category code or string into Title Case display words
 * e.g. "SAFETY_GLASSES" -> "Safety Glasses", "eye_drops" -> "Eye Drops"
 */
function toTitleCase(str: string): string {
  return str
    .replace(/[_\-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves optical category metadata for an invoice line item.
 * Evaluates both the explicit category field and item description.
 */
export function resolveOpticalCategory(
  rawCategory?: string | null,
  description?: string | null
): OpticalCategoryInfo {
  // 1. Check explicit category if provided
  if (rawCategory && typeof rawCategory === "string") {
    const normalized = rawCategory.trim().toUpperCase().replace(/\s+/g, "_");
    if (CATEGORY_MAP[normalized]) {
      return CATEGORY_MAP[normalized];
    }
    // If it's a known non-empty string not in CATEGORY_MAP, format it nicely
    if (normalized !== "GENERAL" && normalized !== "OTHER" && normalized !== "UNKNOWN") {
      return {
        code: normalized,
        name: toTitleCase(rawCategory),
        sortOrder: 8,
      };
    }
  }

  // 2. Infer from item description if category is empty or generic
  const desc = (description || "").toLowerCase();

  // Sunglasses
  if (/sunglass|sun glass|shades|polaroid/i.test(desc)) {
    return CATEGORY_MAP.SUNGLASSES;
  }

  // Solutions & Cleaners (checked before contact lenses so 'contact lens solution' is classified as solution)
  if (/solution|renu|biotrue|opti-free|lens cleaner|cleaning spray/i.test(desc)) {
    return CATEGORY_MAP.SOLUTION;
  }

  // Contact Lenses
  if (/contact lens|cl lens|daily disposable|monthly disposable|toric lens|acuvue|bausch/i.test(desc)) {
    return CATEGORY_MAP.CONTACT_LENS;
  }

  // Ophthalmic Lenses
  if (
    /lens|single vision|bifocal|progressive|crizal|blue cut|anti-reflective|antiglare|photochromic|arc coating|drivewear/i.test(
      desc
    )
  ) {
    return CATEGORY_MAP.LENS;
  }

  // Frames & Spectacles
  if (/frame|spectacle|eyeglass|rimless|half rim|full rim/i.test(desc)) {
    return CATEGORY_MAP.FRAME;
  }

  // Accessories
  if (/case|cloth|chain|cord|wipes|screwdriver|nose pad|accessory|accessories/i.test(desc)) {
    return CATEGORY_MAP.ACCESSORY;
  }

  // Reading Glasses
  if (/reading glasses|reader/i.test(desc)) {
    return CATEGORY_MAP.READING_GLASSES;
  }

  // Default fallback for general optical products
  return {
    code: "OPTICAL_GOODS",
    name: "Optical Goods",
    sortOrder: 9,
  };
}
