// One-time pickup codes (SN-SCAN-05, founder answer 2 of 20 Nov 2026).
//
// The founder's requirements pull in two directions:
//   - the sender must be able to re-read the code from their private account
//     at any time, and the recipient receives it by email;
//   - the code is the sole proof of collection, so it must never be guessable,
//     never appear on the public tracking page, and never leak from a database
//     dump in usable form.
//
// So each code is stored twice: a salted SHA-256 hash for constant-time
// verification, and AES-256-GCM ciphertext that only the server can decrypt,
// and only for the authenticated sender or an administrator.
import { createHash, randomInt, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Encryption key. PICKUP_CODE_SECRET is the proper setting; falling back to a
 * key derived from the Supabase secret means the feature still works in the
 * demo environment without an extra variable. Rotating either value makes
 * existing codes unreadable (they can be regenerated).
 */
function key(): Buffer {
  const secret =
    process.env.PICKUP_CODE_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    "yonelma-development-only";
  return createHash("sha256").update(`pickup-code:${secret}`).digest();
}

/** 6 digits, uniformly random — short enough to read out over the phone. */
export function generatePickupCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashPickupCode(code: string): string {
  return createHash("sha256").update(`${key().toString("hex")}:${code.trim()}`).digest("hex");
}

/** Constant-time comparison — never use === on a secret. */
export function verifyPickupCode(code: string, storedHash: string | null): boolean {
  if (!storedHash || !code?.trim()) return false;
  const candidate = Buffer.from(hashPickupCode(code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Ciphertext as "iv:authTag:payload", all hex. */
export function encryptPickupCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt for display. Returns null rather than throwing when the ciphertext
 * is absent or the key has changed, so a caller can simply show "unavailable"
 * and offer to regenerate.
 */
export function decryptPickupCode(stored: string | null): string | null {
  if (!stored) return null;
  try {
    const [ivHex, tagHex, payloadHex] = stored.split(":");
    if (!ivHex || !tagHex || !payloadHex) return null;
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(payloadHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** A fresh code in all three forms, ready to store. */
export function newPickupCode(): { code: string; hash: string; encrypted: string } {
  const code = generatePickupCode();
  return { code, hash: hashPickupCode(code), encrypted: encryptPickupCode(code) };
}
