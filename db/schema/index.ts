/**
 * Central schema barrel file.
 * Re-exports all tables, enums, and relations for Drizzle ORM.
 */

// Tables
export { organizations } from "./organizations";
export { profiles, userRoleEnum } from "./profiles";
export { shops } from "./shops";
export {
  subscriptions,
  subscriptionPlanEnum,
  subscriptionStatusEnum,
} from "./subscriptions";
export {
  customers,
  genderEnum,
  bloodGroupEnum,
} from "./customers";
export {
  prescriptions,
  prescriptionTypeEnum,
} from "./prescriptions";
export { inventory, inventoryCategoryEnum } from "./inventory";
export { frameDetails } from "./frame-details";
export {
  invoices,
  invoiceStatusEnum,
  paymentMethodEnum,
} from "./invoices";
export { invoiceItems } from "./invoice-items";
