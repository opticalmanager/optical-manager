"use server";

import { getCurrentUser } from "@/services/auth.service";
import { extractBillData } from "@/services/bill-scan.service";
import type { BillExtractionResult } from "@/types/bill-scan";

/**
 * Server Action: Extract vendor bill information from uploaded image or PDF.
 * Delegates to the unified pure service layer in services/bill-scan.service.ts.
 * Wrapped with strict top-level error boundaries.
 */
export async function extractBillDataAction(
  base64Data: string,
  mimeType: string
): Promise<BillExtractionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return {
        success: false,
        error: "Authentication required. Please log in.",
      };
    }

    return await extractBillData({
      base64Data,
      mimeType,
      organizationId: user.organizationId,
    });
  } catch (error: any) {
    console.error("extractBillDataAction error:", error);
    return {
      success: false,
      error:
        error?.message ||
        "An unexpected error occurred while processing the bill. Please try again.",
    };
  }
}
