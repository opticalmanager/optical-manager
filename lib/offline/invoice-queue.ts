import { offlineDB, type OfflineQueuedInvoice } from "./db";
import { warmCache } from "./cache-warmer";
import { syncOfflineMutations } from "./mutation-queue";

/**
 * Generates the next sequential offline invoice number for a shop.
 * e.g. OFF-2026-0001
 */
export async function getNextOfflineInvoiceNumber(shopId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterKey = `offline_inv_seq_${shopId}_${currentYear}`;

  return await offlineDB.transaction("rw", offlineDB.sync_metadata, async () => {
    const record = await offlineDB.sync_metadata.get(counterKey);
    let nextCount = 1;

    if (record?.value) {
      const parsed = parseInt(record.value, 10);
      if (!isNaN(parsed)) {
        nextCount = parsed + 1;
      }
    }

    await offlineDB.sync_metadata.put({
      key: counterKey,
      value: String(nextCount),
      updatedAt: new Date().toISOString(),
    });

    return `OFF-${currentYear}-${String(nextCount).padStart(4, "0")}`;
  });
}

/**
 * Queues an invoice locally in IndexedDB when offline.
 * Atomically inserts into offline_invoices_queue, cached_invoices, and cached_orders,
 * decrements local stock cache, and adjusts store credit.
 */
