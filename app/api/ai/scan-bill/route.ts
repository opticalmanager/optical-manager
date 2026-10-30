import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { extractBillData } from "@/services/bill-scan.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ai/scan-bill
 * Dedicated, immutable REST endpoint for AI invoice scanning & OCR.
 * Completely immune to Next.js Server Action bundling, module evaluation failures,
 * or synthetic action hash mismatches.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please log in.",
        },
        { status: 401 }
      );
    }

    let base64Data = "";
    let mimeType = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data." },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      mimeType = file.type || "application/pdf";
    } else {
      const body = await req.json();
      base64Data = body.base64Data || "";
      mimeType = body.mimeType || "";
    }

    if (!base64Data) {
      return NextResponse.json(
        {
          success: false,
          error: "No bill document data was received. Please re-select the file.",
        },
        { status: 400 }
      );
    }

    const result = await extractBillData({
      base64Data,
      mimeType,
      organizationId: user.organizationId,
    });

    if (!result.success) {
      if (result.needsKeySetup) {
        return NextResponse.json(
          {
            success: false,
            needsKeySetup: true,
            error: result.error,
          },
          { status: 200 }
        );
      }

      const isQuota =
        result.error?.includes("rate limit") ||
        result.error?.includes("quota") ||
        result.error?.includes("429");

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: isQuota ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error("POST /api/ai/scan-bill unexpected exception:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "An unexpected server error occurred during bill OCR extraction.",
      },
      { status: 500 }
    );
  }
}
