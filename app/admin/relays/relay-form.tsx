"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRelay } from "@/app/admin/admin-actions";
import { RELAY_STATUS_FR, COMMERCIAL_STATUS_FR, type Relay, type RelayStatus } from "@/lib/relays";
import { WEEKDAY_FR, type CommercialStatus, type Zone } from "@/lib/sn-shared";
import { Card, Field, inputCls } from "@/components/ui";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Opening hours are stored as { "1": "09:00-19:00", … } keyed by ISO weekday.
 * An empty value means the shop is closed that day, and the open-days list is
 * derived from it so the administrator only fills in one set of fields.
 */
function initialHours(relay?: Relay): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of DAYS) out[String(d)] = relay?.openingHours?.[String(d)] ?? "";
  return out;
}

export function RelayForm({
  relay,
  zones,
  defaultCode,
}: {
  relay?: Relay;
  zones: Zone[];
  /** Suggested code for a brand new shop (next in the YM-SN-Rnnn series). */
  defaultCode?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(relay?.code ?? defaultCode ?? "");
  const [name, setName] = useState(relay?.name ?? "");
  const [zoneId, setZoneId] = useState(relay?.zoneId ?? zones[0]?.id ?? "");
  const [region, setRegion] = useState(relay?.region ?? "");
  const [town, setTown] = useState(relay?.town ?? "");
  const [neighborhood, setNeighborhood] = useState(relay?.neighborhood ?? "");
  const [address, setAddress] = useState(relay?.address ?? "");
  const [contactName, setContactName] = useState(relay?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(relay?.contactPhone ?? "");
  const [capacity, setCapacity] = useState(relay?.capacity ? String(relay.capacity) : "");
  const [cutoff, setCutoff] = useState(relay?.collectionCutoff ?? "");
  const [hours, setHours] = useState<Record<string, string>>(initialHours(relay));
  const [services, setServices] = useState<string[]>(relay?.permittedServices ?? ["domestic"]);
  const [status, setStatus] = useState<RelayStatus>(relay?.status ?? "draft");
  const [commercial, setCommercial] = useState<CommercialStatus>(relay?.commercialStatus ?? "test");
  const [notes, setNotes] = useState(relay?.notes ?? "");

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function submit() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const openingDays = DAYS.filter((d) => hours[String(d)]?.trim());
      const res = await saveRelay({
        id: relay?.id,
        code,
        name,
        zoneId: zoneId || null,
        region,
        town,
        neighborhood,
        address,
        contactName,
        contactPhone,
        capacity: capacity ? Number(capacity) : null,
        collectionCutoff: cutoff || null,
        openingHours: hours,
        openingDays,
        permittedServices: services,
        status,
        commercialStatus: commercial,
        notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMsg("Enregistré ✓");
      if (!relay && res.id) router.push(`/admin/relays/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 font-bold text-ink">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" hint="Identifiant unique, ex. YM-SN-R003">
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Nom de la boutique">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Zone tarifaire">
            <select className={inputCls} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">— Aucune —</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Région">
            <input className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)} />
          </Field>
          <Field label="Ville">
            <input className={inputCls} value={town} onChange={(e) => setTown(e.target.value)} />
          </Field>
          <Field label="Quartier">
            <input
              className={inputCls}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Adresse complète">
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-ink">Contact et capacité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsable">
            <input
              className={inputCls}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </Field>
          <Field label="Téléphone">
            <input
              className={inputCls}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
          <Field label="Capacité indicative" hint="Nombre de colis stockables sur place">
            <input
              className={inputCls}
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
          <Field
            label="Heure limite de dépôt"
            hint="Laissez vide pour utiliser l'heure limite du réseau"
          >
            <input
              type="time"
              className={inputCls}
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink">Horaires d&apos;ouverture</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Les clients peuvent déposer et retirer tous les jours d&apos;ouverture de la boutique.
          Laissez vide pour indiquer un jour de fermeture.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DAYS.map((d) => (
            <Field key={d} label={WEEKDAY_FR[d]}>
              <input
                className={inputCls}
                placeholder="09:00-19:00"
                value={hours[String(d)] ?? ""}
                onChange={(e) => setHours({ ...hours, [String(d)]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-ink">Services et statut</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "domestic", label: "Envois nationaux" },
            { key: "international", label: "Envois internationaux" },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleService(s.key)}
              className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                services.includes(s.key)
                  ? "border-brand bg-brand-light text-brand"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut opérationnel">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as RelayStatus)}
            >
              {(Object.keys(RELAY_STATUS_FR) as RelayStatus[]).map((s) => (
                <option key={s} value={s}>
                  {RELAY_STATUS_FR[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Ouverture commerciale"
            hint="« Test » reste disponible pour la démonstration sans être vendu aux clients"
          >
            <select
              className={inputCls}
              value={commercial}
              onChange={(e) => setCommercial(e.target.value as CommercialStatus)}
            >
              {(Object.keys(COMMERCIAL_STATUS_FR) as CommercialStatus[]).map((s) => (
                <option key={s} value={s}>
                  {COMMERCIAL_STATUS_FR[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes internes">
            <textarea
              className={`${inputCls} h-24 resize-none py-2.5`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-xl border border-brand/20 bg-brand-light p-3.5 text-sm font-semibold text-brand">
          {msg}
        </p>
      )}

      <button
        onClick={submit}
        disabled={pending}
        className="h-12 w-full rounded-full bg-brand font-semibold text-white transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : relay ? "Enregistrer les modifications" : "Créer le point relais"}
      </button>
    </div>
  );
}
