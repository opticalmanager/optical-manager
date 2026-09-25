"use server";

import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationAiConfig } from "@/services/organization.service";
import { getVendorsByOrganization } from "@/services/vendor.service";
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

function sanitizeCode(str?: string): string {
  if (!str) return "";
  return str.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

function generateSmartProductCode(
  category: string,
  brand?: string,
  index: number = 1
): string {
  const catPrefix =
    category === "FRAME"
      ? "FRM"
      : category === "LENS"
      ? "LNS"
      : category === "CONTACT_LENS"
      ? "CL"
      : category === "SOLUTION"
      ? "SOL"
      : "ACC";

  const brandPrefix = brand
    ? brand.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
    : "GEN";

  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${catPrefix}-${brandPrefix}-${randomSuffix}`;
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

  // 1. Get organization AI configuration
  const aiConfig = await getOrganizationAiConfig(user.organizationId);
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
      "productName": "Full name or description of optical product",
      "productCode": "SKU, Item Code, or Model number if printed",
      "category": "FRAME" or "LENS" or "CONTACT_LENS" or "ACCESSORY" or "SOLUTION",
      "hsnCode": "HSN/SAC code if present (e.g. 90049000, 9003, 9001)",
      "quantity": 1,
      "unitPrice": 100.0,
      "gstPercent": 12.0,
      "brand": "Brand name if detectable (e.g. Ray-Ban, Essilor, Bausch+Lomb)",
      "model": "Model name / code if present",
      "color": "Color code or name if present",
      "size": "Size or dimensions if present (e.g. 52-18-140)",
      "batchNumber": "Batch or Lot number if present",
      "expiryDate": "YYYY-MM-DD if expiry date is printed"
    }
  ]
}

Classification rules:
- Frames/Sunglasses (Ray-Ban, Carrera, Oakley, Vogue, Titan, Fastrack, metal/plastic frames) -> category "FRAME"
- Ophthalmic lenses (Single Vision, Progressive, Bifocal, Blue Cut, Anti-Glare, Crizal, 1.56, 1.61, 1.67) -> category "LENS"
- Contact lenses (Acuvue, Soflens, PureVision, Biofinity, Dailies, Monthly, Toric) -> category "CONTACT_LENS"
- Lens solutions / eye drops (Renu, Opti-Free, Biotrue, Complete) -> category "SOLUTION"
- Cases, cloths, nose pads, chains, cords, cleaners -> category "ACCESSORY"

Extraction instructions:
- unitPrice is the rate/base price per unit BEFORE taxes.
- gstPercent is the total GST rate (e.g. 12, 18, 5, 0).
- Do not invent non-existent items. Extract only real items printed on the document.`;

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
            temperature: 0.1,
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

    let parsed: RawGeminiResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Fallback: attempt to strip any inadvertent markdown backticks
      const cleanJson = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    }

    // 3. Match Vendor against Database
    const existingVendors = await getVendorsByOrganization(user.organizationId);
    let matchedVendorId: string | null = null;
    let finalVendorName = parsed.vendorName?.trim() || "";
    let isNewVendor = true;

    const extractedGstin = parsed.vendorGstin
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
      parsed.taxType === "IGST" ? "IGST" : "SGST_CGST";

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    let calculatedTotalAmount = 0;
    let calculatedTotalGst = 0;

    const processedItems: ExtractedBillItem[] = rawItems.map((raw, idx) => {
      const qty = Math.max(1, Math.round(Number(raw.quantity) || 1));
      const unitRate = Math.max(0, Number(raw.unitPrice) || 0);
      const rawGst = Math.max(0, Number(raw.gstPercent) || 12);

      // System computes precise tax splits
      let cgstPercent = 0;
      let cgstAmount = 0;
      let sgstPercent = 0;
      let sgstAmount = 0;
      let igstPercent = 0;
      let igstAmount = 0;

      if (taxType === "IGST") {
        igstPercent = rawGst;
        igstAmount = Number(((unitRate * qty * igstPercent) / 100).toFixed(2));
      } else {
        cgstPercent = Number((rawGst / 2).toFixed(2));
        sgstPercent = Number((rawGst / 2).toFixed(2));
        cgstAmount = Number(((unitRate * qty * cgstPercent) / 100).toFixed(2));
        sgstAmount = Number(((unitRate * qty * sgstPercent) / 100).toFixed(2));
      }

      const totalItemTax = Number(
        (cgstAmount + sgstAmount + igstAmount).toFixed(2)
      );
      const totalPurchase = Number(
        (unitRate * qty + totalItemTax).toFixed(2)
      );
      const purchasePricePerUnit = Number(
        (unitRate + totalItemTax / qty).toFixed(2)
      );
      const retailPriceEstimate = Math.round(purchasePricePerUnit * 1.5);

      calculatedTotalAmount += totalPurchase;
      calculatedTotalGst += totalItemTax;

      const validCategory: ExtractedBillItem["category"] = [
        "FRAME",
        "LENS",
        "CONTACT_LENS",
        "ACCESSORY",
        "SOLUTION",
      ].includes(raw.category as any)
        ? (raw.category as ExtractedBillItem["category"])
        : "FRAME";

      const cleanCode =
        sanitizeCode(raw.productCode) ||
        generateSmartProductCode(validCategory, raw.brand, idx + 1);

      return {
        id: crypto.randomUUID(),
        productName:
          raw.productName?.trim() || `${raw.brand || "Optical"} Product ${idx + 1}`,
        productCode: cleanCode,
        category: validCategory,
        hsnCode: raw.hsnCode?.trim() || (validCategory === "FRAME" ? "90049000" : "9001"),
        quantity: qty,
        unitPrice: unitRate,
        basePrice: unitRate,
        gstPercent: rawGst,
        cgstPercent,
        cgstAmount,
        sgstPercent,
        sgstAmount,
        igstPercent,
        igstAmount,
        purchasePrice: purchasePricePerUnit,
        totalPurchasePrice: totalPurchase,
        retailPrice: retailPriceEstimate,

        // Extended specs
        brand: raw.brand?.trim(),
        model: raw.model?.trim(),
        color: raw.color?.trim(),
        size: raw.size?.trim(),
        batchNumber: raw.batchNumber?.trim(),
        expiryDate: raw.expiryDate?.trim(),
        requiresExpiryTracking: !!(raw.batchNumber || raw.expiryDate),
      };
    });

    const resultData: ExtractedBillData = {
      vendorName: finalVendorName,
      vendorGstin: parsed.vendorGstin?.trim(),
      matchedVendorId,
      isNewVendor,
      invoiceNumber: parsed.invoiceNumber?.trim() || "",
      invoiceDate:
        parsed.invoiceDate?.trim() ||
        new Date().toISOString().split("T")[0],
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
