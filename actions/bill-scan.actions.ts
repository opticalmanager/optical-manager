"use server";

import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationAiConfig } from "@/services/organization.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { getOrganizationCategories, CategoryItem } from "@/services/category.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveGeminiModel, RETIRED_MODELS } from "@/utils/ai.utils";
import type {
  BillExtractionResult,
  ExtractedBillData,
  ExtractedBillItem,
} from "@/types/bill-scan";

interface RawGeminiItem {
  productName?: string;
  productCode?: string;
  category?: string;
  hsnCode?: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxableValue?: number;
  gstPercent?: number;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  batchNumber?: string;
  expiryDate?: string;
}

interface RawGeminiResponse {
  vendorName?: string;
  vendorGstin?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  taxType?: "SGST_CGST" | "IGST";
  items?: RawGeminiItem[];
  notes?: string;
}

/**
 * Normalizes diverse Indian invoice date formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-MMM-YYYY)
 * into standard ISO YYYY-MM-DD for form date pickers.
 */
function normalizeIndianDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = String(dateStr).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Native Date parsing fallback
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Filters out placeholder strings ("N/A", "none", "null", "-", "nil") from LLM outputs.
 */
function sanitizeSpecString(val?: string | null): string | undefined {
  if (!val) return undefined;
  const str = String(val).trim();
  if (!str) return undefined;
  if (/^(n\/?a|none|null|undefined|-|--|unknown|not available|nil)$/i.test(str)) {
    return undefined;
  }
  return str;
}

/**
 * Sanitizes product codes/barcodes. Preserves clean spacing and alphanumeric format.
 */
function sanitizeCode(str?: string | null): string {
  if (!str) return "";
  const cleaned = String(str).trim();
  if (/^(n\/?a|none|null|undefined|-|unknown|nil)$/i.test(cleaned)) {
    return "";
  }
  return cleaned
    .toUpperCase()
    .replace(/[^A-Z0-9\-_./\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

/**
 * Safely parses numbers from LLM responses, stripping currency symbols,
 * commas (e.g. Indian/Western "1,200.50"), percentages, and handling null/undefined/NaN.
 */
function parseSafeNumber(val: any, defaultVal = 0): number {
  if (val === null || val === undefined || val === "") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  const cleaned = String(val)
    .replace(/[₹$,%]/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultVal : num;
}


/**
 * Normalizes raw category string to the strict optical category enum.
 */
function normalizeCategory(rawCat?: string | null): ExtractedBillItem["category"] {
  if (!rawCat) return "FRAME";
  const s = rawCat.toUpperCase().trim();
  if (/SUNGLASS/i.test(s)) return "SUNGLASSES";
  if (/CONTACT.*LENS/i.test(s) || /\bCL\b/i.test(s)) return "CONTACT_LENS";
  if (/LENS/i.test(s)) return "LENS";
  if (/SOLUTION/i.test(s)) return "SOLUTION";
  if (/ACCESSOR/i.test(s)) return "ACCESSORY";
  if (/FRAME/i.test(s)) return "FRAME";
  return "FRAME";
}

/**
 * Robust JSON extractor from Gemini responses, handling markdown code fences,
 * preamble commentary, trailing commas, and arrays.
 */
function extractJsonFromText(text: string): any {
  if (!text || !text.trim()) return {};
  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  // 2. Strip code fences
  const cleanedFences = trimmed
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleanedFences);
  } catch (_) {}

  // 3. Extract outermost JSON object { ... } or array [ ... ]
  const firstBrace = cleanedFences.indexOf("{");
  const lastBrace = cleanedFences.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const slice = cleanedFences.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    } catch (_) {}
  }

  const firstBracket = cleanedFences.indexOf("[");
  const lastBracket = cleanedFences.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const slice = cleanedFences.slice(firstBracket, lastBracket + 1);
      return JSON.parse(slice);
    } catch (_) {}
  }

  // 4. Sanitize trailing commas before brackets (common LLM JSON flaw)
  try {
    const noTrailingCommas = cleanedFences
      .replace(/,\s*([}\]])/g, "$1")
      .trim();
    const fb = noTrailingCommas.indexOf("{");
    const lb = noTrailingCommas.lastIndexOf("}");
    if (fb !== -1 && lb > fb) {
      return JSON.parse(noTrailingCommas.slice(fb, lb + 1));
    }
  } catch (_) {}

  return {};
}

