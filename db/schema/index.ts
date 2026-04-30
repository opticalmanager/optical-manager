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
export { customers } from "./customers";
export { prescriptions } from "./prescriptions";
export { inventory, inventoryCategoryEnum } from "./inventory";
export {
  invoices,
  invoiceStatusEnum,
  paymentMethodEnum,
} from "./invoices";
