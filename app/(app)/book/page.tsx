"use client";

// Multi-step booking wizard: quote → recipient & parcel → drop-off → review → done.
// Pure frontend for now; "confirm" fakes an order number.
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  eur,
  COUNTRY_FR,
  DELIVERY_FR,
  MONDIAL_RELAY_POINTS,
  LAPOSTE_OFFICES,
  PARCEL_CATEGORIES,
  PARCEL_CATEGORY_FR,
  type DeliveryOption,
  type ParcelCategory,
} from "@/lib/data";
import { createOrder } from "@/app/actions";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Calculator, DEFAULT_CALC, computeQuote, type CalcState } from "@/components/calculator";
import { Card, PageTitle, Field, inputCls } from "@/components/ui";
import { PayButton } from "@/components/pay-button";
import { ArrowRightIcon, CheckIcon, PinIcon, TruckIcon, HomeIcon } from "@/components/icons";

const STRIPE_ENABLED = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const STEPS = ["Devis", "Détails", "Dépôt", "Récapitulatif"] as const;
const OTHER = "__other__";

interface BookingState {
  calc: CalcState;
  recipient: { name: string; phone: string; address: string };
  parcel: { description: string; declaredValue: string };
  category: ParcelCategory;
  delivery: DeliveryOption;
  dropoffPoint: string;
}

