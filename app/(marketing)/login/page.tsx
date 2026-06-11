import Link from "next/link";
import { Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/60 to-transparent" aria-hidden />
      <div className="relative mx-auto w-full max-w-md px-4 py-12 sm:py-20">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Log in to manage your shipments.</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-lift sm:p-8">
          {/* Auth wiring comes with the backend phase */}
          <form className="space-y-4" action="/dashboard">
            <Field label="Email">
              <input type="email" className={inputCls} placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} placeholder="••••••••" />
            </Field>
            <div className="flex justify-end">
              <Link href="#" className="text-xs font-semibold text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              className="h-[52px] w-full rounded-full bg-brand font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Log in
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          New to YonelMa?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
