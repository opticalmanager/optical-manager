/**
 * Authentication-related TypeScript types.
 */

export type UserRole = "OWNER" | "SHOP_MANAGER";

/**
 * Represents the authenticated user's session data.
 * This is the shape returned after fetching the profile from the DB.
 */
export interface SessionUser {
  id: string; // auth.users.id
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  shopId: string | null; // null for OWNER
  avatarUrl: string | null;
  isActive: boolean;
}

/**
 * Auth state used in the application context.
 */
export interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Signup form data shape.
 */
export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

/**
 * Login form data shape.
 */
export interface LoginData {
  email: string;
  password: string;
}
