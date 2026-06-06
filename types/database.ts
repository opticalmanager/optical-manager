/**
 * Database-related TypeScript types inferred from Drizzle schema.
 *
 * These types are derived from the Drizzle table definitions,
 * providing type safety for insert and select operations.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  organizations,
  profiles,
  shops,
  subscriptions,
  customers,
  prescriptions,
  inventory,
  frameDetails,
  invoices,
  invoiceItems,
  stockMovements,
} from "@/db/schema";


// --- Select Types (reading from DB) ---
export type Organization = InferSelectModel<typeof organizations>;
export type Profile = InferSelectModel<typeof profiles>;
export type Shop = InferSelectModel<typeof shops>;
export type Subscription = InferSelectModel<typeof subscriptions>;
export type Customer = InferSelectModel<typeof customers>;
export type Prescription = InferSelectModel<typeof prescriptions>;
export type InventoryItem = InferSelectModel<typeof inventory>;
export type FrameDetail = InferSelectModel<typeof frameDetails>;
export type Invoice = InferSelectModel<typeof invoices>;
export type InvoiceItem = InferSelectModel<typeof invoiceItems>;
export type StockMovement = InferSelectModel<typeof stockMovements>;

// --- Insert Types (writing to DB) ---
export type NewOrganization = InferInsertModel<typeof organizations>;
export type NewProfile = InferInsertModel<typeof profiles>;
export type NewShop = InferInsertModel<typeof shops>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type NewCustomer = InferInsertModel<typeof customers>;
export type NewPrescription = InferInsertModel<typeof prescriptions>;
export type NewInventoryItem = InferInsertModel<typeof inventory>;
export type NewFrameDetail = InferInsertModel<typeof frameDetails>;
export type NewInvoice = InferInsertModel<typeof invoices>;
export type NewInvoiceItem = InferInsertModel<typeof invoiceItems>;
export type NewStockMovement = InferInsertModel<typeof stockMovements>;

