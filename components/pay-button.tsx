"use client";

import { useState, useTransition } from "react";
import { createCheckout } from "@/app/payment-actions";

export function PayButton({
  orderId,
  className = "",
  label = "Payer en ligne",
}: {
  orderId: string;
  className?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const res = await createCheckout(orderId);
      if (res.url) window.location.href = res.url;
      else setError(res.error ?? "Erreur de paiement.");
    });
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={pending}
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 ${className}`}
      >
        {pending ? "Redirection…" : label}
      </button>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
