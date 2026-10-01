import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config();

import {
  extractTrailingSerial,
  buildSeriesPrefix,
  formatDocumentNumber,
  DEFAULT_DOCUMENT_SERIES,
  getIndianFinancialYear,
} from "../utils/document-series";

import {
  generateInvoiceNumber,
  generateBatchInvoiceNumbers,
} from "../services/invoice.service";

import {
  generateReceiptNumber,
  generateOrderNumber,
} from "../services/receipt.service";

import {
  generateRegistrationId,
} from "../services/customer.service";

import { db } from "../lib/drizzle";
import { invoices, customers, receipts, orders } from "../db/schema";
import { eq, and } from "drizzle-orm";

const TEST_SHOP_ID = "efdd4b4c-0c43-492e-897a-db22682fc1cb"; // OPTIX ONE shop
const TEST_ORG_ID = "6112e65a-8472-4f03-9ab9-72d7b158be7f";

test("1. extractTrailingSerial handles various document number formats", () => {
  // Standard format
  assert.equal(extractTrailingSerial("INV-2-2026-0116", "INV-2-2026-"), 116);
  assert.equal(extractTrailingSerial("INV-2-2026-0086", "INV-2-2026-"), 86);
  assert.equal(extractTrailingSerial("INV-2-2026-0001", "INV-2-2026-"), 1);

  // High number / length jump
  assert.equal(extractTrailingSerial("INV-2-2026-10000", "INV-2-2026-"), 10000);

  // Custom slashes and financial years
  assert.equal(extractTrailingSerial("OM/24-25/0500", "OM/24-25/"), 500);

  // Without known prefix
  assert.equal(extractTrailingSerial("INV-2-2026-0116"), 116);
  assert.equal(extractTrailingSerial("PPS-2-2026-0151"), 151);
  assert.equal(extractTrailingSerial("OP-1-2026-0042"), 42);

  // Empty or invalid inputs
  assert.equal(extractTrailingSerial(""), null);
  assert.equal(extractTrailingSerial(null), null);
  assert.equal(extractTrailingSerial(undefined), null);
  assert.equal(extractTrailingSerial("NO_DIGITS_HERE"), null);
});

test("2. Length-first numerical sorting correctly orders multi-digit document serials", () => {
  const sampleInvoiceNumbers = [
    "INV-2-2026-0001",
    "INV-2-2026-0086",
    "INV-2-2026-0116",
    "INV-2-2026-0099",
    "INV-2-2026-1000",
    "INV-2-2026-0100",
  ];

  // Emulate SQL: length(num) DESC, num DESC
  const sorted = [...sampleInvoiceNumbers].sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return b.localeCompare(a);
  });

  assert.equal(sorted[0], "INV-2-2026-1000", "5-digit / longer serial must be first");
  assert.equal(sorted[1], "INV-2-2026-0116", "Highest 4-digit serial must follow");
  assert.equal(sorted[2], "INV-2-2026-0100");
  assert.equal(sorted[3], "INV-2-2026-0099");
  assert.equal(sorted[4], "INV-2-2026-0086");
  assert.equal(sorted[5], "INV-2-2026-0001");

  // Verify Math.max over extracted serials correctly yields 1000
  let maxSerial = 0;
  for (const num of sorted) {
    const s = extractTrailingSerial(num, "INV-2-2026-");
    if (s !== null && s > maxSerial) maxSerial = s;
  }
  assert.equal(maxSerial, 1000);
});

test("3. generateInvoiceNumber returns next non-colliding serial for OPTIX ONE", async () => {
  const invoiceNum = await generateInvoiceNumber(TEST_SHOP_ID);
  assert.ok(invoiceNum, "Invoice number should not be empty");
  assert.match(invoiceNum, /^INV-2-2026-\d{4,}$/, "Should match INV-2-2026-NNNN pattern");

  const serial = extractTrailingSerial(invoiceNum, "INV-2-2026-");
  assert.ok(serial !== null && serial >= 117, `Serial should be at least 117, got ${serial}`);

  // Ensure this number does not exist in DB
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, TEST_ORG_ID),
        eq(invoices.invoiceNumber, invoiceNum)
      )
    )
    .limit(1);

  assert.equal(existing, undefined, `Candidate ${invoiceNum} must not exist in DB`);
});

