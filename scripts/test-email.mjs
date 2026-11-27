// Sends one real e-mail through Resend and prints the provider's verdict.
//   node scripts/test-email.mjs you@example.com
//
// Use it after setting RESEND_API_KEY / EMAIL_FROM to check the configuration
// before trusting the application's own sends, which are deliberately quiet.
process.loadEnvFile(".env.local");

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.mjs <recipient@example.com>");
  process.exit(1);
}

const key = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
if (!key || !from) {
  console.error("RESEND_API_KEY and EMAIL_FROM must both be set in .env.local.");
  process.exit(1);
}

console.log("from:", from);
console.log("to:  ", to);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from,
    to,
    subject: "YonelMa — test d'envoi",
    html: `<p>Ceci est un test d'envoi depuis YonelMa.</p>
           <p>Si vous recevez ce message, les notifications par e-mail fonctionnent.</p>`,
  }),
});

const body = await res.text();
console.log("\nHTTP", res.status);
console.log(body);

if (res.ok) {
  console.log("\n✓ Accepted by Resend. Check the inbox (and the spam folder).");
} else {
  console.log(
    "\n✗ Rejected. With the shared domain onboarding@resend.dev, Resend only" +
      "\n  delivers to the address that owns the account. Verify yonelma.fr to" +
      "\n  send to anyone else.",
  );
  process.exitCode = 1;
}
