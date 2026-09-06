import type { ModulePermissions } from "@/db/schema/profiles";

export interface UserWithPermissions {
  id?: string;
  role?: string | null;
  permissions?: ModulePermissions | Record<string, any> | null;
  [key: string]: any;
}

/**
 * Check if the user is authorized to edit existing orders and invoices.
 * By default, ONLY OWNER and SUPER_ADMIN have access.
 * Store staff / managers require the explicit 'edit_orders' permission in their credentials.
 */
export function canUserEditOrders(user?: UserWithPermissions | null): boolean {
  if (!user || !user.role) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "OWNER") {
    return true;
  }
  return Boolean(user.permissions?.edit_orders === true);
}