/**
 * Matches an extracted HSN code against the organization's saved categories.
 * Supports exact match, prefix match (4, 6, or 8 digits), and optical statutory standards.
 */
function matchCategoryByHsn(
  hsnCode?: string | null,
  categories: CategoryItem[] = []
): CategoryItem | null {
  if (!hsnCode) return null;
  const cleanHsn = hsnCode.replace(/\D/g, "");
  if (!cleanHsn) return null;

  // 1. Direct match on saved category hsnCode
  const direct = categories.find((c) => {
    if (!c.hsnCode) return false;
    const catHsn = c.hsnCode.replace(/\D/g, "");
    return catHsn === cleanHsn;
  });
  if (direct) return direct;

  // 2. Prefix match (e.g. 9003 matches 90031100 or 90031900)
  const prefix = categories.find((c) => {
    if (!c.hsnCode) return false;
    const catHsn = c.hsnCode.replace(/\D/g, "");
    return cleanHsn.startsWith(catHsn) || catHsn.startsWith(cleanHsn);
  });
  if (prefix) return prefix;

  // 3. Optical Chapter 90 / 33 statutory standards
  // 9003: Frames and mountings for spectacles
  if (cleanHsn.startsWith("9003")) {
    const frameCat = categories.find((c) => c.code === "FRAME");
    if (frameCat) return frameCat;
  }
  // 9004: Sunglasses (900410) or corrective spectacles
  if (cleanHsn.startsWith("900410")) {
    const sunCat = categories.find((c) => c.code === "SUNGLASSES");
    if (sunCat) return sunCat;
  }
  if (cleanHsn.startsWith("9004")) {
    const sunCat = categories.find((c) => c.code === "SUNGLASSES");
    const frameCat = categories.find((c) => c.code === "FRAME");
    if (sunCat) return sunCat;
    if (frameCat) return frameCat;
  }
  // 9001: Ophthalmic lenses (900130: Contact lenses, 900140/900150: Spectacle lenses)
  if (cleanHsn.startsWith("900130")) {
    const clCat = categories.find((c) => c.code === "CONTACT_LENS");
    if (clCat) return clCat;
  }
  if (cleanHsn.startsWith("9001")) {
    const lensCat = categories.find((c) => c.code === "LENS");
    if (lensCat) return lensCat;
  }
  // 3307: Contact lens solutions
  if (cleanHsn.startsWith("3307")) {
    const solCat = categories.find((c) => c.code === "SOLUTION");
    if (solCat) return solCat;
  }

  return null;
}

/**
 * Intelligently extracts optical specifications (brand, model, color, eye size, and clean code)
 * from product names or item descriptions when omitted or incomplete in the raw extraction.
 */
