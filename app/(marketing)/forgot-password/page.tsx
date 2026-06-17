"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/auth-actions";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/60 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-20">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Mot de passe oublié</h1>
          <p className="mt-1.5 text-sm text-muted">
            Saisissez votre e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8">
          {state?.info ? (
            <div className="rounded-xl bg-brand-light/60 border border-brand/25 p-4 text-sm font-medium text-ink">
              {state.info}{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Retour à la connexion →
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <Field label="E-mail">
                <input name="email" type="email" required className={inputCls} placeholder="vous@exemple.com" />
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
                {pending ? "Envoi…" : "Envoyer le lien"}
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
