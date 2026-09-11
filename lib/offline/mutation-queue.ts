import { offlineDB, type OfflineQueuedMutation } from "./db";
import { warmCache } from "./cache-warmer";

/**
 * Enqueue an offline mutation (Patient Create, Appointment Create, Status Update)
 */
export async function enqueueOfflineMutation(
  shopId: string,
  type: OfflineQueuedMutation["type"],
  payload: any
): Promise<OfflineQueuedMutation> {
  const mutationId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const queuedMutation: OfflineQueuedMutation = {
    id: mutationId,
    shopId,
    type,
    payload,
    syncStatus: "PENDING",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  await offlineDB.offline_mutations_queue.add(queuedMutation);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("offline-databank-updated", {
        detail: { shopId, type, timestamp: new Date().toISOString() },
      })
    );
  }

  return queuedMutation;
}

/**
 * Returns count of pending offline mutations for the active shop.
 */
export async function getPendingMutationCount(shopId: string): Promise<number> {
  if (!shopId) return 0;
  try {
    return await offlineDB.offline_mutations_queue
      .where("shopId")
      .equals(shopId)
      .filter((m) => m.syncStatus === "PENDING" || m.syncStatus === "FAILED")
      .count();
  } catch (err) {
    console.error("[MutationQueue] Error counting pending mutations:", err);
    return 0;
  }
}

/**
 * Pushes queued offline mutations to cloud server.
 */
export async function syncOfflineMutations(shopId: string): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const pendingMutations = await offlineDB.offline_mutations_queue
    .where("shopId")
    .equals(shopId)
    .filter((m) => m.syncStatus === "PENDING" || m.syncStatus === "FAILED")
    .toArray();

  if (pendingMutations.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Mark all as SYNCING
  await Promise.all(
    pendingMutations.map((m) =>
      offlineDB.offline_mutations_queue.update(m.id, { syncStatus: "SYNCING" })
    )
  );

  try {
    const res = await fetch("/api/sync/offline-mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId,
        mutations: pendingMutations.map((m) => ({
          id: m.id,
          type: m.type,
          payload: m.payload,
          createdAt: m.createdAt,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Offline mutations sync failed with status ${res.status}`);
    }

    const data = await res.json();
    const results = data.results || [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of results) {
      if (item.success) {
        syncedCount++;
        await offlineDB.offline_mutations_queue.update(item.id, {
          syncStatus: "SYNCED",
          serverResultId: item.serverResultId,
          syncedAt: new Date().toISOString(),
          syncError: null,
        });

        // Reconcile local IDs with server IDs
        const m = pendingMutations.find((x) => x.id === item.id);

        if (item.type === "PATIENT_CREATE" && item.serverResultId) {
          const phone = m?.payload?.customer?.phone || m?.payload?.phone;
          if (phone) {
            const existing = await offlineDB.cached_customers.where("phone").equals(phone).first();
            if (existing && existing.id !== item.serverResultId) {
              await offlineDB.cached_customers.delete(existing.id);
              await offlineDB.cached_customers.put({
                ...existing,
                id: item.serverResultId,
                registrationId: item.registrationId || existing.registrationId,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } else if (item.type === "INVENTORY_CREATE" && item.serverResultId) {
          const offlineId = m?.payload?.offlineItemId;
          if (offlineId) {
            const existing = await offlineDB.cached_inventory.get(offlineId);
            if (existing) {
              await offlineDB.cached_inventory.delete(offlineId);
              await offlineDB.cached_inventory.put({
                ...existing,
                id: item.serverResultId,
                sku: item.sku || existing.sku,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } else if (item.type === "APPOINTMENT_CREATE" && item.serverResultId) {
          const phone = m?.payload?.customerPhone;
          if (phone) {
            const pendingApps = await offlineDB.cached_appointments
              .filter((a) => a.id.startsWith("off-app-") && a.patientPhone === phone)
              .toArray();
            for (const app of pendingApps) {
              await offlineDB.cached_appointments.delete(app.id);
              await offlineDB.cached_appointments.put({
                ...app,
                id: item.serverResultId,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } else if (item.type === "RETURN_CREATE" && item.serverResultId) {
          const offlineReturnId = m?.payload?.offlineReturnId;
          if (offlineReturnId) {
            const existing = await offlineDB.cached_returns.get(offlineReturnId);
            if (existing) {
              await offlineDB.cached_returns.delete(offlineReturnId);
              await offlineDB.cached_returns.put({
                ...existing,
                id: item.serverResultId,
                returnNumber: item.returnNumber || existing.returnNumber,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      } else {
        failedCount++;
        const m = pendingMutations.find((x) => x.id === item.id);
        await offlineDB.offline_mutations_queue.update(item.id, {
          syncStatus: "FAILED",
          syncError: item.error || "Server rejection",
          retryCount: (m?.retryCount || 0) + 1,
        });
      }
    }

    if (syncedCount > 0) {
      await warmCache(shopId, true);
    }

    return { syncedCount, failedCount };
  } catch (error: any) {
    console.error("[MutationQueue] Sync error:", error);
    await Promise.all(
      pendingMutations.map((m) =>
        offlineDB.offline_mutations_queue.update(m.id, {
          syncStatus: "FAILED",
          syncError: error.message || "Network error",
          retryCount: (m.retryCount || 0) + 1,
        })
      )
    );
    return { syncedCount: 0, failedCount: pendingMutations.length };
  }
}