function extractOpticalSpecs(
  name: string,
  rawCode?: string | null,
  rawBrand?: string | null,
  rawModel?: string | null,
  rawColor?: string | null,
  rawSize?: string | null,
  hsnCode?: string | null
): {
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  code: string;
} {
  let brand = sanitizeSpecString(rawBrand);
  let model = sanitizeSpecString(rawModel);
  let color = sanitizeSpecString(rawColor);
  let size = sanitizeSpecString(rawSize);
  let code = sanitizeCode(rawCode);

  // If code is an exact HSN number (e.g. "90031100" or 8 digits), clear it so it doesn't get misidentified as model code
  if (code && (code === (hsnCode || "").replace(/\D/g, "") || /^\d{6,8}$/.test(code))) {
    code = "";
  }

  const cleanText = (name || "")
    .replace(/\bwith\s+case\b/gi, "")
    .replace(/\bcase\b/gi, "")
    .replace(/\bframe\b/gi, "")
    .replace(/\bsunglass(?:es)?\b/gi, "")
    .trim();

  // 1. Eye Size (standard optical frame sizes: 44 to 64 mm)
  if (!size) {
    const sizeMatch = cleanText.match(/\b([4-6]\d)(?:\s*(?:\[\]|[-xX/])\s*\d{2})?\b/);
    if (sizeMatch) {
      size = sizeMatch[1];
    }
  }

  // 2. Color code (e.g. C1, C2, C4, C01, COL 04, Blk, Gold, etc.)
  if (!color) {
    const colorMatch =
      cleanText.match(/\b(C\d{1,3}(?:\s+[A-Za-z]+)?)\b/i) ||
      cleanText.match(/\b(?:COL|COLOR)[\s\-_.:]*([A-Z0-9]+)\b/i) ||
      cleanText.match(/\b(BLK|GLD|SLV|GUN|BRN|TOR|DEMI|MATT|MATTE|BLACK|GOLD|SILVER|BLUE|GREY|GRAY)\b/i);
    if (colorMatch) {
      color = colorMatch[1].toUpperCase();
    }
  }

  // 3. Brand (recognized optical brands or leading uppercase token)
  if (!brand) {
    const brandMatch = cleanText.match(
      /\b(TH|RB|RAY[\s\-]?BAN|OAKLEY|VOGUE|GUCCI|PRADA|TOM[\s\-]?FORD|FASTRACK|TITAN|IDEAL|SCOTT|STEPPER|CARRERA|POLICE|ARMANI|BOSS|VINTAGE)\b/i
    );
    if (brandMatch) {
      brand = brandMatch[1].toUpperCase();
    } else {
      const firstWord = cleanText.split(/\s+/)[0];
      if (firstWord && /^[A-Z]{2,12}$/i.test(firstWord)) {
        brand = firstWord.toUpperCase();
      }
    }
  }

  // 4. Model (e.g. TH 1111, RB 3025, 1111, 4410, M101)
  if (!model) {
    const modelMatch =
      cleanText.match(/\b([A-Z]{1,4}\s*\d{3,5}[A-Z]?)\b/i) ||
      cleanText.match(/\b(\d{3,5}[A-Z]?)\b/);
    if (modelMatch) {
      model = modelMatch[1].toUpperCase();
    }
  }

  // 5. Clean Product Code (structured code for barcode printing and lookup)
  if (!code) {
    const parts = [model || brand, color, size].filter(Boolean);
    if (parts.length >= 2) {
      code = parts.join(" ").toUpperCase();
    } else if (cleanText) {
      code = cleanText.slice(0, 40).toUpperCase();
    }
  }

  return { brand, model, color, size, code };
}

/**
 * Server Action: Extract vendor bill information from uploaded image or PDF.
 */
