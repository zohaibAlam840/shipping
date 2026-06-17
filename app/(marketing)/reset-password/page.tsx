"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The reset link arrives with a `?code=` to exchange for a session.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) supabase.auth.exchangeCodeForSession(code).catch(() => {});
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError("Lien expiré ou invalide. Veuillez redemander un lien.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/60 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-20">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Nouveau mot de passe</h1>
          <p className="mt-1.5 text-sm text-muted">Choisissez un nouveau mot de passe.</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8">
          {done ? (
            <div className="rounded-xl bg-brand-light/60 border border-brand/25 p-4 text-sm font-medium text-ink">
              Mot de passe mis à jour ! Redirection vers la connexion…
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Nouveau mot de passe">
                <input
                  type="password"
                  required
                  className={inputCls}
                  placeholder="Au moins 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="h-[52px] w-full rounded-full bg-brand font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
