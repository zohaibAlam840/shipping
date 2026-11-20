"use client";

import { useState, useTransition } from "react";
import { fmtDate, fmtDateTime } from "@/lib/data";
import { trackByCode, trackParcels } from "@/app/actions";
import type { PublicTracking } from "@/lib/tracking";
import type { Order } from "@/lib/data";
import { Card, PageTitle, StatusBadge, Timeline, inputCls } from "@/components/ui";
import { SearchIcon, BoxIcon, PinIcon, ClockIcon, CheckIcon } from "@/components/icons";

/**
 * Public tracking (spec §7, SN-TRK-01).
 *
 * Domestic shipments are tracked parcel by parcel from the custody ledger.
 * International (France → Sénégal) orders keep the existing order-level
 * timeline, so both routes work from one page.
 *
 * The pickup code is NEVER shown here — it lives in the sender's account and
 * in the recipient's email only (founder answer 2).
 */
export default function TrackPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PublicTracking | null | "notfound">(null);
  const [legacy, setLegacy] = useState<Order | null>(null);
  const [pending, startTransition] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const parcels = await trackParcels(code);
      if (parcels && parcels.parcels.length > 0) {
        setResult(parcels);
        setLegacy(null);
        return;
      }
      // No parcel rows → an order booked before the domestic module.
      const order = await trackByCode(code);
      if (order) {
        setLegacy(order);
        setResult(null);
      } else {
        setResult("notfound");
        setLegacy(null);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <PageTitle
        title="Suivez votre colis"
        subtitle="Saisissez votre numéro de suivi (ex. YMT-7F2K9Q)."
      />

      <form onSubmit={search} className="flex gap-2">
        <input
          className={inputCls}
          placeholder="YMT-XXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
        >
          <SearchIcon width={18} height={18} />
          <span className="hidden sm:inline">{pending ? "Recherche…" : "Suivre"}</span>
        </button>
      </form>

      <p className="mt-2 text-xs text-muted">
        Vous trouverez ce code sur votre confirmation de réservation.
      </p>

      {result === "notfound" && (
        <Card className="mt-6 p-6 text-center">
          <BoxIcon width={32} height={32} className="mx-auto mb-2 text-muted" />
          <p className="font-semibold text-ink">Aucun colis trouvé</p>
          <p className="mt-1 text-sm text-muted">
            Vérifiez le code sur votre e-mail de confirmation et réessayez.
          </p>
        </Card>
      )}

      {/* Domestic: one timeline per parcel */}
      {result && result !== "notfound" && (
        <div className="mt-6 space-y-4">
          <Card className="p-5">
            <p className="text-xs font-medium text-muted">
              {result.trackingNumber} · réservé le {fmtDate(result.bookedAt)}
            </p>
            <p className="mt-0.5 text-lg font-bold text-ink">{result.routeLabel}</p>
            <p className="text-sm text-muted">
              {result.parcelCount} colis · destinataire {result.recipientName}
            </p>
            {result.estimatedFrom && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-light p-3 text-sm text-brand">
                <ClockIcon width={16} height={16} />
                Retrait estimé entre {fmtDate(result.estimatedFrom)} et{" "}
                {fmtDate(result.estimatedTo ?? result.estimatedFrom)}
              </p>
            )}
          </Card>

          {result.parcels.map((p) => (
            <Card key={p.parcelRef} className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">
                    Colis {p.seq} · {p.parcelRef}
                  </p>
                  {p.weightKg != null && (
                    <p className="text-xs text-muted">{p.weightKg} kg</p>
                  )}
                </div>
                <span className="rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                  {p.statusFr}
                </span>
              </div>

              {p.pickup && (
                <div className="mb-4 rounded-xl border border-brand/20 bg-brand-light p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-brand">
                    <PinIcon width={16} height={16} /> Disponible chez {p.pickup.relayName}
                  </p>
                  <p className="mt-1 text-sm text-brand/90">
                    {p.pickup.address}
                    {p.pickup.town ? `, ${p.pickup.town}` : ""}
                  </p>
                  {p.pickup.hours && (
                    <p className="mt-1 text-xs text-brand/80">Horaires : {p.pickup.hours}</p>
                  )}
                  <p className="mt-2 text-xs font-medium text-brand/80">
                    Présentez votre code de retrait confidentiel au commerçant.
                  </p>
                </div>
              )}

              <ol className="space-y-3">
                {p.events.map((e, i) => {
                  const last = i === p.events.length - 1;
                  return (
                    <li key={`${e.label}-${e.at}-${i}`} className="flex gap-3">
                      <span
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          last ? "bg-brand text-white" : "bg-brand-light text-brand"
                        }`}
                      >
                        <CheckIcon width={12} height={12} />
                      </span>
                      <div>
                        <p className={`text-sm ${last ? "font-bold text-ink" : "font-medium text-ink"}`}>
                          {e.label}
                        </p>
                        <p className="text-xs text-muted">
                          {fmtDateTime(e.at)}
                          {e.relayName ? ` · ${e.relayName}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {p.events.length === 0 && (
                  <li className="text-sm text-muted">Aucun événement enregistré pour le moment.</li>
                )}
              </ol>
            </Card>
          ))}
        </div>
      )}

      {/* International: the existing order-level timeline */}
      {legacy && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">
                {legacy.orderNumber} · réservé le {fmtDate(legacy.date)}
              </p>
              <p className="mt-0.5 text-lg font-bold text-ink">
                {legacy.origin} → {legacy.destination}
              </p>
            </div>
            <StatusBadge status={legacy.status} incident={legacy.incident} />
          </div>
          <Timeline log={legacy.log} current={legacy.status} />
        </Card>
      )}
    </div>
  );
}
