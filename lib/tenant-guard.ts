import { db } from "@/lib/drizzle";
import { shops, invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface TenantUser {
  id?: string;
  role: string;
  organizationId?: string | null;
  shopId?: string | null;
  isActive?: boolean;
}

/**
 * Resolves and validates the authorized shop for the current user session.
 * - SHOP_MANAGER: Can ONLY operate in their assigned shopId. If requestedShopId is supplied and differs, throws 403 Forbidden.
 * - OWNER: Can operate across any shop within their organization. Validates that requestedShopId belongs to their organization.
 * - SUPER_ADMIN: Can operate globally.
 */
export async function resolveAuthorizedShop(
  user: TenantUser,
  requestedShopId?: string | null
): Promise<string> {
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (user.isActive === false) {
    throw new Error("Account is deactivated.");
  }

  const cleanRequestedShopId =
    requestedShopId &&
    requestedShopId !== "undefined" &&
    requestedShopId !== "null" &&
    requestedShopId.trim() !== ""
      ? requestedShopId.trim()
      : undefined;

  if (user.role === "SUPER_ADMIN") {
    return cleanRequestedShopId || user.shopId || "";
  }

  if (user.role === "SHOP_MANAGER") {
    if (!user.shopId) {
      throw new Error("Forbidden: No assigned branch outlet found for your account.");
    }
    if (cleanRequestedShopId && cleanRequestedShopId !== user.shopId) {
      throw new Error("Forbidden: You cannot access or modify records of another shop outlet.");
    }
    return user.shopId;
  }

  if (user.role === "OWNER") {
    if (!user.organizationId) {
      throw new Error("Forbidden: No organization linked to owner account.");
    }

    const targetShopId = cleanRequestedShopId || user.shopId;
    if (!targetShopId) {
      // Resolve first shop in organization
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, user.organizationId))
        .limit(1);

      if (!firstShop) {
        throw new Error("No branch outlets registered in this organization.");
      }
      return firstShop.id;
    }

    // Strictly verify target shop belongs to owner's organization
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(and(eq(shops.id, targetShopId), eq(shops.organizationId, user.organizationId)))
      .limit(1);

    if (!shop) {
      throw new Error("Forbidden: The requested shop outlet does not belong to your organization.");
    }

    return shop.id;
  }

  throw new Error("Forbidden: Invalid user role.");
}

/**
 * Assert that a record belonging to a shop/org can be accessed by the user.
 */
export function assertEntityAccess(
  user: TenantUser,
  recordOrgId: string | null | undefined,
  recordShopId?: string | null | undefined
): void {
  if (!user || user.isActive === false) {
    throw new Error("Unauthorized");
  }

  if (user.role === "SUPER_ADMIN") return;

  if (user.organizationId !== recordOrgId) {
    throw new Error("Forbidden: Access denied to foreign organization record.");
  }

  if (user.role === "SHOP_MANAGER" && recordShopId && recordShopId !== user.shopId) {
    throw new Error("Forbidden: Access denied to foreign shop outlet record.");
  }
}

/**
 * Constructs an authorized SQL condition for accessing invoices.
 * Restricts SHOP_MANAGER to their assigned shopId while allowing OWNER access across the organization.
 */
export function getInvoiceAccessCondition(invoiceId: string, user: TenantUser) {
  if (user.role === "SUPER_ADMIN") {
    return eq(invoices.id, invoiceId);
  }
  const conds = [
    eq(invoices.id, invoiceId),
    eq(invoices.organizationId, user.organizationId!),
  ];
  if (user.role === "SHOP_MANAGER" && user.shopId) {
    conds.push(eq(invoices.shopId, user.shopId));
  }
  return and(...conds);
}
