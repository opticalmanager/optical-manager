import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { purchaseOrderSchema } from "@/utils/validators";
import { createPurchaseOrder } from "@/services/purchase.service";
import { createVendor, updateVendor, getVendorsByOrganization } from "@/services/vendor.service";
import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/purchases
 * Permanent, immutable REST endpoint for recording purchase orders and saving drafts.
 * Fully immune to Next.js "Failed to find Server Action" hash invalidations.
 * Features automatic shop resolution for multi-branch owners and resilient number parsing.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Please log in." },
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

    // 1. Resolve Target Shop ID (handles owners, active context, or payload shopId)
    let targetShopId = user.shopId;
    if (!targetShopId && body.shopId) {
      const [shop] = await db
        .select()
        .from(shops)
        .where(
          and(
            eq(shops.id, body.shopId),
            eq(shops.organizationId, user.organizationId)
          )
        )
        .limit(1);
      if (shop) targetShopId = shop.id;
    }

    if (!targetShopId && user.role === "OWNER") {
      const [firstShop] = await db
        .select()
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);
      if (firstShop) targetShopId = firstShop.id;
    }

    if (!targetShopId) {
      return NextResponse.json(
        { success: false, message: "Missing shop session. Please select an active shop." },
        { status: 400 }
      );
    }

    // 2. Resilient Sanitization of All Line Items & Numbers
    const cleanStrNum = (v: any, def = 0): number => {
      if (typeof v === "number") return isNaN(v) ? def : v;
      if (!v) return def;
      const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? def : n;
    };

    const sanitizedItems = (body.items || []).map((it: any, idx: number) => {
      const qty = Math.max(1, Math.round(cleanStrNum(it.quantity, 1)));
      const unitPrice = Math.max(0, cleanStrNum(it.unitPrice, 0));
      const basePrice = Math.max(0, cleanStrNum(it.basePrice, unitPrice));
      const purchasePrice = Math.max(0, cleanStrNum(it.purchasePrice, unitPrice));
      const totalPurchasePrice = Math.max(0, cleanStrNum(it.totalPurchasePrice, purchasePrice * qty));
      const retailPrice = Math.max(0, cleanStrNum(it.retailPrice, 0));

      return {
        inventoryId: it.inventoryId || null,
        serialNumber: idx + 1,
        productName: (it.productName || it.productCode || `Item #${idx + 1}`).trim(),
        productCode: it.productCode ? String(it.productCode).trim() : null,
        category: it.category ? String(it.category).trim() : "FRAME",
        details: it.details ? String(it.details).trim() : null,
        unitPrice,
        basePrice,
        hsnCode: it.hsnCode ? String(it.hsnCode).trim() : null,
        gstPercent: cleanStrNum(it.gstPercent, 0),
        cgstPercent: cleanStrNum(it.cgstPercent, 0),
        cgstAmount: cleanStrNum(it.cgstAmount, 0),
        sgstPercent: cleanStrNum(it.sgstPercent, 0),
        sgstAmount: cleanStrNum(it.sgstAmount, 0),
        igstPercent: cleanStrNum(it.igstPercent, 0),
        igstAmount: cleanStrNum(it.igstAmount, 0),
        purchasePrice,
        quantity: qty,
        totalPurchasePrice,
        retailPrice,
      };
    });

    const sanitizedPayload = {
      purchaseDate: body.purchaseDate || new Date().toISOString().split("T")[0],
      vendorId: body.vendorId || null,
      vendorName: (body.vendorName || "").trim() || "Supplier",
      vendorGstin: (body.vendorGstin || "").trim() || undefined,
      purchaseNumber: (body.purchaseNumber || "").trim() || `PUR-${Date.now()}`,
      taxRule: body.taxRule === "INCLUDE" ? "INCLUDE" : "EXCLUDE",
      taxType: body.taxType || "SGST_CGST",
      roundOff: cleanStrNum(body.roundOff, 0),
      notes: body.notes ? String(body.notes).trim() : null,
      status: body.status === "DRAFT" ? "DRAFT" : "COMPLETED",
      items: sanitizedItems,
    };

    const validated = purchaseOrderSchema.safeParse(sanitizedPayload);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const payload = validated.data;

    // 3. Auto-create or resolve vendor
    let resolvedVendorId = payload.vendorId || null;
    const cleanVendorName = payload.vendorName.trim();
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
            shopId: targetShopId,
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

    // 4. Create Purchase Order in Database
    const result = await createPurchaseOrder({
      shopId: targetShopId,
      organizationId: user.organizationId,
      vendorId: resolvedVendorId,
      vendorName: cleanVendorName,
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
        : `Purchase bill #${payload.purchaseNumber} recorded and inventory updated (${payload.items.length} items).`,
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
