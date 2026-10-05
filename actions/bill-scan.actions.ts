"use server";

import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationAiConfig } from "@/services/organization.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
import { getOrganizationCategories, CategoryItem } from "@/services/category.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
 * Sanitizes product codes/barcodes. Returns empty string if not a real code.
 */
function sanitizeCode(str?: string | null): string {
  if (!str) return "";
  const cleaned = String(str).trim();
  if (/^(n\/?a|none|null|undefined|-|unknown|nil)$/i.test(cleaned)) {
    return "";
  }
  return cleaned.toUpperCase().replace(/[^A-Z0-9\-_./,]/g, "").slice(0, 50);
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

  // Clean base64 header if present
  const cleanBase64 = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const categoriesContext = orgCategories && orgCategories.length > 0
    ? orgCategories.map((c) => `- ${c.name} (Code: "${c.code}", HSN: "${c.hsnCode || 'N/A'}", GST: ${c.igstPercent}%)`).join("\n")
    : `- Frames (Code: "FRAME", HSN: "9003", GST: 12%)\n- Sunglasses (Code: "SUNGLASSES", HSN: "9004", GST: 12%)\n- Lenses (Code: "LENS", HSN: "9001", GST: 12%)\n- Contact Lenses (Code: "CONTACT_LENS", HSN: "90013000", GST: 12%)\n- Solutions (Code: "SOLUTION", HSN: "3307", GST: 18%)\n- Accessories (Code: "ACCESSORY", HSN: "90049000", GST: 18%)`;

  const prompt = `You are an expert optical retail bill & tax invoice reader for Indian optical stores.
Extract header details and all purchase line items from this supplier bill/invoice.
Return ONLY valid JSON matching this schema without any markdown formatting or code blocks:
{
  "vendorName": "Company / Supplier Name",
  "vendorGstin": "15-digit Indian GSTIN if present",
  "invoiceNumber": "Invoice / Bill / Challan / Memo number",
  "invoiceDate": "YYYY-MM-DD format (convert dates like 24/09/2026 or 24-Sep-2026 to YYYY-MM-DD)",
  "taxType": "SGST_CGST" (if intra-state, CGST+SGST) or "IGST" (if inter-state IGST),
  "items": [
    {
      "productName": "Full name or description of optical product as printed",
      "productCode": "SKU, Barcode, Article code, or Item Code if printed. If no separate product code column exists, but Description contains a code (e.g. 'SI-20050,50-15-135,F900'), extract that full code string here. Otherwise null",
      "category": "FRAME" or "SUNGLASSES" or "LENS" or "CONTACT_LENS" or "ACCESSORY" or "SOLUTION",
      "hsnCode": "HSN/SAC code if printed (e.g. 90031100, 90031900, 90041000, 90015000, 33077000)",
      "quantity": 1,
      "unitPrice": 100.0,
      "discountPercent": 0.0,
      "taxableValue": 100.0,
      "gstPercent": 12.0,
      "brand": "Brand name if printed or recognizable (e.g. Ray-Ban, Polaroid, Essilor, Bausch+Lomb), otherwise null",
      "model": "Model name / code if printed, otherwise null",
      "color": "Color code or name ONLY if printed, otherwise null",
      "size": "Size or dimensions ONLY if printed (e.g. 52-18-140), otherwise null",
      "batchNumber": "Batch or Lot number if printed (common on lenses/solutions), otherwise null",
      "expiryDate": "YYYY-MM-DD if expiry date is printed, otherwise null"
    }
  ]
}

Saved store categories and HSN reference:
${categoriesContext}

CRITICAL EXTRACTION RULES (STRICT INDUSTRIAL ACCURACY):
1. ZERO HALLUCINATION: Extract ONLY data explicitly printed on the document. NEVER invent, extrapolate, or guess values.
2. NO RETAIL PRICES: Supplier invoices NEVER contain retail selling prices / MRP. Do NOT extract or guess retail prices.
3. PRODUCT CODES:
   - If an explicit column for Product Code / Item Code / SKU / Article exists, extract it as "productCode".
   - If NO dedicated product code column exists on the bill, but the item description / "Description of Goods" contains a structured code (e.g. "SI-20050,50-15-135,F900" or model number with dimensions/color), extract the complete code string as "productCode", and also use it in "productName".
   - NEVER fabricate synthetic codes not printed on the document.
4. LINE ITEM PRICE:
   - Extract the final net price printed on the bill for the item (e.g. after any line trade discount). In supplier invoices where the line shows "Price" or "Amount" (e.g. 3240.00), extract that final net unit price as "unitPrice".
   - Do NOT multiply by quantity for unitPrice.
5. HSN CODE & CATEGORY:
   - Always extract the exact HSN/SAC code printed for each line item (e.g. 90031100, 90031900, 90041000, 90015000).
   - Match the HSN code and item description to the most appropriate store category from the list above.
6. SPECIFICATIONS: If color, size, model, batch, or expiry are printed in the description or bill columns, extract them. If not printed, return null. Never output "N/A", "null", or "none".`;

  try {
    const genAI = new GoogleGenerativeAI(aiConfig.apiKey);

    // List of model candidates to try: primary model first, followed by resilient fallbacks
    const primaryModel = aiConfig.model?.trim() || "gemini-3.5-flash";
    const candidateFallbackModels = [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    const fallbackList = candidateFallbackModels.filter((m) => m !== primaryModel);
    const modelsToTry = [primaryModel, ...fallbackList];

    let responseText: string | null = null;
    const attemptedErrors: { model: string; error: string }[] = [];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.0,
          },
        });

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          prompt,
        ]);

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
      }
    }

    if (!responseText) {
      // Analyze all accumulated errors to provide the most accurate, user-friendly diagnosis
      const any403 = attemptedErrors.some((e) =>
        e.error.includes("denied access") || e.error.includes("403") || e.error.includes("PERMISSION_DENIED")
      );
      const any404 = attemptedErrors.some((e) =>
        e.error.includes("404") || e.error.includes("not found") || e.error.includes("no longer available")
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

      if (any404) {
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

      const lastErr = attemptedErrors[attemptedErrors.length - 1];
      return {
        success: false,
        error: lastErr ? `AI extraction failed: ${lastErr.error}` : "Empty response from Gemini AI. Please try a clearer bill photo.",
      };
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback: strip markdown code fences and whitespace
      const cleanJson = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", responseText);
        parsed = {};
      }
    }

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
      const qty = Math.max(1, Math.round(Number(raw.quantity) || 1));
      let unitRate = Math.max(0, Number(raw.unitPrice) || 0);

      // If unitRate was not extracted or 0, but line taxable value is present
      if ((!unitRate || unitRate === 0) && Number(raw.taxableValue) > 0) {
        unitRate = Number((Number(raw.taxableValue) / qty).toFixed(2));
      } else if (raw.taxableValue && Number(raw.taxableValue) > 0 && raw.discountPercent && Number(raw.discountPercent) > 0) {
        // Effective net taxable unit cost after trade discount
        unitRate = Number((Number(raw.taxableValue) / qty).toFixed(2));
      }

      // 1. Category Detection: Match via HSN code against organization's saved categories first!
      const rawCat = (raw.category || "").toUpperCase().trim();
      const hsnMatchedCat = matchCategoryByHsn(raw.hsnCode, orgCategories);
      let validCategory: ExtractedBillItem["category"] = "FRAME";
      if (hsnMatchedCat && validCategories.includes(hsnMatchedCat.code)) {
        validCategory = hsnMatchedCat.code as ExtractedBillItem["category"];
      } else if (validCategories.includes(rawCat)) {
        validCategory = rawCat as ExtractedBillItem["category"];
      } else {
        validCategory = "FRAME";
      }

      // 2. GST Rate Determination: Use row's GST if printed, otherwise default to matched category's rate
      const catObj = orgCategories.find((c) => c.code === validCategory);
      const catGst = catObj ? parseFloat(catObj.igstPercent) || 12 : 12;
      const rawGst = Number(raw.gstPercent) > 0 ? Number(raw.gstPercent) : catGst;

      // 3. Purchase Cost & Base Price Math:
      // The final net price extracted from the bill is the Purchase Cost per unit (inclusive of any trade discounts)
      const purchasePricePerUnit = unitRate;
      const totalPurchase = Number((purchasePricePerUnit * qty).toFixed(2));
      const baseUnitPrice = rawGst > 0
        ? Number((purchasePricePerUnit / (1 + rawGst / 100)).toFixed(2))
        : purchasePricePerUnit;
      const totalItemTax = Number(Math.max(0, totalPurchase - Number((baseUnitPrice * qty).toFixed(2))).toFixed(2));

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

      // 4. Product code: If not explicitly in a product code column, pick from description if structured
      let cleanCode = sanitizeCode(raw.productCode);
      if (!cleanCode && raw.productName) {
        const trimmedName = String(raw.productName).trim();
        if (/^[A-Z0-9\-_./,]{4,}$/i.test(trimmedName) || /^[A-Z0-9\-_]+[,;\s]+[0-9\-]+/i.test(trimmedName)) {
          cleanCode = sanitizeCode(trimmedName);
        }
      }

      // Optical Specs: sanitize out "N/A", "none", "null" strings
      const brand = sanitizeSpecString(raw.brand);
      const model = sanitizeSpecString(raw.model);
      const color = sanitizeSpecString(raw.color);
      const size = sanitizeSpecString(raw.size);
      const batchNumber = sanitizeSpecString(raw.batchNumber);
      const expiryDate = sanitizeSpecString(raw.expiryDate);
      const cleanHsn = sanitizeSpecString(raw.hsnCode) || catObj?.hsnCode || defaultHsnMap[validCategory] || "90049000";

      const fallbackName = [brand, model, validCategory].filter(Boolean).join(" ");
      const productName = sanitizeSpecString(raw.productName) || fallbackName || `Item ${idx + 1}`;

      return {
        id: crypto.randomUUID(),
        productName,
        productCode: cleanCode,
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
        // STRICTLY 0: Supplier bills never dictate retail selling price. Field is kept blank in UI.
        retailPrice: 0,
        discountPercent: Number(raw.discountPercent) || 0,
        taxableValue: Number((baseUnitPrice * qty).toFixed(2)),

        // Extended specs
        brand,
        model,
        color,
        size,
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
