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
export { lensDetails } from "./lens-details";
export { contactLensDetails } from "./contact-lens-details";
export { accessoryDetails } from "./accessory-details";
export {
  invoices,
  invoiceStatusEnum,
  paymentMethodEnum,
  fulfillmentStatusEnum,
} from "./invoices";
export { invoiceItems } from "./invoice-items";
export { stockMovements, movementTypeEnum } from "./stock-movements";
export { receipts } from "./receipts";
export { orders } from "./orders";
export { appointmentConfigs } from "./appointment-configs";
export { appointments, appointmentStatusEnum } from "./appointments";

