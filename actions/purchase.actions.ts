"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  purchaseOrderSchema,
  vendorSchema,
  PurchaseOrderFormValues,
  VendorFormValues,
} from "@/utils/validators";
import { createPurchaseOrder } from "@/services/purchase.service";
import { createVendor, getVendorsByOrganization } from "@/services/vendor.service";

/**
 * Server action to create and finalize a purchase order.
 * Updates stock levels and records stock movements.
 */
export async function createPurchaseAction(data: PurchaseOrderFormValues) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return {
        success: false,
        message: "You do not have permission to record purchases.",
      };
    }

    const validated = purchaseOrderSchema.safeParse(data);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Validation failed";
      return { success: false, message: firstError };
    }

    const payload = validated.data;

    const result = await createPurchaseOrder({
      shopId: user.shopId,
      organizationId: user.organizationId,
      vendorId: payload.vendorId || null,
      vendorName: payload.vendorName,
      purchaseNumber: payload.purchaseNumber,
      purchaseDate: payload.purchaseDate,
      status: "COMPLETED",
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

    return {
      success: true,
      message: `Purchase bill #${payload.purchaseNumber} recorded and inventory updated.`,
      purchaseId: result.order.id,
    };
  } catch (error: any) {
    console.error("Error creating purchase order:", error);
    return {
      success: false,
      message: error?.message || "Failed to record purchase order.",
    };
  }
}

/**
 * Server action to save a purchase order as DRAFT.
 * Does NOT affect inventory stock.
 */
export async function savePurchaseDraftAction(data: PurchaseOrderFormValues) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return {
        success: false,
        message: "You do not have permission to record purchases.",
      };
    }

    const validated = purchaseOrderSchema.safeParse({
      ...data,
      status: "DRAFT",
    });
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Validation failed";
      return { success: false, message: firstError };
    }

    const payload = validated.data;

    const result = await createPurchaseOrder({
      shopId: user.shopId,
      organizationId: user.organizationId,
      vendorId: payload.vendorId || null,
      vendorName: payload.vendorName,
      purchaseNumber: payload.purchaseNumber,
      purchaseDate: payload.purchaseDate,
      status: "DRAFT",
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

    return {
      success: true,
      message: `Purchase draft #${payload.purchaseNumber} saved successfully.`,
      purchaseId: result.order.id,
    };
  } catch (error: any) {
    console.error("Error saving purchase draft:", error);
    return {
      success: false,
      message: error?.message || "Failed to save draft.",
    };
  }
}

/**
 * Server action to create a new vendor directly from the purchase form.
 */
export async function createVendorAction(data: VendorFormValues) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    const validated = vendorSchema.safeParse(data);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Invalid vendor details";
      return { success: false, message: firstError };
    }

    const vendor = await createVendor({
      shopId: user.shopId,
      organizationId: user.organizationId,
      name: validated.data.name,
      contactPerson: validated.data.contactPerson || null,
      phone: validated.data.phone || null,
      email: validated.data.email || null,
      gstin: validated.data.gstin || null,
      panNumber: validated.data.panNumber || null,
      address: validated.data.address || null,
      city: validated.data.city || null,
      state: validated.data.state || null,
      pincode: validated.data.pincode || null,
      notes: validated.data.notes || null,
      isActive: true,
    });

    revalidatePath("/shop/purchases");
    revalidatePath("/shop/purchases/vendors");

    return {
      success: true,
      message: `Vendor "${vendor.name}" registered successfully.`,
      vendor,
    };
  } catch (error: any) {
    console.error("Error creating vendor:", error);
    if (error?.code === "23505") {
      return {
        success: false,
        message: "A vendor with this name already exists in your organization.",
      };
    }
    return {
      success: false,
      message: error?.message || "Failed to create vendor.",
    };
  }
}

/**
 * Server action to register a new product catalog item directly from the purchase modal.
 * Creates inventory entry with base quantity 0, ready to receive purchase stock.
 */
