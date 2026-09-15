import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { checkProductCodeExists } from "@/services/inventory.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();
    const excludeId = searchParams.get("excludeId")?.trim() || undefined;
    const vendorName =
      searchParams.get("vendor")?.trim() ||
      searchParams.get("vendorName")?.trim() ||
      undefined;

    if (!code) {
      return NextResponse.json({ exists: false });
    }

    const targetScopeId = user.shopId || user.organizationId;
    const isShopScope = Boolean(user.shopId);
    const exists = await checkProductCodeExists(
      targetScopeId,
      code,
      excludeId,
      isShopScope,
      vendorName
    );
    return NextResponse.json({ exists });
  } catch (error: any) {
    console.error("Error in check-code API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
