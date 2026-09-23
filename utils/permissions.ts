import type { ModulePermissions } from "@/db/schema/profiles";

export interface UserWithPermissions {
  id?: string;
  role?: string | null;
  customRoleName?: string | null;
  permissions?: ModulePermissions | Record<string, any> | null;
  [key: string]: any;
}

/**
 * Check if the user is authorized to access a specific store module.
 * - SUPER_ADMIN and OWNER have unrestricted access to all modules.
 * - Sensitive permissions ('settings', 'edit_orders', 'delete_orders') require explicit truthiness.
 * - Standard operational modules are permitted unless explicitly set to false in user's permissions.
 */
export function hasModulePermission(
  user: UserWithPermissions | null | undefined,
  moduleKey: keyof ModulePermissions
): boolean {
  if (!user || !user.role) return false;

  // Super Admin and Store Owners have full access to all modules
  if (user.role === "SUPER_ADMIN" || user.role === "OWNER") {
    return true;
  }

  // Non-shop managers cannot access shop console modules
  if (user.role !== "SHOP_MANAGER") {
    return false;
  }

  // If user has no permissions object defined
  if (!user.permissions) {
    // Only dashboard and support are open by default if permissions are missing
    return moduleKey === "dashboard" || moduleKey === "support";
  }

  const permValue = user.permissions[moduleKey];

  // Explicit denial
  if (permValue === false) {
    return false;
  }

  // Explicit approval
  if (permValue === true) {
    return true;
  }

  // Sensitive modules require explicit true
  if (
    moduleKey === "settings" ||
    moduleKey === "edit_orders" ||
    moduleKey === "delete_orders"
  ) {
    return false;
  }

  // Default true for general operational modules if undefined in legacy records
  return true;
}

/**
 * Check if the user is authorized to edit existing orders and invoices.
 */
export function canUserEditOrders(user?: UserWithPermissions | null): boolean {
  return hasModulePermission(user, "edit_orders");
}

/**
 * Check if the user is authorized to delete order records.
 */
export function canUserDeleteOrders(user?: UserWithPermissions | null): boolean {
  return hasModulePermission(user, "delete_orders");
}

/**
 * Map a route path to its corresponding module permission key.
 */
export function getModuleKeyForRoute(pathname: string): keyof ModulePermissions | null {
  if (pathname.startsWith("/shop/settings")) return "settings";
  if (pathname.startsWith("/shop/inventory")) return "inventory";
  if (pathname.startsWith("/shop/reports")) return "reports";
  if (pathname.startsWith("/shop/analytics")) return "analytics";
  if (pathname.startsWith("/shop/customers") || pathname.startsWith("/shop/patients")) return "customers";
  if (pathname.startsWith("/shop/appointments")) return "appointments";
  if (pathname.startsWith("/shop/purchases")) return "purchases";
  if (pathname.startsWith("/shop/returns")) return "returns";
  if (pathname.startsWith("/shop/orders") || pathname.startsWith("/shop/invoices")) return "sales";
  if (pathname.startsWith("/shop/support")) return "support";
  if (pathname.startsWith("/shop/dashboard")) return "dashboard";
  return null;
}

/**
 * Check if user is authorized to access a given URL path.
 */
export function canAccessRoute(user: UserWithPermissions | null | undefined, pathname: string): boolean {
  if (!user || !user.role) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "OWNER") return true;

  const moduleKey = getModuleKeyForRoute(pathname);
  if (!moduleKey) return true; // Non-module shop routes are accessible

  return hasModulePermission(user, moduleKey);
}
