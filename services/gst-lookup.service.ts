import { db } from "@/lib/drizzle";
import { customerGstinCache } from "@/db/schema/addons";
import { eq } from "drizzle-orm";
import { isValidGSTINChecksum, extractGSTINMetadata } from "@/utils/gstin";

export interface TaxpayerLookupResult {
  success: boolean;
  error?: string;
  data?: {
    gstin: string;
    legalName: string;
    tradeName: string;
    status: string; // e.g. "Active", "Cancelled", "Suspended"
    taxpayerType: string;
    pan: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    isCached: boolean;
  };
}

/**
 * Normalizes address parts into a single coherent street address line.
 */
function buildAddressLine(addr: any): string {
  if (!addr) return "";
  const parts = [
    addr.bno ? (addr.bno.toLowerCase().includes("shop") || addr.bno.toLowerCase().includes("no") ? addr.bno : `Shop/Plot ${addr.bno}`) : "",
    addr.bnm,
    addr.flno ? `Floor ${addr.flno}` : "",
    addr.st,
    addr.loc,
  ].filter(Boolean);

  return parts.join(", ").trim();
}

/**
 * 3-Tier GSTIN Lookup Service:
 * Tier 1: 0ms Luhn Modulo 36 offline checksum validation.
 * Tier 2: Instant PostgreSQL cache check (customer_gstin_cache) for zero latency & ₹0 cost.
 * Tier 3: Live Appyflow API execution with error handling and automatic cache persistence.
 */
export async function lookupGSTIN(gstinInput: string): Promise<TaxpayerLookupResult> {
  const cleanGstin = (gstinInput || "").trim().toUpperCase();

  // Tier 1: Offline format & checksum validation
  if (!cleanGstin || cleanGstin.length !== 15) {
    return {
      success: false,
      error: "GSTIN must be exactly 15 characters.",
    };
  }

  if (!isValidGSTINChecksum(cleanGstin)) {
    return {
      success: false,
      error: "Invalid GSTIN checksum. Please check for typographical errors.",
    };
  }

  const metadata = extractGSTINMetadata(cleanGstin);

  // Tier 2: Check PostgreSQL local cache
  try {
    const [cached] = await db
      .select()
      .from(customerGstinCache)
      .where(eq(customerGstinCache.gstin, cleanGstin))
      .limit(1);

    if (cached) {
      return {
        success: true,
        data: {
          gstin: cached.gstin,
          legalName: cached.legalName,
          tradeName: cached.tradeName || cached.legalName,
          status: cached.status,
          taxpayerType: cached.taxpayerType || metadata?.entityType || "Regular",
          pan: metadata?.pan || "",
          address: cached.addressLine || "",
          city: cached.city || "",
          state: cached.state || metadata?.stateName || "",
          stateCode: cached.stateCode || metadata?.stateCode || "",
          pincode: cached.pincode || "",
          isCached: true,
        },
      };
    }
  } catch (cacheErr) {
    console.error("[GST Lookup Service] Cache read error:", cacheErr);
    // Proceed to Tier 3 on cache failure
  }

  // Tier 3: Live Appyflow API Call
  const apiKey = process.env.APPYFLOW_KEY_SECRET;
  if (!apiKey) {
    return {
      success: false,
      error: "Appyflow API key is not configured on the server.",
    };
  }

  try {
    const endpoint = `https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(cleanGstin)}&key_secret=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Appyflow returned HTTP status ${response.status}.`,
      };
    }

    const payload = await response.json();

    if (payload.error || !payload.taxpayerInfo) {
      return {
        success: false,
        error: payload.message || "Taxpayer details not found in government registry.",
      };
    }

    const tp = payload.taxpayerInfo;
    const addr = tp.pradr?.addr || {};

    const legalName = (tp.lgnm || "").trim();
    const tradeName = (tp.tradeNam || legalName || "").trim();
    const status = (tp.sts || "Active").trim();
    const taxpayerType = (tp.ctb || tp.dty || metadata?.entityType || "Regular").trim();
    const pan = (tp.panNo || tp.pan || metadata?.pan || "").trim();
    const addressLine = buildAddressLine(addr);
    const city = (addr.dst || addr.city || "").trim();
    const state = (addr.stcd || metadata?.stateName || "").trim();
    const stateCode = (tp.stjCd || metadata?.stateCode || cleanGstin.substring(0, 2)).trim();
    const pincode = (addr.pncd || "").trim();

    // Cache the verified record into customer_gstin_cache
    try {
      await db
        .insert(customerGstinCache)
        .values({
          gstin: cleanGstin,
          legalName: legalName || tradeName || "Unknown Entity",
          tradeName: tradeName || legalName || null,
          status,
          taxpayerType,
          addressLine: addressLine || null,
          city: city || null,
          state: state || null,
          stateCode: stateCode || null,
          pincode: pincode || null,
          rawResponse: payload,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: customerGstinCache.gstin,
          set: {
            legalName: legalName || tradeName || "Unknown Entity",
            tradeName: tradeName || legalName || null,
            status,
            taxpayerType,
            addressLine: addressLine || null,
            city: city || null,
            state: state || null,
            stateCode: stateCode || null,
            pincode: pincode || null,
            rawResponse: payload,
            updatedAt: new Date(),
          },
        });
    } catch (cacheSaveErr) {
      console.error("[GST Lookup Service] Failed to save in local cache:", cacheSaveErr);
    }

    return {
      success: true,
      data: {
        gstin: cleanGstin,
        legalName,
        tradeName,
        status,
        taxpayerType,
        pan,
        address: addressLine,
        city,
        state,
        stateCode,
        pincode,
        isCached: false,
      },
    };
  } catch (apiErr: any) {
    console.error("[GST Lookup Service] Network / API error:", apiErr);
    return {
      success: false,
      error: apiErr?.message || "Failed to reach GST verification service.",
    };
  }
}
