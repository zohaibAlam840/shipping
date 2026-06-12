"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupCustomer } from "@/app/auth-actions";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupCustomer, null);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/60 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-20">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Book and track parcels in minutes.</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8">
          {state?.info ? (
            <div className="rounded-xl bg-brand-light/60 border border-brand/25 p-4 text-sm font-medium text-ink">
              {state.info}{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Go to login →
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input name="firstName" className={inputCls} placeholder="Awa" />
                </Field>
                <Field label="Last name">
                  <input name="lastName" className={inputCls} placeholder="Ndiaye" />
                </Field>
              </div>
              <Field label="Email">
                <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
              </Field>
              <Field label="Phone">
                <input name="phone" type="tel" className={inputCls} placeholder="+33 6 12 34 56 78" />
              </Field>
              <Field label="Password">
                <input name="password" type="password" required className={inputCls} placeholder="At least 8 characters" />
              </Field>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                <input name="consent" type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
                I agree to the privacy policy and consent to YonelMa processing my
                data to provide the shipping service (GDPR).
              </label>
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
                {pending ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