export interface CreatePurchaseProductInput {
  category: string;
  productCode: string;
  productName: string;
  brand?: string;
  vendorName?: string;
  rackLocation?: string;

  // Frame Specifics
  gender?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
  frameShape?: string;
  modelNumber?: string;

  // Lens Specifics
  design?: string;
  refractiveIndex?: string;
  lensMaterial?: string;
  blankDiameter?: number;
  stockPower?: string;
  isUncoated?: boolean;
  isAntiReflective?: boolean;
  isBlueControl?: boolean;
  isTinted?: boolean;
  isPolarized?: boolean;
  isHardCoat?: boolean;
  isPhotochromic?: boolean;

  // Contact Lens Specifics
  modality?: string;
  boxQuantity?: number;
  baseCurve?: string;
  diameter?: string;
  contactColor?: string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
  addPower?: string;

  // Accessory / Solution Specifics
  accessoryType?: string;
  sizeVolume?: string;
  colorPattern?: string;

  // Expiry Tracking
  requiresExpiryTracking?: boolean;
  batchNumber?: string;
  expiryDate?: string;

  // Financial & Tax
  hsnCode?: string;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  costPrice: number;
  retailPrice: number;
}

/**
 * Server action to register a new product catalog item directly from the purchase modal.
 * Creates inventory entry with base quantity 0, ready to receive purchase stock.
 */
