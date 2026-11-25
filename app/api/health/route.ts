// Deployment health check: `curl https://<host>/api/health`.
//
// Exists because an environment variable that is missing on the server is
// otherwise invisible — the pages render, and only a server action fails.
// It reports *whether* each variable is set and whether the database answers.
// It never returns a secret: only booleans, the public Supabase host, and a
// short error message when a query fails.
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      env,
      database,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
