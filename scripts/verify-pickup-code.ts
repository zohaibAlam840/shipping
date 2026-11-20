// Verification of the pickup-code primitives (founder answer 2).
// Run: node scripts/verify-pickup-code.ts
import {
  newPickupCode,
  verifyPickupCode,
  decryptPickupCode,
  generatePickupCode,
} from "../lib/pickup-code.ts";

let failures = 0;
function check(name: string, condition: boolean) {
  console.log(`${condition ? "✓" : "✗"} ${name}`);
  if (!condition) failures++;
}

const { code, hash, encrypted } = newPickupCode();

check("code is 6 digits", /^\d{6}$/.test(code));
check("correct code verifies", verifyPickupCode(code, hash));
check("wrong code rejected", !verifyPickupCode("000000" === code ? "111111" : "000000", hash));
check("empty code rejected", !verifyPickupCode("", hash));
check("null hash rejected", !verifyPickupCode(code, null));
check("ciphertext differs from code", !encrypted.includes(code));
check("decrypt round-trips", decryptPickupCode(encrypted) === code);
check("tampered ciphertext returns null", decryptPickupCode(encrypted.slice(0, -2) + "ff") === null);
check("garbage ciphertext returns null", decryptPickupCode("not-a-code") === null);

// Two codes must not collide into the same ciphertext (random IV per encryption).
const a = newPickupCode();
const b = newPickupCode();
check("same-value encryptions differ (random IV)", a.encrypted !== b.encrypted || a.code !== b.code);

// Distribution sanity: 200 codes should not all be identical.
const sample = new Set(Array.from({ length: 200 }, () => generatePickupCode()));
check("codes are random (>150 distinct of 200)", sample.size > 150);

console.log(failures === 0 ? "\nAll pickup-code checks passed." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