export async function extractBillDataAction(
  base64Data: string,
  mimeType: string
): Promise<BillExtractionResult> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return {
      success: false,
      error: "Authentication required. Please log in.",
    };
  }

  // 1. Get organization AI configuration & categories from database
  const [aiConfig, orgCategories] = await Promise.all([
    getOrganizationAiConfig(user.organizationId),
    getOrganizationCategories(user.organizationId),
  ]);

  if (!aiConfig.apiKey) {
    return {
      success: false,
      needsKeySetup: true,
      error:
        "No Gemini API Key found for this account. Please connect your Gemini API Key first.",
    };
  }

  // 2. Validate input format
  const supportedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (!supportedMimeTypes.includes(mimeType)) {
    return {
      success: false,
      error: `Unsupported file format: ${mimeType}. Please upload a JPG, PNG, WEBP image or a PDF.`,
    };
  }

  // Clean base64 header if present and resolve true mimeType from header if available
  let resolvedMimeType = mimeType;
  let cleanBase64 = base64Data;
  if (base64Data.startsWith("data:")) {
    const commaIndex = base64Data.indexOf(",");
    if (commaIndex !== -1) {
      const headerPart = base64Data.slice(0, commaIndex);
      cleanBase64 = base64Data.slice(commaIndex + 1);
      const mimeMatch = headerPart.match(/data:([^;]+);base64/);
      if (mimeMatch && mimeMatch[1]) {
        resolvedMimeType = mimeMatch[1].trim();
      }
    }
  } else if (base64Data.includes("base64,")) {
    cleanBase64 = base64Data.split("base64,")[1];
  }

  const categoriesContext = orgCategories && orgCategories.length > 0
    ? orgCategories.map((c) => `- ${c.name} (Code: "${c.code}", HSN: "${c.hsnCode || 'N/A'}", GST: ${c.igstPercent}%)`).join("\n")
    : `- Frames (Code: "FRAME", HSN: "9003", GST: 12%)\n- Sunglasses (Code: "SUNGLASSES", HSN: "9004", GST: 12%)\n- Lenses (Code: "LENS", HSN: "9001", GST: 12%)\n- Contact Lenses (Code: "CONTACT_LENS", HSN: "90013000", GST: 12%)\n- Solutions (Code: "SOLUTION", HSN: "3307", GST: 18%)\n- Accessories (Code: "ACCESSORY", HSN: "90049000", GST: 18%)`;

  const prompt = `You are an expert Indian optical store tax invoice OCR reader.
Extract header details and all purchase line items from this supplier invoice image.
Return ONLY clean JSON (no markdown formatting, no comments, no code fences):
{
  "vendorName": "Supplier / Company Name",
  "vendorGstin": "15-digit GSTIN if present",
  "invoiceNumber": "Invoice / Bill number",
  "invoiceDate": "YYYY-MM-DD format (e.g. convert 03/10/2026 to 2026-10-03)",
  "taxType": "IGST" or "SGST_CGST",
  "items": [
    {
      "productName": "Item description or article name as printed",
      "productCode": "Model number or article code if printed",
      "category": "FRAME" or "SUNGLASSES" or "LENS" or "CONTACT_LENS" or "ACCESSORY" or "SOLUTION",
      "hsnCode": "HSN code if printed",
      "quantity": 1,
      "unitPrice": 100.0,
      "taxableValue": 100.0,
      "lineTotal": 105.0,
      "discountPercent": 0.0,
      "gstPercent": 5.0,
      "brand": "Brand name if printed",
      "model": "Model code/number if printed",
      "color": "Color code if printed",
      "size": "Eye size if printed"
    }
  ]
}

Saved store categories and HSN reference:
${categoriesContext}

CRITICAL RULES:
1. Extract ALL line item rows from top to bottom accurately.
2. unitPrice is the net unit purchase rate before tax.
3. lineTotal is the final line total including tax if printed.
4. Omit empty or null properties (do NOT output fields that are not present on the document).
5. Strictly ZERO hallucination. Return valid JSON only.`;

  try {
    const genAI = new GoogleGenerativeAI(aiConfig.apiKey);

    const rawPrimary = resolveGeminiModel(aiConfig.model);

    // Prioritized list of verified high-availability vision models:
    // 1. Primary configured model (defaults to gemini-3.5-flash-lite)
    // 2. gemini-3.5-flash-lite (Tested 2s latency, 100% operational, zero 503 errors on standard tier)
    // 3. gemini-2.5-flash (Tested 2.6s latency, high availability for existing accounts)
    // 4. gemini-3.6-flash (High capability standard)
    // 5. gemini-3.5-flash (Fast standard flash)
    // 6. gemini-3.7-flash (Next-gen flash OCR)
    // 7. gemini-3.8-flash (Latest flash preview)
    const stableModels = [
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
    ];

    const candidateFallbackModels = [
      rawPrimary,
      ...stableModels,
    ].filter((m, i, arr) => Boolean(m) && !RETIRED_MODELS.includes(m) && arr.indexOf(m) === i);

    let responseText: string | null = null;
    const attemptedErrors: { model: string; error: string }[] = [];

    for (const modelName of candidateFallbackModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.0,
          },
        });

        const generatePromise = model.generateContent([
          {
            inlineData: {
              mimeType: resolvedMimeType,
              data: cleanBase64,
            },
          },
          prompt,
        ]);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout: Model "${modelName}" took longer than 15s`)),
            15000
          )
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);

        responseText = result.response.text();
        if (responseText) {
          // Successfully obtained extraction from model
          break;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        attemptedErrors.push({ model: modelName, error: errMsg });
        console.warn(`Gemini model "${modelName}" failed: ${errMsg}. Trying fallback if available...`);

        // If the error is an invalid API key, no other model will work with this key
        if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
          throw err;
        }

        // On 503 high demand spikes, add a brief 100ms delay before advancing to the next model
        if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("Service Unavailable")) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    }

    if (!responseText) {
      // Analyze all accumulated errors to provide the most accurate, user-friendly diagnosis
      const any403 = attemptedErrors.some((e) =>
        e.error.includes("denied access") || e.error.includes("403") || e.error.includes("PERMISSION_DENIED")
      );
      const all404 =
        attemptedErrors.length > 0 &&
        attemptedErrors.every((e) =>
          e.error.includes("404") || e.error.includes("not found") || e.error.includes("no longer available")
        );
      const any503 = attemptedErrors.some((e) =>
        e.error.includes("503") || e.error.includes("high demand") || e.error.includes("Service Unavailable")
      );
      const anyInvalidKey = attemptedErrors.some((e) =>
        e.error.includes("API key not valid") || e.error.includes("API_KEY_INVALID")
      );
      const anyQuota = attemptedErrors.some((e) =>
        e.error.includes("429") || e.error.includes("RESOURCE_EXHAUSTED") || e.error.includes("quota")
      );

      if (anyInvalidKey) {
        return {
          success: false,
          needsKeySetup: true,
          error: "The configured Gemini API Key is invalid or expired. Please update it in AI Settings.",
        };
      }

      if (any403) {
        return {
          success: false,
          needsKeySetup: true,
          error: "Your Google AI API Key's project has been denied access by Google (403 Forbidden). Please connect a valid Gemini API key from Google AI Studio (https://aistudio.google.com/apikey).",
        };
      }

      if (all404) {
        return {
          success: false,
          needsKeySetup: true,
          error: "The Gemini models on this API key are unavailable or retired. Please update your API key from Google AI Studio.",
        };
      }

      if (anyQuota) {
        return {
          success: false,
          error: "Gemini API rate limit or quota exceeded. Please wait a moment and try again.",
        };
      }

      if (any503) {
        return {
          success: false,
          error: "Google AI servers are currently experiencing temporary high traffic. Please try again in a few moments.",
        };
      }

      const lastErr = attemptedErrors[attemptedErrors.length - 1];
      return {
        success: false,
        error: lastErr ? `AI extraction failed: ${lastErr.error}` : "Empty response from Gemini AI. Please try a clearer bill photo.",
      };
    }

    const parsed: any = extractJsonFromText(responseText);

    // Resilient raw items array detection (handles root array, parsed.items, or nested objects)
    let rawItems: RawGeminiItem[] = [];
    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (Array.isArray(parsed?.items)) {
      rawItems = parsed.items;
    } else if (parsed && typeof parsed === "object") {
      const candidates = [
        parsed.items,
        parsed.lineItems,
        parsed.products,
        parsed.invoice?.items,
        parsed.data?.items,
      ];
      for (const cand of candidates) {
        if (Array.isArray(cand)) {
          rawItems = cand;
          break;
        }
      }
    }

    // 3. Match Vendor against Database
    const existingVendors = await getVendorsByOrganization(user.organizationId);
    let matchedVendorId: string | null = null;
    let finalVendorName = typeof parsed?.vendorName === "string" ? parsed.vendorName.trim() : "";
    let isNewVendor = true;

    const extractedGstin = typeof parsed?.vendorGstin === "string"
      ? parsed.vendorGstin.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : "";

    if (extractedGstin) {
      const matchByGst = existingVendors.find((v) => {
        if (!v.gstin) return false;
        const dbGst = v.gstin.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return dbGst === extractedGstin;
      });
      if (matchByGst) {
        matchedVendorId = matchByGst.id;
        finalVendorName = matchByGst.name;
        isNewVendor = false;
      }
    }

    if (!matchedVendorId && finalVendorName) {
      const normExtracted = finalVendorName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchByName = existingVendors.find((v) => {
        const normDb = v.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normDb === normExtracted ||
          normDb.includes(normExtracted) ||
          normExtracted.includes(normDb)
        );
      });
      if (matchByName) {
        matchedVendorId = matchByName.id;
        finalVendorName = matchByName.name;
        isNewVendor = false;
      }
    }

    // 4. System-Side Math Engine & Row Normalization (Zero-error calculation)
    const taxType: "SGST_CGST" | "IGST" =
      parsed?.taxType === "IGST" ? "IGST" : "SGST_CGST";

    let calculatedTotalAmount = 0;
    let calculatedTotalGst = 0;

    const defaultHsnMap: Record<string, string> = {
      FRAME: "90049000",
      SUNGLASSES: "90041000",
      LENS: "9001",
      CONTACT_LENS: "90013000",
      SOLUTION: "33077000",
      ACCESSORY: "90049000",
    };

    const validCategories = [
      "FRAME",
      "SUNGLASSES",
      "LENS",
      "CONTACT_LENS",
      "ACCESSORY",
      "SOLUTION",
    ];

    const processedItems: ExtractedBillItem[] = rawItems.map((raw, idx) => {
      const qty = Math.max(1, Math.round(parseSafeNumber(raw.quantity, 1)));
      let rawUnitRate = Math.max(0, parseSafeNumber(raw.unitPrice, 0));
      const rawTaxable = parseSafeNumber(raw.taxableValue, 0);
      const rawDiscount = parseSafeNumber(raw.discountPercent, 0);

      // 1. Category Detection: Match via HSN code against organization's saved categories first!
      const rawCat = (raw.category || "").toUpperCase().trim();
      const hsnMatchedCat = matchCategoryByHsn(raw.hsnCode, orgCategories);
      let validCategory: ExtractedBillItem["category"] = "FRAME";
      if (hsnMatchedCat && validCategories.includes(hsnMatchedCat.code)) {
        validCategory = hsnMatchedCat.code as ExtractedBillItem["category"];
      } else if (validCategories.includes(rawCat)) {
        validCategory = rawCat as ExtractedBillItem["category"];
      } else {
        validCategory = normalizeCategory(rawCat);
      }

      // 2. GST Rate Determination: Use row's GST if printed, otherwise default to matched category's rate
      const catObj = orgCategories.find((c) => c.code === validCategory);
      const catGst = catObj ? parseFloat(catObj.igstPercent) || 12 : 12;
      const parsedGst = parseSafeNumber(raw.gstPercent, 0);
      const rawGst = parsedGst > 0 ? parsedGst : catGst;

      // 3. Purchase Cost & Base Price Math Engine:
      // In Indian B2B GST tax invoices (under Section 31 of CGST Act), the printed item rate
      // is virtually always the TAX-EXCLUSIVE base price, with GST added to form the total.
      let baseUnitPrice = 0;
      let purchasePricePerUnit = 0;
      let totalPurchase = 0;

      if (rawTaxable > 0) {
        // Line taxable amount before GST is explicitly available
        baseUnitPrice = Number((rawTaxable / qty).toFixed(2));
        const lineTax = Number(((rawTaxable * rawGst) / 100).toFixed(2));
        totalPurchase = Number((rawTaxable + lineTax).toFixed(2));
        purchasePricePerUnit = Number((totalPurchase / qty).toFixed(2));
      } else if (rawUnitRate > 0) {
        // Effective net taxable unit cost
        baseUnitPrice = rawDiscount > 0
          ? Number((rawUnitRate * (1 - rawDiscount / 100)).toFixed(2))
          : rawUnitRate;
        const lineTax = Number(((baseUnitPrice * qty * rawGst) / 100).toFixed(2));
        totalPurchase = Number(((baseUnitPrice * qty) + lineTax).toFixed(2));
        purchasePricePerUnit = Number((totalPurchase / qty).toFixed(2));
      }

      const totalItemTax = Number(
        Math.max(0, totalPurchase - Number((baseUnitPrice * qty).toFixed(2))).toFixed(2)
      );

      // System computes precise tax splits
      let cgstPercent = 0;
      let cgstAmount = 0;
      let sgstPercent = 0;
      let sgstAmount = 0;
      let igstPercent = 0;
      let igstAmount = 0;

      if (taxType === "IGST") {
        igstPercent = rawGst;
        igstAmount = totalItemTax;
      } else {
        cgstPercent = Number((rawGst / 2).toFixed(2));
        sgstPercent = Number((rawGst / 2).toFixed(2));
        cgstAmount = Number((totalItemTax / 2).toFixed(2));
        sgstAmount = Number((totalItemTax - cgstAmount).toFixed(2));
      }

      calculatedTotalAmount += totalPurchase;
      calculatedTotalGst += totalItemTax;

      // 4. Optical Specifications & Product Code Extraction
      const rawName = sanitizeSpecString(raw.productName) || `Item ${idx + 1}`;
      const specs = extractOpticalSpecs(
        rawName,
        raw.productCode,
        raw.brand,
        raw.model,
        raw.color,
        raw.size,
        raw.hsnCode
      );

      const batchNumber = sanitizeSpecString(raw.batchNumber);
      const expiryDate = sanitizeSpecString(raw.expiryDate);
      const cleanHsn =
        sanitizeSpecString(raw.hsnCode) ||
        catObj?.hsnCode ||
        defaultHsnMap[validCategory] ||
        "90049000";

      return {
        id: crypto.randomUUID(),
        productName: rawName,
        productCode: specs.code,
        category: validCategory,
        hsnCode: cleanHsn,
        quantity: qty,
        unitPrice: baseUnitPrice,
        basePrice: baseUnitPrice,
        gstPercent: rawGst,
        cgstPercent,
        cgstAmount,
        sgstPercent,
        sgstAmount,
        igstPercent,
        igstAmount,
        purchasePrice: purchasePricePerUnit,
        totalPurchasePrice: totalPurchase,
        // STRICTLY 0: Supplier bills never dictate retail selling price. Kept blank in UI.
        retailPrice: 0,
        discountPercent: rawDiscount,
        taxableValue: Number((baseUnitPrice * qty).toFixed(2)),

        // Extended specs
        brand: specs.brand,
        model: specs.model,
        color: specs.color,
        size: specs.size,
        batchNumber,
        expiryDate,
        requiresExpiryTracking: !!(batchNumber || expiryDate),
      };
    });

    const resultData: ExtractedBillData = {
      vendorName: finalVendorName,
      vendorGstin: parsed.vendorGstin?.trim(),
      matchedVendorId,
      isNewVendor,
      invoiceNumber: parsed.invoiceNumber?.trim() || "",
      invoiceDate: normalizeIndianDate(parsed.invoiceDate),
      taxType,
      taxRule: "EXCLUDE",
      items: processedItems,
      rawItemCount: processedItems.length,
      totalAmount: Number(calculatedTotalAmount.toFixed(2)),
      totalGst: Number(calculatedTotalGst.toFixed(2)),
      confidence: processedItems.length > 0 ? "high" : "low",
      notes: parsed.notes?.trim(),
    };

    if (processedItems.length === 0) {
      return {
        success: false,
        error: "No line items could be detected on the document. Please ensure the bill table, item descriptions, and rates are clearly visible and well-lit.",
      };
    }

    return {
      success: true,
      data: resultData,
    };
  } catch (error: any) {
    console.error("extractBillDataAction error:", error);
    const msg = error?.message || "Failed to scan and extract bill data.";

    if (
      msg.includes("API key not valid") ||
      msg.includes("API_KEY_INVALID")
    ) {
      return {
        success: false,
        needsKeySetup: true,
        error:
          "The configured Gemini API Key is invalid or expired. Please update it in AI Settings.",
      };
    }

    if (
      msg.includes("denied access") ||
      msg.includes("403") ||
      msg.includes("PERMISSION_DENIED")
    ) {
      return {
        success: false,
        needsKeySetup: true,
        error:
          "Your Google AI API Key's project has been denied access by Google (403 Forbidden). Please connect a valid Gemini API key from Google AI Studio (https://aistudio.google.com/apikey).",
      };
    }

    if (
      msg.includes("404") ||
      msg.includes("not found") ||
      msg.includes("no longer available")
    ) {
      return {
        success: false,
        needsKeySetup: true,
        error:
          "The Gemini model is unavailable on this API key. Please update your API key or model in AI Settings.",
      };
    }

    if (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("quota")
    ) {
      return {
        success: false,
        error:
          "Gemini API rate limit or quota exceeded. Please wait a moment and try again.",
      };
    }

    return {
      success: false,
      error: `AI extraction failed: ${msg}`,
    };
  }
}
