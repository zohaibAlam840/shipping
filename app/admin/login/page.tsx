"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/actions";
import { Card, Field, inputCls } from "@/components/ui";
import { Logo } from "@/components/icons";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await loginAdmin(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Dynamic background gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-light/75 to-transparent"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center transform hover:scale-105 transition-transform duration-300">
            <Logo size={56} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink font-sora">
            YonelMa Admin
          </h1>
          <p className="mt-2 text-sm text-muted">
            Operations control & shipment management
          </p>
        </div>

        <Card className="p-6 shadow-lift sm:p-8 border-line relative overflow-hidden backdrop-blur-sm bg-card/95">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand to-brand-dark" />
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Field label="Username">
              <input
                type="text"
                name="username"
                required
                className={inputCls}
                placeholder="Enter admin username"
                autoComplete="username"
                disabled={loading}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                name="password"
                required
                className={inputCls}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 animate-in fade-in slide-in-from-top-2 duration-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative flex h-[52px] w-full items-center justify-center rounded-full bg-brand font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Log in to Console"
              )}
            </button>
          </form>
        </Card>

        <p className="mt-8 text-center text-xs text-muted">
          Secured with environment configuration.
        </p>
      </div>
    </div>
  );
}
