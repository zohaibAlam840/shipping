"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginCustomer } from "@/app/auth-actions";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginCustomer, null);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/60 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-20">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Bon retour</h1>
          <p className="mt-1.5 text-sm text-muted">Connectez-vous pour gérer vos envois.</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8">
          <form action={action} className="space-y-4">
            <Field label="E-mail">
              <input name="email" type="email" required className={inputCls} placeholder="vous@exemple.com" />
            </Field>
            <Field label="Mot de passe">
              <input name="password" type="password" required className={inputCls} placeholder="••••••••" />
            </Field>
            {state?.error && (
              <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="h-[52px] w-full rounded-full bg-brand font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Nouveau sur YonelMa ?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