export async function createPurchaseProductAction(data: CreatePurchaseProductInput) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    const cleanCode = data.productCode?.trim();
    if (!cleanCode) {
      return { success: false, message: "Product code is required." };
    }

    if (!data.productName?.trim()) {
      return { success: false, message: "Product name is required." };
    }

    const { db } = await import("@/lib/drizzle");
    const {
      inventory,
      frameDetails,
      lensDetails,
      contactLensDetails,
      accessoryDetails,
    } = await import("@/db/schema");
    const { checkProductCodeExists } = await import("@/services/inventory.service");

    const codeExists = await checkProductCodeExists(
      user.shopId || user.organizationId,
      cleanCode,
      undefined,
      Boolean(user.shopId),
      data.vendorName?.trim()
    );

    if (codeExists) {
      return {
        success: false,
        message: data.vendorName?.trim()
          ? `Product code "${cleanCode}" already exists for vendor "${data.vendorName}".`
          : `Product code "${cleanCode}" already exists.`,
      };
    }

    const catUpper = data.category.toUpperCase();

    // Auto-generate internal system SKU distinct from vendor/user product code
    const { getNextSkuSequence } = await import("@/services/sku.service");
    const { generateSKU } = await import("@/lib/utils");

    let autoGeneratedSku = cleanCode;
    try {
      const validCategory =
        catUpper === "FRAME" ||
        catUpper === "LENS" ||
        catUpper === "CONTACT_LENS" ||
        catUpper === "ACCESSORY" ||
        catUpper === "SOLUTION"
          ? (catUpper as any)
          : "FRAME";

      const seq = await getNextSkuSequence(user.shopId);
      autoGeneratedSku = generateSKU({
        category: validCategory,
        brand: data.brand?.trim() || undefined,
        modelNumber: data.modelNumber?.trim() || data.type?.trim() || undefined,
        colorCode: data.color?.trim() || undefined,
        sequentialNumber: seq,
      });
    } catch (err) {
      console.error("SKU generation fallback:", err);
      autoGeneratedSku = `SKU-${Date.now().toString().slice(-6)}`;
    }

    const [newItem] = await db
      .insert(inventory)
      .values({
        shopId: user.shopId,
        organizationId: user.organizationId,
        name: data.productName.trim(),
        productName: data.productName.trim(),
        productCode: cleanCode,
        category: catUpper,
        brand: data.brand?.trim() || null,
        model:
          data.modelNumber?.trim() ||
          data.type?.trim() ||
          data.design?.trim() ||
          data.accessoryType?.trim() ||
          null,
        sku: autoGeneratedSku,
        price: String(data.retailPrice || data.costPrice || 0),
        costPrice: String(data.costPrice || 0),
        quantity: 0, // Stock will be credited upon purchase order completion
        minQuantity: 5,
        isActive: true,
        vendorName: data.vendorName?.trim() || null,
        rackLocation: data.rackLocation?.trim() || null,
        hsnCode: data.hsnCode?.trim() || null,
        cgstPercent: String(data.cgstPercent.toFixed(2)),
        sgstPercent: String(data.sgstPercent.toFixed(2)),
        igstPercent: String(data.igstPercent.toFixed(2)),
        requiresExpiryTracking: Boolean(data.requiresExpiryTracking),
        batchNumber: data.batchNumber?.trim() || null,
        expiryDate: data.expiryDate ? (data.expiryDate as any) : null,
      })
      .returning();

    if (!newItem) {
      return { success: false, message: "Failed to create inventory item." };
    }

    // 1. FRAME category
    if (catUpper === "FRAME") {
      await db.insert(frameDetails).values({
        inventoryId: newItem.id,
        modelNumber: data.modelNumber?.trim() || data.type?.trim() || null,
        colorCode: data.color?.trim() || null,
        size: data.size?.trim() || null,
        material: data.material?.trim() || null,
        frameShape: data.frameShape?.trim() || null,
        targetDemographic: data.gender?.trim() || null,
      });
    }

    // 2. LENS category
    if (catUpper === "LENS") {
      await db.insert(lensDetails).values({
        inventoryId: newItem.id,
        design: data.design?.trim() || null,
        refractiveIndex: data.refractiveIndex?.trim() || null,
        material: data.lensMaterial?.trim() || data.material?.trim() || null,
        blankDiameter: data.blankDiameter || null,
        stockPower: data.stockPower?.trim() || null,
        isUncoated: Boolean(data.isUncoated),
        isAntiReflective: Boolean(data.isAntiReflective),
        isBlueControl: Boolean(data.isBlueControl),
        isTinted: Boolean(data.isTinted),
        isPolarized: Boolean(data.isPolarized),
        isHardCoat: Boolean(data.isHardCoat),
        isPhotochromic: Boolean(data.isPhotochromic),
      });
    }

    // 3. CONTACT_LENS category
    if (catUpper === "CONTACT_LENS") {
      await db.insert(contactLensDetails).values({
        inventoryId: newItem.id,
        modality: data.modality?.trim() || null,
        boxQuantity: data.boxQuantity || null,
        baseCurve: data.baseCurve?.trim() || null,
        diameter: data.diameter?.trim() || null,
        color: data.contactColor?.trim() || data.color?.trim() || null,
        sphere: data.sphere?.trim() || null,
        cylinder: data.cylinder?.trim() || null,
        axis: data.axis?.trim() || null,
        addPower: data.addPower?.trim() || null,
      });
    }

    // 4. ACCESSORY / SOLUTION category
    if (catUpper === "ACCESSORY" || catUpper === "SOLUTION") {
      await db.insert(accessoryDetails).values({
        inventoryId: newItem.id,
        type: data.accessoryType?.trim() || data.type?.trim() || (catUpper === "SOLUTION" ? "Contact Lens Solution" : "Accessory"),
        sizeVolume: data.sizeVolume?.trim() || data.size?.trim() || null,
        colorPattern: data.colorPattern?.trim() || data.color?.trim() || null,
      });
    }

    revalidatePath("/shop/inventory");

    return {
      success: true,
      message: `Product "${newItem.name}" added to catalog.`,
      item: newItem,
    };
  } catch (error: any) {
    console.error("Error creating purchase product:", error);
    return {
      success: false,
      message: error?.message || "Failed to create product.",
    };
  }
}

