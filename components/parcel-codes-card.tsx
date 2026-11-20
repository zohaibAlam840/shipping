"use client";

import { useState } from "react";
import Link from "next/link";
import { PARCEL_STATUS_FR, type ParcelStatus } from "@/lib/parcels";
import { Card } from "@/components/ui";
import { BoxIcon, ClipboardIcon } from "@/components/icons";

export interface ParcelCodeRow {
  id: string;
  parcelRef: string;
  seq: number;
  status: ParcelStatus;
  weightKg: number | null;
  /** Null when the code can't be decrypted (key rotated) — regenerate it. */
  code: string | null;
}

/**
 * The sender's own parcels and their pickup codes (founder answer 2).
 *
 * Codes are hidden until the sender asks to see them, so an over-the-shoulder
 * glance or a shared screen doesn't give them away. This panel exists only in
 * the authenticated account — the public tracking page never shows a code.
 */
export function ParcelCodesCard({
  parcels,
  orderId,
}: {
  parcels: ParcelCodeRow[];
  orderId: string;
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  if (parcels.length === 0) return null;

  async function copy(ref: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(ref);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked — the code is visible on screen anyway.
    }
  }

  return (
    <Card className="mb-4 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-ink">
          Colis et codes de retrait ({parcels.length})
        </h2>
        <Link
          href={`/shipments/${orderId}/labels`}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          <ClipboardIcon width={16} height={16} /> Étiquettes
        </Link>
      </div>

      <p className="mb-4 rounded-xl bg-brand-light p-3 text-xs text-brand">
        Le code de retrait est confidentiel. Il est envoyé par e-mail au destinataire dès que
        le colis est disponible, et vous pouvez aussi le lui transmettre vous-même. Il
        n&apos;apparaît jamais sur la page de suivi publique.
      </p>

      <div className="space-y-2">
        {parcels.map((p) => (
          <div key={p.id} className="rounded-xl border border-line p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <BoxIcon width={16} height={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  Colis {p.seq} · {p.parcelRef}
                </p>
                <p className="text-xs text-muted">
                  {p.weightKg ? `${p.weightKg} kg · ` : ""}
                  {PARCEL_STATUS_FR[p.status]}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              {p.code ? (
                revealed[p.id] ? (
                  <>
                    <span className="font-mono text-xl font-bold tracking-[0.3em] text-ink">
                      {p.code}
                    </span>
                    <button
                      onClick={() => copy(p.parcelRef, p.code!)}
                      className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      {copied === p.parcelRef ? "Copié ✓" : "Copier"}
                    </button>
                    <button
                      onClick={() => setRevealed({ ...revealed, [p.id]: false })}
                      className="h-9 rounded-full px-2 text-xs font-semibold text-muted"
                    >
                      Masquer
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xl font-bold tracking-[0.3em] text-muted">
                      ••••••
                    </span>
                    <button
                      onClick={() => setRevealed({ ...revealed, [p.id]: true })}
                      className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                    >
                      Afficher le code
                    </button>
                  </>
                )
              ) : (
                <span className="text-xs text-muted">Code indisponible — contactez le support.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
