"use client";

import { xof } from "@/lib/sn-shared";

/**
 * Printable parcel labels (SN-NAT-05, founder answer 1).
 *
 * One label per parcel, each carrying its own reference and QR code. The QR
 * encodes the opaque token only — never a name, phone number or address
 * (SN-SCAN-01) — so a label found in the street reveals nothing about the
 * people involved.
 */
export interface LabelData {
  parcelRef: string;
  /** Pre-rendered QR SVG markup (generated on the server). */
  qrSvg: string;
  seq: number;
  totalParcels: number;
  weightKg: number | null;
  dimensions: string | null;
  contents: string | null;
  orderNumber: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  price?: number | null;
}

export function ParcelLabels({ labels }: { labels: LabelData[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted">
          {labels.length} étiquette(s) · imprimez puis collez une étiquette par colis.
        </p>
        <button
          onClick={() => window.print()}
          className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Imprimer les étiquettes
        </button>
      </div>

      <div className="space-y-4 print:space-y-0">
        {labels.map((l) => (
          <div
            key={l.parcelRef}
            className="break-inside-avoid rounded-2xl border-2 border-ink bg-white p-5 print:mb-4 print:break-after-page print:rounded-none"
          >
            <div className="flex items-start justify-between border-b-2 border-ink pb-3">
              <div>
                <p className="text-xl font-black tracking-tight text-ink">YonelMa</p>
                <p className="text-xs font-semibold text-ink">
                  Colis {l.seq} / {l.totalParcels} · {l.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-ink">Destination</p>
                <p className="text-lg font-black uppercase text-ink">{l.destination}</p>
              </div>
            </div>

            <div className="flex gap-4 py-4">
              <div
                className="h-36 w-36 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: l.qrSvg }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-black tracking-tight text-ink">{l.parcelRef}</p>
                <dl className="mt-2 space-y-1 text-sm text-ink">
                  <div className="flex gap-2">
                    <dt className="font-semibold">Destinataire :</dt>
                    <dd>{l.recipientName}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold">Téléphone :</dt>
                    <dd>{l.recipientPhone}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold">Expéditeur :</dt>
                    <dd>{l.senderName}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold">Poids :</dt>
                    <dd>
                      {l.weightKg ?? "—"} kg{l.dimensions ? ` · ${l.dimensions}` : ""}
                    </dd>
                  </div>
                  {l.contents && (
                    <div className="flex gap-2">
                      <dt className="font-semibold">Contenu :</dt>
                      <dd className="truncate">{l.contents}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-ink pt-3 text-xs font-semibold text-ink">
              <span>Retrait sur présentation du code confidentiel</span>
              {l.price != null && <span>{xof(l.price)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
