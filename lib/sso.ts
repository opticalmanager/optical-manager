import crypto from "crypto";

export interface BroadcastSsoPayload {
  sub: string;
  email: string;
  fullName: string;
  organizationId: string;
  shopId: string | null;
  role: "OWNER";
  iat: number;
  exp: number;
  nonce: string;
}

function base64UrlEncode(str: string | Buffer): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export function getSsoSecret(): string {
  return (
    process.env.BROADCAST_SSO_SECRET ||
    "optical-manager-broadcast-sso-secret-key-2026"
  );
}

/**
 * Signs an SSO JWT token for Broadcast application.
 * Expiration: 300 seconds (5 minutes).
 * Strictly restricted to Store Owners (`role = 'OWNER'`).
 */
export function signSsoJwt(payload: {
  sub: string;
  email: string;
  fullName: string;
  organizationId: string;
  shopId: string | null;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: BroadcastSsoPayload = {
    ...payload,
    role: "OWNER",
    iat: now,
    exp: now + 300, // 5 minutes validity window
    nonce: crypto.randomUUID(),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const secret = getSsoSecret();
  
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies and decodes an SSO JWT token.
 * Returns payload if valid & role is OWNER, null otherwise.
 */
export function verifySsoJwt(token: string): BroadcastSsoPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const secret = getSsoSecret();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signatureInput)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (signature !== expectedSignature) {
      console.warn("[sso.ts] Invalid SSO JWT signature");
      return null;
    }

    const payload: BroadcastSsoPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      console.warn("[sso.ts] Expired SSO JWT token");
      return null;
    }

    if (payload.role !== "OWNER") {
      console.warn("[sso.ts] SSO token attempted by non-OWNER role:", payload.role);
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[sso.ts] Error verifying SSO JWT:", error);
    return null;
  }
}
