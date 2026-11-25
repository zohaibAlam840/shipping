// Deployment health check: `curl https://<host>/api/health`.
//
// Exists because an environment variable that is missing on the server is
// otherwise invisible — the pages render, and only a server action fails.
// It reports *whether* each variable is set and whether the database answers.
// It never returns a secret: only booleans, the public Supabase host, and a
// short error message when a query fails.
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** First bytes of the SHA-256 of a key: enough to compare two deployments,
 *  useless for reconstructing the key. */
function fingerprint(value: string | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function host(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "invalid URL";
  }
}

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    SUPABASE_SECRET_KEY: Boolean(process.env.SUPABASE_SECRET_KEY),
    PICKUP_CODE_SECRET: Boolean(process.env.PICKUP_CODE_SECRET),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
  };

  // A raw PostgREST call alongside the client call: supabase-js reports a
  // transport failure as an empty message, which says nothing about the cause.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  let rest: { status?: number; body?: string; error?: string } = {};
  if (url && key) {
    try {
      const res = await fetch(url + "/rest/v1/relays?select=id&limit=1", {
        headers: { apikey: key, Authorization: "Bearer " + key },
        cache: "no-store",
      });
      rest = { status: res.status, body: (await res.text()).slice(0, 300) };
    } catch (e) {
      rest = { error: (e instanceof Error ? e.name + ": " + e.message : String(e)).slice(0, 300) };
    }
  }

  // The publishable key is never exercised above, so a stale one would stay
  // invisible until a visitor hit the browser client.
  let publishable: { status?: number; body?: string; error?: string } = {};
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && pub) {
    try {
      const res = await fetch(url + "/rest/v1/relays?select=id&limit=1", {
        headers: { apikey: pub, Authorization: "Bearer " + pub },
        cache: "no-store",
      });
      publishable = { status: res.status, body: (await res.text()).slice(0, 200) };
    } catch (e) {
      publishable = { error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
    }
  }

  let database: { ok: boolean; relays?: number; error?: string };
  try {
    const { count, error } = await supabaseAdmin()
      .from("relays")
      .select("id", { count: "exact", head: true });
    database = error
      ? { ok: false, error: error.message.slice(0, 200) }
      : { ok: true, relays: count ?? 0 };
  } catch (e) {
    database = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
  }

  const ok = env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY && database.ok;

  return Response.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      supabaseHost: host(process.env.NEXT_PUBLIC_SUPABASE_URL),
      // Which *kind* of key is configured, never the key itself.
      secretKeyKind: key
        ? key.startsWith("sb_secret_")
          ? "sb_secret"
          : key.startsWith("eyJ")
            ? "legacy JWT"
            : "unrecognised"
        : null,
      env,
      database,
      rest,
      publishable,
      fingerprints: {
        SUPABASE_SECRET_KEY: fingerprint(key),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fingerprint(pub),
      },
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