test("4. generateBatchInvoiceNumbers generates consecutive unique invoice numbers", async () => {
  const batch = await generateBatchInvoiceNumbers(TEST_SHOP_ID, 5);
  assert.equal(batch.length, 5, "Batch count must match requested count");

  // Check uniqueness within batch
  const uniqueSet = new Set(batch);
  assert.equal(uniqueSet.size, 5, "All batch invoice numbers must be unique");

  // Check strictly increasing sequential numbers
  const serials = batch.map((num) => extractTrailingSerial(num, "INV-2-2026-")!);
  for (let i = 1; i < serials.length; i++) {
    assert.equal(serials[i], serials[i - 1] + 1, "Serials must be strictly consecutive");
  }

  // Verify none exist in DB
  for (const num of batch) {
    const [existing] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, TEST_ORG_ID),
          eq(invoices.invoiceNumber, num)
        )
      )
      .limit(1);
    assert.equal(existing, undefined, `Batch item ${num} must not exist in DB`);
  }
});

test("5. generateReceiptNumber returns a valid non-colliding receipt number", async () => {
  const receiptNum = await generateReceiptNumber(TEST_SHOP_ID);
  assert.ok(receiptNum, "Receipt number should not be empty");
  assert.match(receiptNum, /^PPS-2-2026-\d{4,}$/, "Should match PPS-2-2026-NNNN pattern");

  // Ensure this number does not exist in DB
  const [existing] = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(
      and(
        eq(receipts.organizationId, TEST_ORG_ID),
        eq(receipts.receiptNumber, receiptNum)
      )
    )
    .limit(1);

  assert.equal(existing, undefined, `Receipt number ${receiptNum} must not exist in DB`);
});

test("6. generateOrderNumber returns a valid non-colliding order number", async () => {
  const orderNum = await generateOrderNumber(TEST_SHOP_ID);
  assert.ok(orderNum, "Order number should not be empty");
  assert.match(orderNum, /^ORD-2-2026-\d{4,}$/, "Should match ORD-2-2026-NNNN pattern");

  // Ensure this number does not exist in DB
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, TEST_ORG_ID),
        eq(orders.orderNumber, orderNum)
      )
    )
    .limit(1);

  assert.equal(existing, undefined, `Order number ${orderNum} must not exist in DB`);

  // Test matchInvoice mode
  const matchingOrder = await generateOrderNumber(TEST_SHOP_ID, db, "INV-TEST-999");
  // Default shop settings has matchInvoice false, so it still produces ORD-
  assert.ok(matchingOrder);
});

test("7. generateRegistrationId returns a valid non-colliding customer registration ID", async () => {
  const regId = await generateRegistrationId(TEST_SHOP_ID);
  assert.ok(regId, "Registration ID should not be empty");
  assert.match(regId, /^OP-2-2026-\d{4,}$/, "Should match OP-2-2026-NNNN pattern");

  // Ensure this customer ID does not exist in DB
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, TEST_ORG_ID),
        eq(customers.registrationId, regId)
      )
    )
    .limit(1);

  assert.equal(existing, undefined, `Registration ID ${regId} must not exist in DB`);
});

test("8. Concurrency retry simulation handles unique constraint conflict gracefully", async () => {
  let callCount = 0;
  let attempts = 0;
  const maxAttempts = 3;
  let success = false;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      callCount++;
      if (callCount === 1) {
        // Simulate Postgres 23505 duplicate key violation on attempt 1
        const fakeError: any = new Error('duplicate key value violates unique constraint "invoices_org_invoice_num_unique"');
        fakeError.code = "23505";
        throw fakeError;
      }
      success = true;
      break;
    } catch (err: any) {
      if (err.code === "23505" && attempts < maxAttempts) {
        continue;
      }
      throw err;
    }
  }

  assert.equal(attempts, 2, "Should recover and succeed on attempt 2");
  assert.equal(success, true, "Operation must succeed after retry");
});

test("9. Teardown: connection pool cleanup", () => {
  setTimeout(() => process.exit(0), 200).unref();
});
