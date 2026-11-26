import type { Prescription } from "@/types";
import { safeToISODate } from "./invoice-helpers";

/**
 * Checks whether a prescription row has any clinical optical measurement populated.
 */
export function hasPopulatedRxValues(rx?: Partial<Prescription> | null): boolean {
  if (!rx) return false;
  return Boolean(
    rx.rightSphere ||
      rx.rightCylinder ||
      rx.rightAxis ||
      rx.rightAdd ||
      rx.rightNv ||
      rx.leftSphere ||
      rx.leftCylinder ||
      rx.leftAxis ||
      rx.leftAdd ||
      rx.leftNv
  );
}

export interface ResolvedOrderPrescriptionPair {
  distRx: Prescription | null;
  nearRx: Prescription | null;
  metaRx: Prescription | null;
  hasDistanceRx: boolean;
  hasNearRx: boolean;
  hasPrescription: boolean;
}

interface PrescriptionVisitGroup {
  key: string;
  dateKey: string;
  timestampMs: number;
  distRx: Prescription | null;
  nearRx: Prescription | null;
}

/**
 * Resolves the paired Distance + Near clinical prescriptions belonging to a specific order/visit.
 * Groups records by (rxNumber || calendar date) so old DISTANCE values are never mixed with new NEAR values,
 * and prioritizes visits created alongside the reference order timestamp.
 */
export function resolveOrderPrescriptionPair(
  prescriptions: Prescription[] | null | undefined,
  referenceDate?: Date | string | null
): ResolvedOrderPrescriptionPair {
  const list = Array.isArray(prescriptions) ? prescriptions : [];
  if (list.length === 0) {
    return {
      distRx: null,
      nearRx: null,
      metaRx: null,
      hasDistanceRx: false,
      hasNearRx: false,
      hasPrescription: false,
    };
  }

  // Sort newest first so latest exam wins ties deterministically
  const sortedDesc = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groupsMap = new Map<string, PrescriptionVisitGroup>();

  for (const rx of sortedDesc) {
    const createdMs = new Date(rx.createdAt).getTime();
    const dateKey =
      safeToISODate(rx.prescribedAt) ||
      safeToISODate(rx.createdAt) ||
      new Date(rx.createdAt).toISOString().split("T")[0];
    const groupKey = rx.rxNumber?.trim() ? `RX:${rx.rxNumber.trim()}_${dateKey}` : `DT:${dateKey}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        key: groupKey,
        dateKey,
        timestampMs: isNaN(createdMs) ? 0 : createdMs,
        distRx: rx.prescriptionType === "DISTANCE" ? rx : null,
        nearRx: rx.prescriptionType === "NEAR" ? rx : null,
      });
    } else {
      const existing = groupsMap.get(groupKey)!;
      if (rx.prescriptionType === "DISTANCE" && !existing.distRx) existing.distRx = rx;
      if (rx.prescriptionType === "NEAR" && !existing.nearRx) existing.nearRx = rx;
      if (createdMs > existing.timestampMs) existing.timestampMs = createdMs;
    }
  }

  const groups = Array.from(groupsMap.values()).filter(
    (g) => hasPopulatedRxValues(g.distRx) || hasPopulatedRxValues(g.nearRx)
  );

  if (groups.length === 0) {
    return {
      distRx: null,
      nearRx: null,
      metaRx: null,
      hasDistanceRx: false,
      hasNearRx: false,
      hasPrescription: false,
    };
  }

  let matchedGroup: PrescriptionVisitGroup = groups[0];

  if (referenceDate) {
    const refMs = new Date(referenceDate).getTime();
    const refDateKey = safeToISODate(referenceDate);

    if (!isNaN(refMs)) {
      // 1. Exact timestamp proximity match (within 10 minutes of invoice booking)
      const nearExact = groups.reduce<{ group: PrescriptionVisitGroup | null; diff: number }>(
        (best, g) => {
          const diff = Math.abs(g.timestampMs - refMs);
          if (diff <= 10 * 60 * 1000 && diff < best.diff) {
            return { group: g, diff };
          }
          return best;
        },
        { group: null, diff: Infinity }
      );

      if (nearExact.group) {
        matchedGroup = nearExact.group;
      } else if (refDateKey) {
        // 2. Same calendar day visit match
        const sameDay = groups.find((g) => g.dateKey === refDateKey);
        if (sameDay) {
          matchedGroup = sameDay;
        } else {
          // 3. Most recent visit recorded on or before the order date
          const onOrBefore = groups.find((g) => g.timestampMs <= refMs || g.dateKey <= refDateKey);
          matchedGroup = onOrBefore || groups[0];
        }
      }
    }
  }

  const distRx = matchedGroup.distRx;
  const nearRx = matchedGroup.nearRx;
  const hasDistanceRx = hasPopulatedRxValues(distRx);
  const hasNearRx = hasPopulatedRxValues(nearRx);

  return {
    distRx,
    nearRx,
    metaRx: distRx || nearRx,
    hasDistanceRx,
    hasNearRx,
    hasPrescription: hasDistanceRx || hasNearRx,
  };
}