export async function enqueueOfflineInvoice(
  shopId: string,
  organizationId: string,
  payload: any
): Promise<OfflineQueuedInvoice> {
  const queueId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const offlineInvoiceNumber = await getNextOfflineInvoiceNumber(shopId);

  let effectiveOrgId = organizationId;
  if (!effectiveOrgId) {
    try {
      effectiveOrgId = (await offlineDB.getCurrentOrgId()) || "";
    } catch {}
  }

  const queuedInvoice: OfflineQueuedInvoice = {
    id: queueId,
    shopId,
    organizationId: effectiveOrgId,
    offlineInvoiceNumber,
    payload: {
      ...payload,
      organizationId: effectiveOrgId,
      offlineQueueId: queueId,
      offlineInvoiceNumber,
    },
    syncStatus: "PENDING",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  let calculatedSubtotal = 0;
  let calculatedTax = 0;
  let calculatedDiscount = 0;
  if (Array.isArray(payload.invoiceItems)) {
    for (const item of payload.invoiceItems) {
      calculatedSubtotal += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
      calculatedDiscount += Number(item.discountAmount) || 0;
      calculatedTax += (Number(item.cgstAmount) || 0) + (Number(item.sgstAmount) || 0) + (Number(item.igstAmount) || 0);
    }
  }
  const taxable = Math.max(0, calculatedSubtotal - calculatedDiscount);
  const calculatedGrandTotal = taxable + calculatedTax;

  const total = payload.total !== undefined ? Number(payload.total) : calculatedGrandTotal;
  const amountPaid = payload.amountPaid !== undefined ? Number(payload.amountPaid) : total;
  const balanceDue = payload.balanceDue !== undefined ? Number(payload.balanceDue) : Math.max(0, total - amountPaid);

  const customerName = payload.customer?.fullName || "Walk-in Patient";
  const customerPhone = payload.customer?.phone || null;
  const customerEmail = payload.customer?.email || null;
  const customerId = payload.customer?.id || payload.customerId || `cust_off_${Date.now()}`;

  const mappedItems = Array.isArray(payload.invoiceItems)
    ? payload.invoiceItems.map((it: any, idx: number) => ({
        id: it.inventoryId || `item-${idx}`,
        description: it.description || it.inventoryItemName || it.name || "Optical Item",
        quantity: Number(it.quantity) || 1,
        unitPrice: String((Number(it.unitPrice) || 0).toFixed(2)),
        subtotal: String((Number(it.subtotal) || 0).toFixed(2)),
        category: it.category || "FRAME",
        brand: it.brand || null,
        model: it.model || null,
        sku: it.sku || null,
      }))
    : [];

  const paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" =
    balanceDue <= 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

  await offlineDB.transaction(
    "rw",
    [
      offlineDB.offline_invoices_queue,
      offlineDB.cached_inventory,
      offlineDB.cached_invoices,
      offlineDB.cached_orders,
      offlineDB.cached_customers,
    ],
    async () => {
      // 1. Insert into queue
      await offlineDB.offline_invoices_queue.add(queuedInvoice);

      // 2. Insert into cached invoices
      await offlineDB.cached_invoices.put({
        id: queueId,
        shopId,
        organizationId: effectiveOrgId,
        invoiceNumber: offlineInvoiceNumber,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        subtotal: calculatedSubtotal.toFixed(2),
        discount: (payload.discountAmount || calculatedDiscount || 0).toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: total.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        paymentMethod: payload.paymentMethod || "CASH",
        status: balanceDue <= 0 ? "PAID" : "PENDING",
        fulfillmentStatus: "PROCESSING",
        estimatedDelivery: payload.estimatedDelivery || null,
        notes: payload.notes || null,
        items: mappedItems,
        createdAt: queuedInvoice.createdAt,
        updatedAt: queuedInvoice.createdAt,
      });

      // 3. Insert into cached orders
      await offlineDB.cached_orders.put({
        id: queueId,
        shopId,
        organizationId: effectiveOrgId,
        invoiceId: queueId,
        invoiceNumber: offlineInvoiceNumber,
        customerId,
        customerName,
        customerPhone,
        totalAmount: total.toFixed(2),
        paidAmount: amountPaid.toFixed(2),
        dueAmount: balanceDue.toFixed(2),
        status: "PROCESSING",
        paymentStatus,
        itemsCount: mappedItems.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0) || 1,
        deliveryDate: payload.estimatedDelivery || null,
        createdAt: queuedInvoice.createdAt,
        updatedAt: queuedInvoice.createdAt,
      });

      // 4. Decrement local stock for line items to maintain accurate offline inventory
      if (Array.isArray(payload.invoiceItems)) {
        for (const item of payload.invoiceItems) {
          if (item.inventoryId && item.quantity > 0) {
            const cachedProduct = await offlineDB.cached_inventory.get(item.inventoryId);
            if (cachedProduct) {
              const newQty = Math.max(0, cachedProduct.quantity - item.quantity);
              await offlineDB.cached_inventory.update(item.inventoryId, {
                quantity: newQty,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      // 5. If store credit was applied, decrement customer's store credit
      if (payload.creditApplied && payload.creditApplied > 0 && customerId) {
        const existingCust = await offlineDB.cached_customers.get(customerId);
        if (existingCust) {
          const currentCredit = parseFloat(existingCust.storeCredit || "0");
          const updatedCredit = Math.max(0, currentCredit - payload.creditApplied);
          await offlineDB.cached_customers.update(customerId, {
            storeCredit: updatedCredit.toFixed(2),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 6. If new customer, register in local cached_customers
      if (customerPhone) {
        const existingCust = await offlineDB.cached_customers
          .where("phone")
          .equals(customerPhone)
          .first();
        if (!existingCust) {
          await offlineDB.cached_customers.put({
            id: customerId,
            shopId,
            organizationId: effectiveOrgId,
            registrationId: `OFF-${Date.now().toString().slice(-4)}`,
            fullName: customerName,
            email: customerEmail,
            phone: customerPhone,
            dateOfBirth: payload.customer?.dateOfBirth || null,
            gender: payload.customer?.gender || null,
            bloodGroup: payload.customer?.bloodGroup || null,
            referredBy: payload.customer?.referredBy || null,
            address: payload.customer?.address || null,
            city: payload.customer?.city || null,
            state: payload.customer?.state || null,
            pincode: payload.customer?.pincode || null,
            storeCredit: "0.00",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("offline-databank-updated", {
        detail: { shopId, timestamp: new Date().toISOString() },
      })
    );
  }

  return queuedInvoice;
}

/**
 * Recovers any offline invoices or mutations stuck in "SYNCING" state for > 30 seconds.
 */
export async function recoverStaleSyncLocks(): Promise<void> {
  try {
    const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
    const stuckInvoices = await offlineDB.offline_invoices_queue
      .filter((inv) => inv.syncStatus === "SYNCING" && Boolean(inv.createdAt) && inv.createdAt < thirtySecsAgo)
      .toArray();

    for (const inv of stuckInvoices) {
      await offlineDB.offline_invoices_queue.update(inv.id, {
        syncStatus: "PENDING",
      });
    }

    if (offlineDB.offline_mutations_queue) {
      const stuckMutations = await offlineDB.offline_mutations_queue
        .filter((m) => m.syncStatus === "SYNCING" && Boolean(m.createdAt) && m.createdAt < thirtySecsAgo)
        .toArray();
      for (const m of stuckMutations) {
        await offlineDB.offline_mutations_queue.update(m.id, {
          syncStatus: "PENDING",
        });
      }
    }
  } catch (err) {
    console.warn("[OfflineQueue] Error recovering stale sync locks:", err);
  }
}

/**
 * Returns count of pending/failed offline invoices and mutations for the active shop.
 */
export async function getPendingOfflineInvoiceCount(shopId: string): Promise<number> {
  try {
    await recoverStaleSyncLocks();

    const invCount = await offlineDB.offline_invoices_queue
      .filter(
        (inv) =>
          (!shopId || !inv.shopId || inv.shopId === shopId) &&
          (inv.syncStatus === "PENDING" || inv.syncStatus === "FAILED" || inv.syncStatus === "SYNCING")
      )
      .count();

    let mutCount = 0;
    try {
      if (offlineDB.offline_mutations_queue) {
        mutCount = await offlineDB.offline_mutations_queue
          .filter(
            (m) =>
              (!shopId || !m.shopId || m.shopId === shopId) &&
              (m.syncStatus === "PENDING" || m.syncStatus === "FAILED" || m.syncStatus === "SYNCING")
          )
          .count();
      }
    } catch {}

    return invCount + mutCount;
  } catch (err) {
    console.error("[OfflineQueue] Error counting pending records:", err);
    return 0;
  }
}

/**
 * Retrieves all offline invoices for the active shop or device.
 */
export async function getQueuedInvoices(shopId?: string): Promise<OfflineQueuedInvoice[]> {
  try {
    await recoverStaleSyncLocks();

    const records = await offlineDB.offline_invoices_queue
      .filter((inv) => !shopId || !inv.shopId || inv.shopId === shopId)
      .toArray();

    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("[OfflineQueue] Error loading queued invoices:", err);
    return [];
  }
}

/**
 * Retrieves offline invoices along with high-level statistics for the Outbox view.
 */
export async function getOfflineInvoicesWithStats(shopId?: string): Promise<{
  invoices: OfflineQueuedInvoice[];
  stats: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
  };
}> {
  try {
    await recoverStaleSyncLocks();

    const invoices = await getQueuedInvoices(shopId);

    const stats = {
      total: invoices.length,
      synced: invoices.filter((i) => i.syncStatus === "SYNCED").length,
      pending: invoices.filter((i) => i.syncStatus === "PENDING" || i.syncStatus === "SYNCING").length,
      failed: invoices.filter((i) => i.syncStatus === "FAILED").length,
    };

    return { invoices, stats };
  } catch (err) {
    console.error("[OfflineQueue] Error loading invoices with stats:", err);
    return {
      invoices: [],
      stats: { total: 0, synced: 0, pending: 0, failed: 0 },
    };
  }
}

/**
 * Retrieves single offline invoice by queue ID.
 */
export async function getOfflineInvoiceById(queueId: string): Promise<OfflineQueuedInvoice | null> {
  if (!queueId) return null;
  try {
    const inv = await offlineDB.offline_invoices_queue.get(queueId);
    return inv || null;
  } catch (err) {
    console.error("[OfflineQueue] Error fetching offline invoice by ID:", err);
    return null;
  }
}

/**
 * Safely removes a local offline invoice if cancelled or obsolete.
 */
export async function deleteOfflineInvoice(queueId: string): Promise<boolean> {
  if (!queueId) return false;
  try {
    await offlineDB.offline_invoices_queue.delete(queueId);
    await offlineDB.cached_invoices.delete(queueId);
    await offlineDB.cached_orders.delete(queueId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offline-databank-updated", {
          detail: { queueId, action: "deleted", timestamp: new Date().toISOString() },
        })
      );
    }
    return true;
  } catch (err) {
    console.error("[OfflineQueue] Error deleting offline invoice:", err);
    return false;
  }
}

/**
 * Pushes queued offline invoices to cloud server with resilient shop resolution and stale lock protection.
 */
export async function syncOfflineInvoices(
  shopId: string,
  targetQueueId?: string
): Promise<{
  syncedCount: number;
  failedCount: number;
  results: any[];
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, results: [] };
  }

  await recoverStaleSyncLocks();

  // Sync pending patient/appointment mutations first so dependent records exist
  let mutSynced = 0;
  let mutFailed = 0;
  if (!targetQueueId) {
    try {
      const mutResult = await syncOfflineMutations(shopId);
      mutSynced = mutResult.syncedCount;
      mutFailed = mutResult.failedCount;
    } catch (mutErr) {
      console.warn("[OfflineSync] Pre-invoice mutation sync warning:", mutErr);
    }
  }

  // Load eligible pending/failed records (or single target queue item)
  let pendingInvoices: OfflineQueuedInvoice[] = [];
  if (targetQueueId) {
    const target = await offlineDB.offline_invoices_queue.get(targetQueueId);
    if (target && target.syncStatus !== "SYNCED") {
      pendingInvoices = [target];
    }
  } else {
    pendingInvoices = await offlineDB.offline_invoices_queue
      .filter(
        (inv) =>
          (!shopId || !inv.shopId || inv.shopId === shopId) &&
          (inv.syncStatus === "PENDING" || inv.syncStatus === "FAILED")
      )
      .toArray();
  }

  if (pendingInvoices.length === 0) {
    return { syncedCount: mutSynced, failedCount: mutFailed, results: [] };
  }

  const effectiveShopId = shopId || (await offlineDB.getCurrentShopId()) || pendingInvoices[0]?.shopId || "";

  // Mark selected items as SYNCING
  await Promise.all(
    pendingInvoices.map((inv) =>
      offlineDB.offline_invoices_queue.update(inv.id, {
        syncStatus: "SYNCING",
        shopId: inv.shopId || effectiveShopId,
      })
    )
  );

  try {
    const res = await fetch("/api/sync/offline-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: effectiveShopId,
        invoices: pendingInvoices.map((inv) => ({
          offlineQueueId: inv.id,
          offlineInvoiceNumber: inv.offlineInvoiceNumber,
          payload: {
            ...inv.payload,
            shopId: inv.payload?.shopId || effectiveShopId,
          },
          createdAt: inv.createdAt,
        })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Sync API responded with status ${res.status}: ${errText || "Server error"}`);
    }

    const data = await res.json();
    const results = data.results || [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const resItem of results) {
      if (resItem.success) {
        syncedCount++;
        await offlineDB.offline_invoices_queue.update(resItem.offlineQueueId, {
          syncStatus: "SYNCED",
          serverInvoiceId: resItem.serverInvoiceId,
          serverInvoiceNumber: resItem.serverInvoiceNumber,
          syncedAt: new Date().toISOString(),
          syncError: null,
        });

        // Mirror the server invoice & order numbers into cached IndexedDB tables
        try {
          const cachedInv = await offlineDB.cached_invoices.get(resItem.offlineQueueId);
          if (cachedInv && resItem.serverInvoiceNumber) {
            await offlineDB.cached_invoices.update(resItem.offlineQueueId, {
              invoiceNumber: resItem.serverInvoiceNumber,
            });
          }
          const cachedOrd = await offlineDB.cached_orders.get(resItem.offlineQueueId);
          if (cachedOrd && resItem.serverInvoiceNumber) {
            await offlineDB.cached_orders.update(resItem.offlineQueueId, {
              invoiceNumber: resItem.serverInvoiceNumber,
            });
          }
        } catch {}
      } else {
        failedCount++;
        const inv = pendingInvoices.find((i) => i.id === resItem.offlineQueueId);
        await offlineDB.offline_invoices_queue.update(resItem.offlineQueueId, {
          syncStatus: "FAILED",
          syncError: resItem.error || "Server validation failure",
          retryCount: (inv?.retryCount || 0) + 1,
        });
      }
    }

    // Refresh cache with latest database state after successful sync
    if (syncedCount > 0 || mutSynced > 0) {
      await warmCache(effectiveShopId, true).catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offline-databank-updated", {
          detail: { shopId: effectiveShopId, syncedCount, failedCount, timestamp: new Date().toISOString() },
        })
      );
    }

    return {
      syncedCount: syncedCount + mutSynced,
      failedCount: failedCount + mutFailed,
      results,
    };
  } catch (error: any) {
    console.error("[OfflineSync] Network or server error during invoice sync:", error);
    await Promise.all(
      pendingInvoices.map((inv) =>
        offlineDB.offline_invoices_queue.update(inv.id, {
          syncStatus: "FAILED",
          syncError: error.message || "Network error",
          retryCount: (inv.retryCount || 0) + 1,
        })
      )
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offline-databank-updated", {
          detail: { shopId: effectiveShopId, failedCount: pendingInvoices.length, timestamp: new Date().toISOString() },
        })
      );
    }

    return {
      syncedCount: mutSynced,
      failedCount: pendingInvoices.length + mutFailed,
      results: [],
    };
  }
}