export interface BulkPurchaseCsvItem {
  productCode: string;
  productName: string;
  category?: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  gstPercent: number;
  hsnCode?: string;
  rackLocation?: string;
  details?: string;

  // Extended specs if filled
  frameSpecs?: {
    gender?: string;
    color?: string;
    size?: string;
    type?: string;
    material?: string;
    frameShape?: string;
    modelNumber?: string;
  };
  lensSpecs?: {
    design?: string;
    refractiveIndex?: string;
    lensMaterial?: string;
    blankDiameter?: number;
    stockPower?: string;
    isUncoated?: boolean;
    isAntiReflective?: boolean;
    isBlueControl?: boolean;
    isTinted?: boolean;
    isPolarized?: boolean;
    isHardCoat?: boolean;
    isPhotochromic?: boolean;
  };
  contactLensSpecs?: {
    modality?: string;
    boxQuantity?: number;
    baseCurve?: string;
    diameter?: string;
    color?: string;
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addPower?: string;
  };
}

export interface BulkPurchaseCsvPayload {
  vendorName: string;
  vendorId?: string | null;
  purchaseNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  taxRule?: "EXCLUDE" | "INCLUDE";
  taxType?: string;
  notes?: string;
  items: BulkPurchaseCsvItem[];
}

/**
 * Server action to process bulk purchase inventory inwarding from CSV.
 * Executes in a single atomic database transaction:
 * - Upserts vendor
 * - Matches items by productCode: refills stock for existing items, or creates new catalog items with specifications
 * - Records stock_movements (STOCK_IN)
 * - Inserts purchase_orders & purchase_order_items for official records
 */