const DELIVERY_OPTIONS: { value: DeliveryOption; icon: typeof PinIcon; text: string; fee: string }[] = [
  { value: "Relay point", icon: PinIcon, text: "Déposez dans un commerce partenaire près de chez vous", fee: "Gratuit" },
  { value: "Post office", icon: TruckIcon, text: "Déposez dans un bureau de poste partenaire", fee: "Gratuit" },
  { value: "Home collection", icon: HomeIcon, text: "Nous récupérons le colis chez vous", fee: "+20 €" },
];

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<{ id: string; orderNumber: string; trackingNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sender, setSender] = useState({ name: "Vous", phone: "" });
  // Whether the drop-off point is being typed manually ("Autre").
  const [customDrop, setCustomDrop] = useState(false);
  const [b, setB] = useState<BookingState>({
    calc: DEFAULT_CALC,
    recipient: { name: "", phone: "", address: "" },
    parcel: { description: "", declaredValue: "" },
    category: "General Cargo",
    delivery: "Relay point",
    dropoffPoint: "",
  });

  const needsDropoff = b.delivery === "Relay point" || b.delivery === "Post office";
  const dropoffValid = !needsDropoff || b.dropoffPoint.trim().length > 0;
  const dropoffList = b.delivery === "Post office" ? LAPOSTE_OFFICES : MONDIAL_RELAY_POINTS;

  useEffect(() => {
    createSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        if (u) {
          const m = u.user_metadata ?? {};
          setSender({
            name: (m.full_name as string) || u.email?.split("@")[0] || "Vous",
            phone: (m.phone as string) || "",
          });
        }
      });
  }, []);

  const { chargeable, band, q } = computeQuote({
    ...b.calc,
    homeCollection: b.delivery === "Home collection",
  });

  const detailsValid =
    b.recipient.name && b.recipient.phone && b.recipient.address && b.parcel.description;
  const parcelValid = b.calc.actualWeight > 0 && b.calc.length > 0 && b.calc.width > 0 && b.calc.height > 0;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await createOrder({
        origin: b.calc.origin,
        destination: b.calc.destination,
        delivery: b.delivery,
        category: b.category,
        recipient: b.recipient,
        parcel: {
          actualWeight: b.calc.actualWeight,
          length: b.calc.length,
          width: b.calc.width,
          height: b.calc.height,
          description: b.parcel.description,
          declaredValue: Number(b.parcel.declaredValue) || 0,
        },
        dropoffPoint: needsDropoff ? b.dropoffPoint : undefined,
      });
      if ("error" in res) setError(res.error ?? "Une erreur est survenue.");
      else setDone({ id: res.id, orderNumber: res.orderNumber, trackingNumber: res.trackingNumber });
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center py-10">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
          <CheckIcon width={32} height={32} strokeWidth={2.4} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Réservation confirmée !</h1>
        <p className="text-muted mt-2">
          Votre commande <span className="font-bold text-ink">{done.orderNumber}</span> est enregistrée.
          {b.delivery === "Home collection"
            ? " Nous vous contacterons pour planifier l'enlèvement."
            : " Déposez votre colis au point choisi pour le mettre en route."}
        </p>
        <Card className="mt-6 p-5 text-left">
          <p className="text-sm text-muted">
            {STRIPE_ENABLED ? "Total à payer" : "Total à payer au dépôt"}
          </p>
          <p className="text-3xl font-bold text-brand">{q ? eur(q.total) : "—"}</p>
          <p className="text-xs text-muted mt-1">
            {COUNTRY_FR[b.calc.origin]} → {COUNTRY_FR[b.calc.destination]} · {band} · {DELIVERY_FR[b.delivery]}
          </p>
          <p className="text-xs text-muted mt-1">
            Numéro de suivi{" "}
            <span className="font-mono font-bold text-ink">{done.trackingNumber}</span>
          </p>
        </Card>
        <div className="mt-6 flex flex-col gap-2">
          {STRIPE_ENABLED && (
            <PayButton orderId={done.id} className="w-full" label={`Payer ${q ? eur(q.total) : ""} en ligne`} />
          )}
          <Link href="/shipments" className="h-12 rounded-full bg-brand text-white font-semibold flex items-center justify-center hover:bg-brand-dark transition">
            Voir mes envois
          </Link>
          <Link href="/dashboard" className="h-12 rounded-full border border-line bg-card font-semibold text-ink flex items-center justify-center hover:border-brand/40 transition">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Envoyer un colis" subtitle={`Étape ${step + 1} sur ${STEPS.length} — ${STEPS[step]}`} />

      {/* Step indicator */}
      <div className="app-chrome flex gap-1.5 mb-5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>

      <Card className="p-5">
        {step === 0 && (
          <Calculator state={b.calc} onChange={(calc) => setB({ ...b, calc })} />
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-ink mb-3">Destinataire</h2>
              <div className="space-y-3">
                <Field label="Nom complet">
                  <input
                    className={inputCls}
                    placeholder="Moussa Ndiaye"
                    value={b.recipient.name}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, name: e.target.value } })}
                  />
                </Field>
                <Field label="Téléphone (WhatsApp)">
                  <input
                    type="tel"
                    className={inputCls}
                    placeholder="+221 77 ..."
                    value={b.recipient.phone}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, phone: e.target.value } })}
                  />
                </Field>
                <Field label={`Adresse de livraison au ${COUNTRY_FR[b.calc.destination]}`}>
                  <input
                    className={inputCls}
                    placeholder="Rue, quartier, ville"
                    value={b.recipient.address}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, address: e.target.value } })}
                  />
                </Field>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-ink mb-3">Colis</h2>
              <div className="space-y-3">
                <Field label="Catégorie du colis">
                  <select
                    className={inputCls}
                    value={b.category}
                    onChange={(e) => setB({ ...b, category: e.target.value as ParcelCategory })}
                  >
                    {PARCEL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{PARCEL_CATEGORY_FR[c]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Que contient le colis ?">
                  <input
                    className={inputCls}
                    placeholder="Vêtements, chaussures, documents…"
                    value={b.parcel.description}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, description: e.target.value } })}
                  />
                </Field>
                <Field label="Valeur déclarée (€)" hint="Utilisée pour les formalités douanières.">
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="100"
                    value={b.parcel.declaredValue}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, declaredValue: e.target.value } })}
                  />
                </Field>
                <p className="text-xs text-muted">
                  Poids et dimensions sont renseignés à l&apos;étape Devis (poids facturable {chargeable} kg).
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-bold text-ink">Comment le colis nous parvient-il ?</h2>
            {DELIVERY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setB({ ...b, delivery: opt.value })}
                className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition ${
                  b.delivery === opt.value ? "border-brand bg-brand-light/60" : "border-line bg-card hover:border-brand/40"
                }`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${b.delivery === opt.value ? "bg-brand text-white" : "bg-background text-muted"}`}>
                  <opt.icon width={22} height={22} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink text-sm">{DELIVERY_FR[opt.value]}</span>
                  <span className="block text-xs text-muted mt-0.5">{opt.text}</span>
                </span>
                <span className={`text-sm font-bold ${opt.fee === "Gratuit" ? "text-brand" : "text-ink"}`}>{opt.fee}</span>
              </button>
            ))}

            {needsDropoff && (
              <div className="pt-2">
                <Field
                  label={
                    b.delivery === "Post office"
                      ? "Choisissez le bureau de poste La Poste"
                      : "Choisissez le point relais Mondial Relay"
                  }
                  hint="Lieu où vous déposerez le colis en France."
                >
                  <select
                    className={inputCls}
                    value={customDrop ? OTHER : b.dropoffPoint}
                    onChange={(e) => {
                      if (e.target.value === OTHER) {
                        setCustomDrop(true);
                        setB({ ...b, dropoffPoint: "" });
                      } else {
                        setCustomDrop(false);
                        setB({ ...b, dropoffPoint: e.target.value });
                      }
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {dropoffList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value={OTHER}>Autre (préciser)…</option>
                  </select>
                </Field>
                {customDrop && (
                  <input
                    className={`${inputCls} mt-2`}
                    placeholder="Nom et adresse du point de dépôt"
                    value={b.dropoffPoint}
                    onChange={(e) => setB({ ...b, dropoffPoint: e.target.value })}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && q && (
          <div className="space-y-4">
            <h2 className="font-bold text-ink">Vérifiez votre réservation</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Trajet", `${COUNTRY_FR[b.calc.origin]} → ${COUNTRY_FR[b.calc.destination]}`],
                ["Poids facturable", `${chargeable} kg · tranche ${band}`],
                ["Catégorie", PARCEL_CATEGORY_FR[b.category]],
                ["Expéditeur", `${sender.name}${sender.phone ? ` · ${sender.phone}` : ""}`],
                ["Destinataire", `${b.recipient.name} · ${b.recipient.phone}`],
                ["Livrer à", b.recipient.address],
                ["Contenu", b.parcel.description],
                ["Dépôt", DELIVERY_FR[b.delivery]],
                ...(needsDropoff && b.dropoffPoint ? [["Point de dépôt", b.dropoffPoint] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted shrink-0">{k}</dt>
                  <dd className="font-semibold text-ink text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-xl bg-brand-light/60 border border-brand/25 p-4 flex items-end justify-between">
              <div className="text-sm text-muted">
                <p>Base {eur(q.basePrice)}{q.optionsFee > 0 && <> + options {eur(q.optionsFee)}</>}</p>
                <p className="text-xs mt-0.5">Estimé {q.transitDays}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted uppercase">Total</p>
                <p className="text-3xl font-bold text-brand leading-none mt-1">{eur(q.total)}</p>
              </div>
            </div>
            <p className="text-xs text-muted">
              Après confirmation, payez en ligne par carte ou au dépôt / à l'enlèvement.
            </p>
          </div>
        )}
      </Card>

      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="h-12 flex-1 rounded-full border border-line bg-card font-semibold text-ink hover:border-brand/40 active:scale-[0.98] transition"
          >
            Retour
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={(step === 0 && !parcelValid) || (step === 1 && !detailsValid) || (step === 2 && !dropoffValid)}
            onClick={() => setStep(step + 1)}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
          >
            Continuer <ArrowRightIcon width={18} height={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {pending ? "Réservation…" : "Confirmer la réservation"} <CheckIcon width={18} height={18} />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
