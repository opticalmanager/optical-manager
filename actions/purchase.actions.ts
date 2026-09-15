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
