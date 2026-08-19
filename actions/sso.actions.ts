"use server";

import { getCurrentUser } from "@/services/auth.service";
import { signSsoJwt } from "@/lib/sso";

/**
 * Server Action to generate a secure Broadcast SSO URL.
 * Allows Store Owners & Admins (`role === 'OWNER' || role === 'SUPER_ADMIN'`) to generate tokens.
 */
export async function generateBroadcastSsoUrl() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    if (user.role !== "OWNER" && user.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Access Denied: Broadcast features are exclusively available to Store Owners & Admins.",
      };
    }

    if (!user.organizationId) {
      return { success: false, error: "Invalid organization context." };
    }

    const token = signSsoJwt({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      shopId: user.shopId || null,
    });

    const defaultDevUrl = "http://localhost:3001";
    const defaultProdUrl = "https://broadcasting.opticalmanager.in";
    const broadcastBaseUrl =
      process.env.NEXT_PUBLIC_BROADCAST_APP_URL ||
      (process.env.NODE_ENV === "development" ? defaultDevUrl : defaultProdUrl);

    // Endpoint points to Next.js Route Handler /api/auth/sso for cookie setting
    const ssoUrl = `${broadcastBaseUrl}/api/auth/sso?token=${encodeURIComponent(token)}`;

    return { success: true, url: ssoUrl };
  } catch (error: any) {
    console.error("[sso.actions] Error generating Broadcast SSO URL:", error);
    return {
      success: false,
      error: error.message || "Failed to generate SSO token.",
    };
  }
}
