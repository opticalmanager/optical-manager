import test from "node:test";
import assert from "node:assert/strict";

import { resolveOrderPrescriptionPair, hasPopulatedRxValues } from "../lib/prescription-helpers";
import { getLivePublicPrescriptionUrl, getLivePublicInvoiceUrl, getLivePublicReceiptUrl } from "../lib/gst-utils";
import { resolvePrescriptionDisplaySettings, DEFAULT_PRESCRIPTION_ADVISORY_NOTE } from "../lib/document-config";
import { DEFAULT_WHATSAPP_TEMPLATES } from "../utils/whatsapp-templates";
import { parseWhatsAppTemplate } from "../utils/whatsapp-parser";
import type { Prescription } from "../types";

function makeRx(overrides: Partial<Prescription>): Prescription {
  return {
    id: "rx-1",
    organizationId: "org-1",
    shopId: "shop-1",
    customerId: "cust-1",
    rxNumber: null,
    rxCategory: "SPECTACLES",
    prescriptionType: "DISTANCE",
    rightSphere: null,
    rightCylinder: null,
    rightAxis: null,
    rightAdd: null,
    rightNv: null,
    leftSphere: null,
    leftCylinder: null,
    leftAxis: null,
    leftAdd: null,
    leftNv: null,
    pd: null,
    pdRight: null,
    pdLeft: null,
    prescribedBy: null,
    doctorName: null,
    notes: null,
    specialInstructions: null,
    prescribedAt: null,
    estimatedDelivery: null,
    createdAt: new Date("2026-11-10T10:00:00Z"),
    updatedAt: new Date("2026-11-10T10:00:00Z"),
    ...overrides,
  } as Prescription;
}

test("1. resolveOrderPrescriptionPair matches visit closest to order timestamp without mixing different visits", () => {
  const orderTime = new Date("2026-11-10T10:05:00Z");

  const records: Prescription[] = [
    // Newer later-day visit (should NOT overwrite earlier order's Rx when timestamp proximity matches Nov 10 10:00)
    makeRx({
      id: "rx-new-dist",
      rxNumber: "RX-200",
      prescriptionType: "DISTANCE",
      rightSphere: "-3.00",
      leftSphere: "-3.25",
      createdAt: new Date("2026-11-20T14:00:00Z"),
      prescribedAt: "2026-11-20",
    }),
    // Same visit on Nov 10 (DISTANCE + NEAR)
    makeRx({
      id: "rx-10-dist",
      rxNumber: "RX-100",
      prescriptionType: "DISTANCE",
      rightSphere: "-1.50",
      leftSphere: "-1.75",
      doctorName: "Dr. Rao",
      createdAt: new Date("2026-11-10T10:02:00Z"),
      prescribedAt: "2026-11-10",
    }),
    makeRx({
      id: "rx-10-near",
      rxNumber: "RX-100",
      prescriptionType: "NEAR",
      rightSphere: "-1.50",
      rightAdd: "+1.75",
      leftSphere: "-1.75",
      leftAdd: "+1.75",
      createdAt: new Date("2026-11-10T10:02:05Z"),
      prescribedAt: "2026-11-10",
    }),
  ];

  const resolved = resolveOrderPrescriptionPair(records, orderTime);
  assert.equal(resolved.hasPrescription, true);
  assert.equal(resolved.hasDistanceRx, true);
  assert.equal(resolved.hasNearRx, true);
  assert.equal(resolved.distRx?.id, "rx-10-dist");
  assert.equal(resolved.nearRx?.id, "rx-10-near");
  assert.equal(resolved.metaRx?.rxNumber, "RX-100");
  assert.equal(resolved.metaRx?.doctorName, "Dr. Rao");
});

test("2. hasPopulatedRxValues returns false when all power fields are blank/null", () => {
  const emptyRx = makeRx({ id: "rx-empty" });
  assert.equal(hasPopulatedRxValues(emptyRx), false);

  const pair = resolveOrderPrescriptionPair([emptyRx], new Date("2026-11-10T10:00:00Z"));
  assert.equal(pair.hasPrescription, false);
  assert.equal(pair.distRx, null);
  assert.equal(pair.nearRx, null);
});

test("3. Public share URL builders generate isolated document paths", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  assert.equal(
    getLivePublicPrescriptionUrl(id, "https://app.opticalmanager.in"),
    `https://app.opticalmanager.in/share/prescription/${id}`
  );
  assert.equal(
    getLivePublicInvoiceUrl(id, "https://app.opticalmanager.in"),
    `https://app.opticalmanager.in/share/invoice/${id}`
  );
  assert.equal(
    getLivePublicReceiptUrl(id, "https://app.opticalmanager.in"),
    `https://app.opticalmanager.in/share/receipt/${id}`
  );
});

test("4. WhatsApp prescription_sent template uses {{prescription_url}} instead of {{invoice_url}}", () => {
  const tpl = DEFAULT_WHATSAPP_TEMPLATES.prescription_sent;
  assert.ok(tpl.availableVariables.includes("prescription_url"));
  assert.ok(tpl.template.includes("{{prescription_url}}"));
  assert.equal(tpl.template.includes("{{invoice_url}}"), false);

  const parsed = parseWhatsAppTemplate(tpl.template, {
    customer_name: "Amit Verma",
    shop_name: "Punjab Optical Store",
    phone: "9876543210",
    re_sph: "-1.25",
    re_cyl: "-0.50",
    re_axis: "90°",
    re_add: "+1.50",
    le_sph: "-1.00",
    le_cyl: "0.00",
    le_axis: "-",
    le_add: "+1.50",
    pd: "62",
    doctor_name: "Dr. Verma",
    prescription_url: "https://app.opticalmanager.in/share/prescription/abc-123",
  });

  assert.ok(parsed.includes("https://app.opticalmanager.in/share/prescription/abc-123"));
  assert.ok(parsed.includes("Amit Verma"));
  assert.ok(parsed.includes("-1.25"));
});

test("5. resolvePrescriptionDisplaySettings merges shop documentTemplates with clean defaults", () => {
  const defaults = resolvePrescriptionDisplaySettings({});
  assert.equal(defaults.showPrescriptionOnInvoice, false);
  assert.equal(defaults.showPrescriptionOnBooking, true);
  assert.equal(defaults.printRxShowEyewearDetails, true);
  assert.equal(defaults.printRxShowMedicalHistory, true);
  assert.equal(defaults.printRxShowDoctorSignature, true);
  assert.equal(defaults.printRxShowGstin, false);
  assert.equal(defaults.prescriptionAdvisoryNote, DEFAULT_PRESCRIPTION_ADVISORY_NOTE);

  const custom = resolvePrescriptionDisplaySettings({
    shop: {
      settings: {
        documentTemplates: {
          showPrescriptionOnInvoice: true,
          showPrescriptionOnBooking: false,
          printRxShowEyewearDetails: false,
          printRxShowGstin: true,
          prescriptionAdvisoryNote: "Valid for 6 months only.",
        },
      },
    },
  });

  assert.equal(custom.showPrescriptionOnInvoice, true);
  assert.equal(custom.showPrescriptionOnBooking, false);
  assert.equal(custom.printRxShowEyewearDetails, false);
  assert.equal(custom.printRxShowGstin, true);
  assert.equal(custom.prescriptionAdvisoryNote, "Valid for 6 months only.");
});
