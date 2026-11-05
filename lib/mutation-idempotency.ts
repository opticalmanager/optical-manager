/**
 * High-performance, memory-bounded idempotency cache for offline sync mutations.
 * Prevents retried sync batches from re-executing sensitive financial operations
 * (e.g. ORDER_PAYMENT_RECORD, ORDER_SETTLE_DUES, STOCK_ADJUST, RETURN_CREATE).
 */
const processedMutations = new Map<string, { result: any; timestamp: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24-hour cache window

export function getProcessedMutation(orgId: string, shopId: string, mutationId: string): any | null {
  if (!mutationId) return null;
  const key = `${orgId}:${shopId}:${mutationId}`;
  const entry = processedMutations.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    processedMutations.delete(key);
    return null;
  }
  return entry.result;
}

export function recordProcessedMutation(orgId: string, shopId: string, mutationId: string, result: any): void {
  if (!mutationId) return;
  const key = `${orgId}:${shopId}:${mutationId}`;

  // Maintain bounded cache size
  if (processedMutations.size > 20000) {
    const cutoff = Date.now() - TTL_MS;
    for (const [k, v] of processedMutations.entries()) {
      if (v.timestamp < cutoff) {
        processedMutations.delete(k);
      }
    }
  }

  processedMutations.set(key, { result, timestamp: Date.now() });
}