export async function createPurchaseFromCsvAction(payload: BulkPurchaseCsvPayload) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    const organizationId = user.organizationId;
    const shopId = user.shopId;
    const userId = user.id;

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "You do not have permission to record purchases." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: "At least one product item is required." };
    }

    const cleanVendorName = payload.vendorName?.trim() || "General Supplier";
    const cleanPurchaseNumber = payload.purchaseNumber?.trim() || `PUR-${Date.now()}`;
    const cleanPurchaseDate = payload.purchaseDate?.trim() || new Date().toISOString().split("T")[0];
    const taxRule = payload.taxRule || "EXCLUDE";
    const taxType = payload.taxType || "SGST_CGST";

    const { db } = await import("@/lib/drizzle");
    const {
      purchaseOrders,
      purchaseOrderItems,
      inventory,
      vendors,
      stockMovements,
      frameDetails,
      lensDetails,
      contactLensDetails,
      accessoryDetails,
    } = await import("@/db/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const { recordStockMovement } = await import("@/services/inventory.service");
    const { generateSKU } = await import("@/lib/utils");
    const { getNextSkuSequence } = await import("@/services/sku.service");

    const result = await db.transaction(async (tx) => {
      // 1. Resolve or create vendor
      let resolvedVendorId = payload.vendorId || null;
      if (!resolvedVendorId && cleanVendorName) {
        const [existingVendor] = await tx
          .select()
          .from(vendors)
          .where(
            and(
              eq(vendors.organizationId, organizationId),
              sql`lower(${vendors.name}) = lower(${cleanVendorName})`
            )
          )
          .limit(1);

        if (existingVendor) {
          resolvedVendorId = existingVendor.id;
        } else {
          const [newVendor] = await tx
            .insert(vendors)
            .values({
              organizationId,
              shopId,
              name: cleanVendorName,
              isActive: true,
            })
            .returning();
          resolvedVendorId = newVendor?.id || null;
        }
      }

      // 2. Calculate summary totals across rows
      let totalQuantity = 0;
      let totalUnitAmount = 0;
      let totalBasePrice = 0;
      let totalGstAmount = 0;
      let totalPurchase = 0;

      const processedRows = payload.items.map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const costPrice = Number(item.unitPrice) || 0;
        const retailPrice = Number(item.retailPrice) > 0 ? Number(item.retailPrice) : costPrice;
        const gstRate = Number(item.gstPercent) || 0;

        let basePrice = costPrice;
        let lineGstAmount = 0;
        let purchasePrice = costPrice;

        if (taxRule === "INCLUDE" && gstRate > 0) {
          basePrice = Number((costPrice / (1 + gstRate / 100)).toFixed(2));
          lineGstAmount = Number((costPrice - basePrice).toFixed(2));
          purchasePrice = costPrice;
        } else {
          basePrice = costPrice;
          lineGstAmount = Number(((basePrice * gstRate) / 100).toFixed(2));
          purchasePrice = Number((basePrice + lineGstAmount).toFixed(2));
        }

        let cgstPercent = 0;
        let cgstAmount = 0;
        let sgstPercent = 0;
        let sgstAmount = 0;
        let igstPercent = 0;
        let igstAmount = 0;

        if (taxType === "IGST") {
          igstPercent = gstRate;
          igstAmount = Number((lineGstAmount * qty).toFixed(2));
        } else {
          const halfRate = Number((gstRate / 2).toFixed(2));
          const halfAmount = Number(((lineGstAmount * qty) / 2).toFixed(2));
          cgstPercent = halfRate;
          cgstAmount = halfAmount;
          sgstPercent = halfRate;
          sgstAmount = halfAmount;
        }

        const totalLinePurchase = Number((purchasePrice * qty).toFixed(2));

        totalQuantity += qty;
        totalUnitAmount += costPrice * qty;
        totalBasePrice += basePrice * qty;
        totalGstAmount += lineGstAmount * qty;
        totalPurchase += totalLinePurchase;

        return {
          ...item,
          serialNumber: idx + 1,
          quantity: qty,
          unitPrice: costPrice,
          basePrice,
          retailPrice,
          gstPercent: gstRate,
          cgstPercent,
          cgstAmount,
          sgstPercent,
          sgstAmount,
          igstPercent,
          igstAmount,
          purchasePrice,
          totalPurchasePrice: totalLinePurchase,
        };
      });

      // 3. Insert purchase_orders header
      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          shopId,
          organizationId,
          vendorId: resolvedVendorId,
          vendorName: cleanVendorName,
          purchaseNumber: cleanPurchaseNumber,
          purchaseDate: cleanPurchaseDate as any,
          status: "COMPLETED",
          taxRule,
          taxType,
          totalQuantity,
          totalUnitAmount: String(totalUnitAmount.toFixed(2)),
          totalBasePrice: String(totalBasePrice.toFixed(2)),
          totalGstAmount: String(totalGstAmount.toFixed(2)),
          totalPurchase: String(totalPurchase.toFixed(2)),
          roundOff: "0.00",
          totalNetPurchase: String(totalPurchase.toFixed(2)),
          notes: payload.notes || "Inwarded via CSV Bulk Purchase Import",
          createdBy: userId,
        })
        .returning();

      // 4. Ingest and link each item
      let itemsCreated = 0;
      let itemsUpdated = 0;

      for (const row of processedRows) {
        const cleanCode = row.productCode.trim();
        let linkedInventoryId: string | null = null;

        // Check if item exists in this shop by product code
        const [existingItem] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.shopId, shopId),
              eq(inventory.productCode, cleanCode)
            )
          )
          .limit(1);

        if (existingItem) {
          linkedInventoryId = existingItem.id;
          itemsUpdated++;

          const [updatedItem] = await tx
            .update(inventory)
            .set({
              quantity: sql`${inventory.quantity} + ${row.quantity}`,
              costPrice: String(row.unitPrice),
              price: row.retailPrice > 0 ? String(row.retailPrice) : existingItem.price,
              purchaseInvoiceNo: cleanPurchaseNumber,
              inwardDate: cleanPurchaseDate as any,
              vendorName: cleanVendorName,
              rackLocation: row.rackLocation?.trim() || existingItem.rackLocation,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, existingItem.id))
            .returning();

          if (updatedItem) {
            await recordStockMovement(
              {
                inventoryId: updatedItem.id,
                shopId,
                organizationId,
                movementType: "STOCK_IN",
                quantityChange: row.quantity,
                balanceAfter: updatedItem.quantity,
                referenceType: "PURCHASE_INVOICE",
                referenceNumber: cleanPurchaseNumber,
                vendorParty: cleanVendorName,
                costPriceAtTime: String(row.unitPrice),
                notes: `Bulk CSV purchase inward #${cleanPurchaseNumber}`,
                performedBy: userId,
              },
              tx
            );
          }
        } else {
          // Create new catalog inventory item
          itemsCreated++;
          const catUpper = (row.category || "FRAME").toUpperCase();
          const validCategory = (["FRAME", "LENS", "CONTACT_LENS", "ACCESSORY", "SOLUTION"].includes(catUpper)
            ? catUpper
            : "FRAME") as "FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY" | "SOLUTION";
          const seq = await getNextSkuSequence(organizationId);
          const autoSku = generateSKU({
            category: validCategory,
            brand: row.brand?.trim() || cleanVendorName,
            modelNumber: row.model?.trim() || cleanCode,
            colorCode: row.frameSpecs?.color || undefined,
            sequentialNumber: seq,
          });

          const [newItem] = await tx
            .insert(inventory)
            .values({
              shopId,
              organizationId,
              name: row.productName.trim(),
              productName: row.productName.trim(),
              productCode: cleanCode,
              sku: autoSku,
              category: catUpper as any,
              brand: row.brand?.trim() || null,
              model: row.model?.trim() || null,
              price: String(row.retailPrice > 0 ? row.retailPrice : row.unitPrice),
              costPrice: String(row.unitPrice),
              quantity: row.quantity,
              minQuantity: 5,
              isActive: true,
              hsnCode: row.hsnCode?.trim() || (catUpper === "LENS" ? "9001" : "9004"),
              cgstPercent: String(row.cgstPercent.toFixed(2)),
              sgstPercent: String(row.sgstPercent.toFixed(2)),
              igstPercent: String(row.igstPercent.toFixed(2)),
              rackLocation: row.rackLocation?.trim() || null,
              vendorName: cleanVendorName,
              purchaseInvoiceNo: cleanPurchaseNumber,
              inwardDate: cleanPurchaseDate as any,
            })
            .returning();

          linkedInventoryId = newItem.id;

          // Insert category specifics if provided
          if (catUpper === "FRAME" && row.frameSpecs) {
            await tx.insert(frameDetails).values({
              inventoryId: newItem.id,
              targetDemographic: row.frameSpecs.gender || null,
              colorCode: row.frameSpecs.color || null,
              size: row.frameSpecs.size || null,
              material: row.frameSpecs.material || null,
              frameShape: row.frameSpecs.frameShape || null,
              modelNumber: row.frameSpecs.modelNumber || null,
            }).catch(() => {});
          } else if (catUpper === "LENS" && row.lensSpecs) {
            await tx.insert(lensDetails).values({
              inventoryId: newItem.id,
              design: row.lensSpecs.design || null,
              refractiveIndex: row.lensSpecs.refractiveIndex || null,
              material: row.lensSpecs.lensMaterial || null,
              blankDiameter: row.lensSpecs.blankDiameter || 65,
              stockPower: row.lensSpecs.stockPower || null,
              isUncoated: Boolean(row.lensSpecs.isUncoated),
              isAntiReflective: Boolean(row.lensSpecs.isAntiReflective),
              isBlueControl: Boolean(row.lensSpecs.isBlueControl),
              isTinted: Boolean(row.lensSpecs.isTinted),
              isPolarized: Boolean(row.lensSpecs.isPolarized),
              isHardCoat: Boolean(row.lensSpecs.isHardCoat),
              isPhotochromic: Boolean(row.lensSpecs.isPhotochromic),
            }).catch(() => {});
          } else if (catUpper === "CONTACT_LENS" && row.contactLensSpecs) {
            await tx.insert(contactLensDetails).values({
              inventoryId: newItem.id,
              modality: row.contactLensSpecs.modality || null,
              boxQuantity: row.contactLensSpecs.boxQuantity || null,
              baseCurve: row.contactLensSpecs.baseCurve || null,
              diameter: row.contactLensSpecs.diameter || null,
              color: row.contactLensSpecs.color || null,
              sphere: row.contactLensSpecs.sphere || null,
              cylinder: row.contactLensSpecs.cylinder || null,
              axis: row.contactLensSpecs.axis || null,
              addPower: row.contactLensSpecs.addPower || null,
            }).catch(() => {});
          } else if (catUpper === "ACCESSORY" || catUpper === "SOLUTION") {
            await tx.insert(accessoryDetails).values({
              inventoryId: newItem.id,
              type: catUpper === "SOLUTION" ? "Contact Lens Solution" : "Accessory",
            }).catch(() => {});
          }

          await recordStockMovement(
            {
              inventoryId: newItem.id,
              shopId,
              organizationId,
              movementType: "STOCK_IN",
              quantityChange: row.quantity,
              balanceAfter: row.quantity,
              referenceType: "PURCHASE_INVOICE",
              referenceNumber: cleanPurchaseNumber,
              vendorParty: cleanVendorName,
              costPriceAtTime: String(row.unitPrice),
              notes: `New product catalog ingestion via CSV purchase #${cleanPurchaseNumber}`,
              performedBy: userId,
            },
            tx
          );
        }

        // Insert purchase_order_items row
        await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: order.id,
          inventoryId: linkedInventoryId,
          shopId,
          organizationId,
          serialNumber: row.serialNumber,
          productName: row.productName.trim(),
          productCode: cleanCode,
          category: (row.category || "FRAME").toUpperCase(),
          details: row.details || null,
          unitPrice: String(row.unitPrice.toFixed(2)),
          basePrice: String(row.basePrice.toFixed(2)),
          hsnCode: row.hsnCode || null,
          gstPercent: String(row.gstPercent.toFixed(2)),
          cgstPercent: String(row.cgstPercent.toFixed(2)),
          cgstAmount: String(row.cgstAmount.toFixed(2)),
          sgstPercent: String(row.sgstPercent.toFixed(2)),
          sgstAmount: String(row.sgstAmount.toFixed(2)),
          igstPercent: String(row.igstPercent.toFixed(2)),
          igstAmount: String(row.igstAmount.toFixed(2)),
          purchasePrice: String(row.purchasePrice.toFixed(2)),
          quantity: row.quantity,
          totalPurchasePrice: String(row.totalPurchasePrice.toFixed(2)),
          retailPrice: String(row.retailPrice.toFixed(2)),
        });
      }

      return {
        order,
        totalQuantity,
        totalPurchase,
        itemsCreated,
        itemsUpdated,
      };
    });

    revalidatePath("/shop/inventory");
    revalidatePath("/shop/purchases");

    return {
      success: true,
      message: `Purchase #${cleanPurchaseNumber} recorded successfully! Ingested ${result.totalQuantity} total units (${result.itemsCreated} new products, ${result.itemsUpdated} restocked).`,
      purchaseId: result.order.id,
      purchaseNumber: cleanPurchaseNumber,
      totalQuantity: result.totalQuantity,
      totalPurchase: result.totalPurchase,
      itemsCreated: result.itemsCreated,
      itemsUpdated: result.itemsUpdated,
    };
  } catch (error: any) {
    console.error("Error importing bulk purchase from CSV:", error);
    return {
      success: false,
      message: error?.message || "Failed to import purchase from CSV.",
    };
  }
}

