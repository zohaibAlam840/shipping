// Full internal history of one parcel (SN-TRK-02, SN-TRK-03, AT-09).
//
// Unlike the public tracking page, this shows everything the ledger holds:
// who acted, in which role, whether the update was scanned / declared /
// imported, and any exception — including rejected code attempts.
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getParcelHistory } from "@/lib/ops";
import { PARCEL_STATUS_FR, type ParcelStatus } from "@/lib/parcels";
import { fmtDateTime } from "@/lib/data";
import { Card, PageTitle } from "@/components/ui";
import { BoxIcon, AlertIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const SOURCE_FR: Record<string, string> = {
  scanned: "Scanné",
  manual: "Saisie manuelle",
  declared: "Déclaré par le client",
  imported: "Importé partenaire",
  system: "Système",
};

const SOURCE_TONE: Record<string, string> = {
  scanned: "bg-brand-light text-brand border-brand/20",
  manual: "bg-amber-50 text-amber-700 border-amber-200",
  declared: "bg-slate-100 text-slate-600 border-slate-200",
  imported: "bg-indigo-50 text-indigo-700 border-indigo-200",
  system: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function AdminParcelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: parcel } = await supabaseAdmin()
    .from("parcels")
    .select(
      "*, orders(order_number, tracking_number, recipient_name, recipient_phone, recipient_address)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!parcel) notFound();

  const p = parcel as any;
  const history = await getParcelHistory(id);
  const status = p.status as ParcelStatus;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/operations" className="text-sm font-semibold text-brand">
        ← Opérations
      </Link>
      <div className="mt-3 mb-4">
        <PageTitle
          title={p.parcel_ref}
          subtitle={`${PARCEL_STATUS_FR[status]} · commande ${p.orders?.order_number ?? "—"}`}
        />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <BoxIcon width={18} height={18} /> Colis
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Poids</dt>
              <dd className="font-semibold text-ink">{p.weight_kg ?? "—"} kg</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Dimensions</dt>
              <dd className="font-semibold text-ink">{p.dimensions ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Contenu</dt>
              <dd className="font-semibold text-ink">{p.declared_contents ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Tentatives de livraison</dt>
              <dd className="font-semibold text-ink">{p.delivery_attempts ?? 0}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-bold text-ink">Destinataire et preuve</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Nom</dt>
              <dd className="font-semibold text-ink">{p.orders?.recipient_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Téléphone</dt>
              <dd className="font-semibold text-ink">{p.orders?.recipient_phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Preuve de remise</dt>
              <dd className="font-semibold text-ink">
                {p.delivery_proof === "recipient_code" ? "Code destinataire" : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Remis le</dt>
              <dd className="font-semibold text-ink">
                {p.delivered_at ? fmtDateTime(p.delivered_at) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Code envoyé</dt>
              <dd className="font-semibold text-ink">
                {p.pickup_code_sent_at ? fmtDateTime(p.pickup_code_sent_at) : "Non envoyé"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">
            Le code de retrait lui-même n&apos;est jamais affiché ici : il reste accessible
            uniquement depuis le compte de l&apos;expéditeur.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-ink">Historique complet ({history.length})</h2>
        <ol className="space-y-3">
          {history.map((e, i) => (
            <li key={`${e.at}-${i}`} className="rounded-xl border border-line p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{e.eventType}</p>
                  <p className="text-xs text-muted">
                    {fmtDateTime(e.at)}
                    {e.relayName ? ` · ${e.relayName}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    SOURCE_TONE[e.source] ?? SOURCE_TONE.manual
                  }`}
                >
                  {SOURCE_FR[e.source] ?? e.source}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Par <span className="font-semibold text-ink">{e.actorName || "—"}</span>
                {e.actorRole ? ` (${e.actorRole})` : ""}
                {e.resultingStatus ? ` → ${e.resultingStatus}` : ""}
              </p>
              {(e.exceptionNote || e.reason) && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  <AlertIcon width={14} height={14} className="mt-0.5 shrink-0" />
                  {e.exceptionCode ? `${e.exceptionCode} — ` : ""}
                  {e.exceptionNote || e.reason}
                </p>
              )}
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Aucun événement enregistré.
            </li>
          )}
        </ol>
      </Card>
    </div>
  );
}
