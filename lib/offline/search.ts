import { offlineDB, type CachedCustomer, type CachedInventory } from "./db";

/**
 * Searches customers in IndexedDB matching query against fullName, phone, or registrationId.
 * Scoped strictly to the provided shopId.
 */
export async function searchCustomersOffline(
  shopId: string,
  query: string,
  limit = 10
): Promise<any[]> {
  if (!query || !query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();

  // Resolve targetShopId with automatic fallback to stored active shop
  let targetShopId = shopId;
  if (!targetShopId) {
    try {
      const activeShopRecord = await offlineDB.sync_metadata.get("active_shop_id");
      if (activeShopRecord?.value) {
        targetShopId = activeShopRecord.value;
      }
    } catch {}
  }

  try {
    let queryBuilder = targetShopId
      ? offlineDB.cached_customers.where("shopId").equals(targetShopId)
      : offlineDB.cached_customers.toCollection();

    const results = await queryBuilder
      .filter((customer) => {
        const nameMatch = customer.fullName.toLowerCase().includes(lowerQuery);
        const phoneMatch = customer.phone.toLowerCase().includes(lowerQuery);
        const regMatch = customer.registrationId
          ? customer.registrationId.toLowerCase().includes(lowerQuery)
          : false;

        return nameMatch || phoneMatch || regMatch;
      })
      .limit(limit)
      .toArray();

    // Map to match the shape expected by frontend (same as /api/search)
    return results.map((c) => ({
      id: c.id,
      name: c.fullName,
      phone: c.phone,
      registrationId: c.registrationId,
      storeCredit: c.storeCredit,
      dateOfBirth: c.dateOfBirth,
      gender: c.gender,
      bloodGroup: c.bloodGroup,
      referredBy: c.referredBy,
      address: c.address,
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      email: c.email,
    }));
  } catch (err) {
    console.error("[OfflineSearch] Customer search failed:", err);
    return [];
  }
}

/**
 * Searches inventory in IndexedDB matching query against name, sku, brand, or model.
 * Scoped strictly to the active shop and active products.
 */
export async function searchInventoryOffline(
  shopId: string,
  query: string,
  limit = 10
): Promise<any[]> {
  if (!query || !query.trim()) return [];

  const lowerQuery = query.toLowerCase().trim();

  // Resolve targetShopId with automatic fallback to stored active shop
  let targetShopId = shopId;
  if (!targetShopId) {
    try {
      const activeShopRecord = await offlineDB.sync_metadata.get("active_shop_id");
      if (activeShopRecord?.value) {
        targetShopId = activeShopRecord.value;
      }
    } catch {}
  }

  try {
    let queryBuilder = targetShopId
      ? offlineDB.cached_inventory.where("shopId").equals(targetShopId)
      : offlineDB.cached_inventory.toCollection();

    const results = await queryBuilder
      .filter((item) => {
        if (!item.isActive) return false;

        const nameMatch = item.name.toLowerCase().includes(lowerQuery);
        const skuMatch = item.sku ? item.sku.toLowerCase().includes(lowerQuery) : false;
        const brandMatch = item.brand ? item.brand.toLowerCase().includes(lowerQuery) : false;
        const modelMatch = item.model ? item.model.toLowerCase().includes(lowerQuery) : false;

        return nameMatch || skuMatch || brandMatch || modelMatch;
      })
      .limit(limit)
      .toArray();

    // Map to match the shape expected by NewInvoiceForm line-items
    return results.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      brand: item.brand,
      model: item.model,
      price: item.price,
      quantity: item.quantity,
      cgstPercent: item.cgstPercent,
      sgstPercent: item.sgstPercent,
      igstPercent: item.igstPercent,
    }));
  } catch (err) {
    console.error("[OfflineSearch] Inventory search failed:", err);
    return [];
  }
}

/**
 * Unified search helper matching the structure of `/api/search`.
 */
export async function searchOfflineUnified(shopId: string, query: string) {
  const [customers, inventory] = await Promise.all([
    searchCustomersOffline(shopId, query, 5),
    searchInventoryOffline(shopId, query, 5),
  ]);

  return {
    customers,
    inventory,
    invoices: [], // Invoices search is cloud-only
  };
}

/**
 * Lookup single customer by ID from offline databank.
 */
export async function getCustomerByIdOffline(customerId: string): Promise<CachedCustomer | null> {
  if (!customerId) return null;
  try {
    const customer = await offlineDB.cached_customers.get(customerId);
    return customer || null;
  } catch (err) {
    console.error("[OfflineSearch] Customer lookup by ID failed:", err);
    return null;
  }
}
