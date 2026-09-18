"use client";

import { createClient } from "@/lib/supabase/client";
import { logout } from "@/actions/auth.actions";

/**
 * Universal robust logout function for all client components.
 * 1. Signs out from browser Supabase client (clearing localStorage and client tokens).
 * 2. Invokes server logout action to invalidate SSR cookies and session profile.
 * 3. Expire client-side document cookies as defense in depth.
 * 4. Executes full-page hard navigation to the specified redirect path (defaults to landing page '/').
 */
export async function performLogout(redirectTo: string = "/") {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[performLogout] Client signOut warning:", err);
  }

  try {
    await logout();
  } catch (err) {
    console.warn("[performLogout] Server logout action warning:", err);
  }

  try {
    if (typeof document !== "undefined") {
      document.cookie = "opt_session_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      document.cookie = "active_shop_context_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    }
  } catch {}

  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("om_cached_user");
      localStorage.removeItem("om_active_shop_id");
      localStorage.removeItem("om_user_session");
      localStorage.removeItem("OM_INVOICE_DRAFT");
      sessionStorage.clear();
    }
  } catch {}

  // Hard reload/redirect to guarantee zero residual React or IndexedDB memory state
  window.location.href = redirectTo;
}
