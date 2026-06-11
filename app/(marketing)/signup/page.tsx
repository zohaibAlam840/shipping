import Link from "next/link";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export const metadata = { title: "Create account" };

export default function SignupPage() {
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
          {/* Auth wiring comes with the backend phase */}
          <form className="space-y-4" action="/dashboard">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input className={inputCls} placeholder="Awa" />
              </Field>
              <Field label="Last name">
                <input className={inputCls} placeholder="Ndiaye" />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" className={inputCls} placeholder="you@example.com" />
            </Field>
            <Field label="Phone">
              <input type="tel" className={inputCls} placeholder="+33 6 12 34 56 78" />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} placeholder="At least 8 characters" />
            </Field>
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
              I agree to the privacy policy and consent to YonelMa processing my
              data to provide the shipping service (GDPR).
            </label>
            <button
              type="submit"
              className="h-[52px] w-full rounded-full bg-brand font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Create account
            </button>
          </form>
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
