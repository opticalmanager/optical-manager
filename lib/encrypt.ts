import crypto from "crypto";

/**
 // AES-256-GCM Encryption / Decryption Helper
 // Uses process.env.EMAIL_ENCRYPTION_KEY or a fallback key derived from process.env.NEXTAUTH_SECRET
 */

function getEncryptionKey(): Buffer {
  const envKey = process.env.EMAIL_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "optical-manager-gmail-smtp-encryption-key-32b";
  // Always derive a strict 32-byte key using SHA-256 hash
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM
 * Returns formatted string: `${iv_hex}:${authTag_hex}:${cipherText_hex}`
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts string produced by encryptPassword
 */
export function decryptPassword(encryptedString: string): string {
  if (!encryptedString) return "";

  try {
    const parts = encryptedString.split(":");
    if (parts.length !== 3) {
      // Fallback for legacy plain text or raw passwords if any
      return encryptedString;
    }

    const [ivHex, authTagHex, cipherTextHex] = parts;
    const key = getEncryptionKey();

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[encrypt.ts] Decryption error:", error);
    return "";
  }
}
