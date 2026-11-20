"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  findPricingRule,
  serviceTypeFor,
  xof,
  type PricingRuleSN,
} from "@/lib/sn-shared";
import {
  createDomesticOrder,
  type CollectionMode,
  type DeliveryMode,
  type DomesticBookingResult,
} from "@/app/sn-actions";
import { Card, Field, PageTitle, inputCls } from "@/components/ui";
import { PlusIcon, BoxIcon, PinIcon, CheckIcon, ClockIcon } from "@/components/icons";

/** A relay as the booking screen needs it — no internal fields exposed. */
export interface BookableRelay {
  id: string;
  code: string;
  name: string;
  town: string;
  neighborhood: string | null;
  address: string;
  zoneId: string | null;
  hours: string;
}

interface ParcelDraft {
  weight: string;
  length: string;
  width: string;
  height: string;
  contents: string;
  declaredValue: string;
}

const emptyParcel = (): ParcelDraft => ({
  weight: "",
  length: "",
  width: "",
  height: "",
  contents: "",
  declaredValue: "",
});

const STEPS = ["Trajet", "Colis", "Destinataire", "Récapitulatif"] as const;

export function SenegalBooking({
  relays,
  rules,
  schedule,
}: {
  relays: BookableRelay[];
  rules: PricingRuleSN[];
  schedule: { transportDate: string | null; deliveryFrom: string | null; deliveryTo: string | null };
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DomesticBookingResult | null>(null);

  const [collection, setCollection] = useState<CollectionMode>("relay_dropoff");
  const [delivery, setDelivery] = useState<DeliveryMode>("relay_pickup");
  const [originTown, setOriginTown] = useState("");
  const [destTown, setDestTown] = useState("");
  const [originRelayId, setOriginRelayId] = useState("");
  const [destRelayId, setDestRelayId] = useState("");

  const [parcels, setParcels] = useState<ParcelDraft[]>([emptyParcel()]);

  const [recipient, setRecipient] = useState({ name: "", phone: "", email: "", address: "" });
  const [senderPhone, setSenderPhone] = useState("");

  const towns = [...new Set(relays.map((r) => r.town))].sort();
  const originOptions = relays.filter((r) => !originTown || r.town === originTown);
  const destOptions = relays.filter((r) => !destTown || r.town === destTown);
  const originRelay = relays.find((r) => r.id === originRelayId);
  const destRelay = relays.find((r) => r.id === destRelayId);
  const serviceType = serviceTypeFor(collection, delivery);

  // Indicative price. The server recomputes it authoritatively on submit, so
  // a tampered client can never change what is charged.
  const lines = parcels.map((p) => {
    const w = Number(p.weight) || 0;
    const originZoneId = originRelay?.zoneId ?? destRelay?.zoneId ?? "";
    const destinationZoneId = destRelay?.zoneId ?? originRelay?.zoneId ?? "";
    if (!w || !originZoneId || !destinationZoneId) return null;
    return findPricingRule(rules, { originZoneId, destinationZoneId, serviceType, weightKg: w });
  });
  const priced = lines.every((l) => l !== null) && parcels.length > 0;
  const total = lines.reduce((sum, l) => sum + (l?.price ?? 0), 0);

  const trajetValid =
    (collection !== "relay_dropoff" || Boolean(originRelayId)) &&
    (delivery !== "relay_pickup" || Boolean(destRelayId));
  const parcelsValid = parcels.every((p) => Number(p.weight) > 0 && p.contents.trim());
  const recipientValid =
    recipient.name.trim() &&
    recipient.phone.trim() &&
    (delivery !== "home_delivery" || recipient.address.trim());

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createDomesticOrder({
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          email: recipient.email || undefined,
          address: recipient.address || undefined,
        },
        senderPhone: senderPhone || undefined,
        collectionMode: collection,
        deliveryMode: delivery,
        originRelayId: collection === "relay_dropoff" ? originRelayId : undefined,
        destinationRelayId: delivery === "relay_pickup" ? destRelayId : undefined,
        parcels: parcels.map((p) => ({
          weightKg: Number(p.weight),
          length: Number(p.length) || undefined,
          width: Number(p.width) || undefined,
          height: Number(p.height) || undefined,
          contents: p.contents,
          declaredValue: Number(p.declaredValue) || 0,
        })),
      });
      if (res.error) setError(res.error);
      else setDone(res);
    });
  }

  // ---- Confirmation ------------------------------------------------------
  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Card className="p-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
            <CheckIcon width={28} height={28} />
          </span>
          <h1 className="text-xl font-bold text-ink">Réservation confirmée</h1>
          <p className="mt-1 text-sm text-muted">
            Commande <strong>{done.orderNumber}</strong> · suivi{" "}
            <strong>{done.trackingNumber}</strong>
          </p>

          <div className="mt-5 rounded-xl bg-brand-light p-4 text-left">
            <p className="text-xs font-semibold text-brand">
              {done.parcelRefs?.length} colis · {xof(done.total ?? 0)}
            </p>
            <ul className="mt-2 space-y-1">
              {done.parcelRefs?.map((ref) => (
                <li key={ref} className="text-sm font-medium text-ink">
                  {ref}
                </li>
              ))}
            </ul>
          </div>

          {done.transportDate && (
            <p className="mt-4 text-sm text-muted">
              Transport prévu le <strong className="text-ink">{done.transportDate}</strong> ·
              retrait estimé entre <strong className="text-ink">{done.deliveryFrom}</strong> et{" "}
              <strong className="text-ink">{done.deliveryTo}</strong>
            </p>
          )}

          <p className="mt-4 rounded-xl border border-line p-3.5 text-left text-sm text-muted">
            Le code de retrait de chaque colis est disponible dans votre espace, rubrique
            « Mes envois ». Il est envoyé au destinataire par e-mail lorsque le colis est
            disponible, et ne s&apos;affiche jamais sur la page de suivi publique.
          </p>

          <div className="mt-5 flex gap-2">
            <Link
              href="/shipments"
              className="h-12 flex-1 rounded-full bg-brand text-sm font-semibold leading-[3rem] text-white"
            >
              Voir mes envois
            </Link>
            <Link
              href="/dashboard"
              className="h-12 flex-1 rounded-full border border-line text-sm font-semibold leading-[3rem] text-ink"
            >
              Tableau de bord
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Wizard ------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <PageTitle
        title="Envoyer un colis au Sénégal"
        subtitle={`Étape ${step + 1} sur ${STEPS.length} — ${STEPS[step]}`}
      />

      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Dépôt et retrait</h2>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Dépôt</p>
              <div className="flex gap-2">
                {(
                  [
                    ["relay_dropoff", "En point relais"],
                    ["home_pickup", "À domicile"],
                  ] as [CollectionMode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setCollection(value)}
                    className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition ${
                      collection === value
                        ? "border-brand bg-brand-light text-brand"
                        : "border-line text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Retrait</p>
              <div className="flex gap-2">
                {(
                  [
                    ["relay_pickup", "En point relais"],
                    ["home_delivery", "À domicile"],
                  ] as [DeliveryMode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setDelivery(value)}
                    className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition ${
                      delivery === value
                        ? "border-brand bg-brand-light text-brand"
                        : "border-line text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {collection === "relay_dropoff" && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Field label="Ville de dépôt">
                <select
                  className={inputCls}
                  value={originTown}
                  onChange={(e) => {
                    setOriginTown(e.target.value);
                    setOriginRelayId("");
                  }}
                >
                  <option value="">Toutes les villes</option>
                  {towns.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Point relais de dépôt">
                <select
                  className={inputCls}
                  value={originRelayId}
                  onChange={(e) => setOriginRelayId(e.target.value)}
                >
                  <option value="">Choisir…</option>
                  {originOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.town}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {delivery === "relay_pickup" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ville de retrait">
                <select
                  className={inputCls}
                  value={destTown}
                  onChange={(e) => {
                    setDestTown(e.target.value);
                    setDestRelayId("");
                  }}
                >
                  <option value="">Toutes les villes</option>
                  {towns.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Point relais de retrait">
                <select
                  className={inputCls}
                  value={destRelayId}
                  onChange={(e) => setDestRelayId(e.target.value)}
                >
                  <option value="">Choisir…</option>
                  {destOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.town}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {destRelay && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-light p-3.5 text-sm text-brand">
              <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>{destRelay.name}</strong> — {destRelay.address}
                {destRelay.hours ? ` · ${destRelay.hours}` : ""}
              </span>
            </p>
          )}

          {schedule.transportDate && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <ClockIcon width={16} height={16} />
              Prochain transport : {schedule.transportDate} · retrait estimé{" "}
              {schedule.deliveryFrom} – {schedule.deliveryTo}
            </p>
          )}
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {parcels.map((p, i) => (
            <Card key={i} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-ink">
                  <BoxIcon width={18} height={18} /> Colis {i + 1}
                </h2>
                {parcels.length > 1 && (
                  <button
                    onClick={() => setParcels(parcels.filter((_, j) => j !== i))}
                    className="text-sm font-semibold text-red-600"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Poids (kg)">
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={p.weight}
                    onChange={(e) =>
                      setParcels(parcels.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))
                    }
                  />
                </Field>
                <Field label="Contenu déclaré">
                  <input
                    className={inputCls}
                    value={p.contents}
                    onChange={(e) =>
                      setParcels(
                        parcels.map((x, j) => (j === i ? { ...x, contents: e.target.value } : x)),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {(["length", "width", "height"] as const).map((dim) => (
                  <Field
                    key={dim}
                    label={dim === "length" ? "Long. (cm)" : dim === "width" ? "Larg. (cm)" : "Haut. (cm)"}
                  >
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={p[dim]}
                      onChange={(e) =>
                        setParcels(
                          parcels.map((x, j) => (j === i ? { ...x, [dim]: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
              {lines[i] && (
                <p className="mt-3 text-sm font-semibold text-brand">
                  {lines[i]!.label} · {xof(lines[i]!.price)}
                </p>
              )}
            </Card>
          ))}

          <button
            onClick={() => setParcels([...parcels, emptyParcel()])}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            <PlusIcon width={16} height={16} /> Ajouter un colis
          </button>

          <p className="text-xs text-muted">
            Chaque colis reçoit son propre numéro, son étiquette QR et son code de retrait.
          </p>
        </div>
      )}

      {step === 2 && (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Destinataire</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom complet">
              <input
                className={inputCls}
                value={recipient.name}
                onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <input
                className={inputCls}
                value={recipient.phone}
                onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
              />
            </Field>
            <Field
              label="E-mail du destinataire"
              hint="Facultatif — permet d'envoyer le code de retrait par e-mail"
            >
              <input
                className={inputCls}
                type="email"
                value={recipient.email}
                onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
              />
            </Field>
            <Field label="Votre téléphone" hint="Pour vous joindre en cas de problème">
              <input
                className={inputCls}
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </Field>
          </div>
          {delivery === "home_delivery" && (
            <div className="mt-3">
              <Field label="Adresse de livraison">
                <input
                  className={inputCls}
                  value={recipient.address}
                  onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                />
              </Field>
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Récapitulatif</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Dépôt</dt>
              <dd className="font-medium text-ink">
                {collection === "relay_dropoff" ? (originRelay?.name ?? "—") : "À domicile"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Retrait</dt>
              <dd className="font-medium text-ink">
                {delivery === "relay_pickup" ? (destRelay?.name ?? "—") : recipient.address}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Destinataire</dt>
              <dd className="font-medium text-ink">{recipient.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Colis</dt>
              <dd className="font-medium text-ink">{parcels.length}</dd>
            </div>
            {schedule.transportDate && (
              <div className="flex justify-between">
                <dt className="text-muted">Retrait estimé</dt>
                <dd className="font-medium text-ink">
                  {schedule.deliveryFrom} – {schedule.deliveryTo}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-light p-4">
            <span className="text-sm font-semibold text-brand">Total</span>
            <span className="text-xl font-bold text-brand">
              {priced ? xof(total) : "Sur devis"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Paiement au dépôt. Le paiement en ligne n&apos;est pas activé pour cette phase.
          </p>
        </Card>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="h-12 flex-1 rounded-full border border-line font-semibold text-ink"
          >
            Retour
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={(step === 0 && !trajetValid) || (step === 1 && !parcelsValid) || (step === 2 && !recipientValid)}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
          >
            Continuer
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={pending}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Réservation…" : "Confirmer la réservation"}
          </button>
        )}
      </div>
    </div>
  );
}
