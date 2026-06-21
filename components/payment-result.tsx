"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayButton } from "@/components/pay-button";

// Animated SVG check (success) or cross (cancelled).
function ResultMark({ kind }: { kind: "success" | "cancel" }) {
  const ok = kind === "success";
  const color = ok ? "var(--brand)" : "#dc2626";
  return (
    <span className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
      {/* pulsing ring */}
      <span
        className="pr-ring absolute inset-0 rounded-full"
        style={{ backgroundColor: ok ? "var(--brand)" : "#dc2626" }}
      />
      <span
        className="pr-pop relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{ backgroundColor: ok ? "var(--brand-light)" : "#fee2e2" }}
      >
        <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
          <circle
            className="pr-circle"
            cx="46"
            cy="46"
            r="40"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            transform="rotate(-90 46 46)"
          />
          {ok ? (
            <path
              className="pr-mark"
              d="M29 47.5 L41 59 L64 34"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <path
                className="pr-mark"
                d="M34 34 L58 58"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                className="pr-mark"
                d="M58 34 L34 58"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </span>
    </span>
  );
}

export function PaymentResult({
  kind,
  paid,
  orderId,
  orderNumber,
  totalLabel,
  routeLabel,
  stripeEnabled,
}: {
  kind: "success" | "cancel";
  paid: boolean;
  orderId: string;
  orderNumber: string;
  totalLabel: string;
  routeLabel: string;
  stripeEnabled: boolean;
}) {
  const router = useRouter();
  const tries = useRef(0);

  // After a successful checkout the order is marked Paid by the Stripe webhook,
  // which can lag a second or two. Re-fetch the page a few times until it lands.
  useEffect(() => {
    if (kind !== "success" || paid) return;
    const t = setInterval(() => {
      tries.current += 1;
      if (tries.current > 6) {
        clearInterval(t);
        return;
      }
      router.refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [kind, paid, router]);

  const success = kind === "success";

  return (
    <div className="mx-auto max-w-md text-center py-10">
      <ResultMark kind={kind} />

      <h1 className="text-2xl font-bold text-ink">
        {success ? "Paiement réussi !" : "Paiement annulé"}
      </h1>

      <p className="text-muted mt-2">
        {success ? (
          paid ? (
            <>
              Merci ! Votre paiement de{" "}
              <span className="font-bold text-ink">{totalLabel}</span> a bien été reçu.
            </>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              Paiement reçu — confirmation en cours…
            </span>
          )
        ) : (
          <>Aucun montant n&apos;a été débité. Vous pouvez réessayer quand vous le souhaitez.</>
        )}
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-left shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Commande</span>
          <span className="font-mono font-bold text-ink">{orderNumber}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted">Trajet</span>
          <span className="font-semibold text-ink">{routeLabel}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted">Montant</span>
          <span className="text-xl font-bold text-brand">{totalLabel}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {!success && stripeEnabled && (
          <PayButton
            orderId={orderId}
            className="w-full"
            label={`Réessayer le paiement de ${totalLabel}`}
          />
        )}
        <Link
          href={`/shipments/${orderId}`}
          className="flex h-12 items-center justify-center rounded-full bg-brand font-semibold text-white transition hover:bg-brand-dark"
        >
          Voir mon envoi
        </Link>
        <Link
          href="/dashboard"
          className="flex h-12 items-center justify-center rounded-full border border-line bg-card font-semibold text-ink transition hover:border-brand/40"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
