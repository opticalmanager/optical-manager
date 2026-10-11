import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { purchaseOrderSchema } from "@/utils/validators";
import { createPurchaseOrder } from "@/services/purchase.service";
import { createVendor, updateVendor, getVendorsByOrganization } from "@/services/vendor.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/purchases
 * Immutable REST endpoint for recording purchase orders and saving drafts.
 * Protects against Next.js "Failed to find Server Action" hash-mismatch errors
 * during deployments, background revalidations, and multi-page bill entry sessions.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized or missing shop session." },
        { status: 401 }
      );
    }

    if (user.permissions && user.permissions.purchases === false) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to record purchases." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = purchaseOrderSchema.safeParse(body);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const payload = validated.data;

    // Auto-create or resolve vendor if vendorId is missing or vendor doesn't exist yet
    let resolvedVendorId = payload.vendorId || null;
    const cleanVendorName = (payload.vendorName || "").trim();
    const cleanVendorGstin = (payload.vendorGstin || "").trim();

    if (cleanVendorName) {
      const orgVendors = await getVendorsByOrganization(user.organizationId);
      const matchedVendor = orgVendors.find(
        (v) =>
          (resolvedVendorId && v.id === resolvedVendorId) ||
          v.name.toLowerCase() === cleanVendorName.toLowerCase() ||
          (cleanVendorGstin && v.gstin && v.gstin.toUpperCase() === cleanVendorGstin.toUpperCase())
      );

      if (matchedVendor) {
        resolvedVendorId = matchedVendor.id;
        if (!matchedVendor.gstin && cleanVendorGstin) {
          try {
            await updateVendor(matchedVendor.id, user.organizationId, { gstin: cleanVendorGstin });
          } catch (e) {
            console.warn("Could not backfill vendor GSTIN:", e);
          }
        }
      } else {
        try {
          const createdVendor = await createVendor({
            shopId: user.shopId,
            organizationId: user.organizationId,
            name: cleanVendorName,
            gstin: cleanVendorGstin || undefined,
            isActive: true,
          });
          resolvedVendorId = createdVendor.id;
        } catch (vErr) {
          console.warn("Failed to auto-create vendor:", vErr);
        }
      }
    }

    const isDraft = payload.status === "DRAFT";

    const result = await createPurchaseOrder({
      shopId: user.shopId,
      organizationId: user.organizationId,
      vendorId: resolvedVendorId,
      vendorName: cleanVendorName || payload.vendorName,
      purchaseNumber: payload.purchaseNumber,
      purchaseDate: payload.purchaseDate,
      status: isDraft ? "DRAFT" : "COMPLETED",
      taxRule: payload.taxRule,
      taxType: payload.taxType,
      roundOff: payload.roundOff,
      notes: payload.notes,
      createdBy: user.id,
      items: payload.items.map((item) => ({
        inventoryId: item.inventoryId || null,
        serialNumber: item.serialNumber,
        productName: item.productName,
        productCode: item.productCode || null,
        category: item.category || null,
        details: item.details || null,
        unitPrice: item.unitPrice,
        basePrice: item.basePrice,
        hsnCode: item.hsnCode || null,
        gstPercent: item.gstPercent,
        cgstPercent: item.cgstPercent,
        cgstAmount: item.cgstAmount,
        sgstPercent: item.sgstPercent,
        sgstAmount: item.sgstAmount,
        igstPercent: item.igstPercent,
        igstAmount: item.igstAmount,
        purchasePrice: item.purchasePrice,
        quantity: item.quantity,
        totalPurchasePrice: item.totalPurchasePrice,
        retailPrice: item.retailPrice,
      })),
    });

    revalidatePath("/shop/purchases");
    revalidatePath("/shop/inventory");

    return NextResponse.json({
      success: true,
      message: isDraft
        ? `Purchase draft #${payload.purchaseNumber} saved successfully.`
        : `Purchase bill #${payload.purchaseNumber} recorded and inventory updated.`,
      purchaseId: result.order.id,
    });
  } catch (error: any) {
    console.error("Error creating purchase via API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to record purchase order.",
      },
      { status: 500 }
    );
  }
}
