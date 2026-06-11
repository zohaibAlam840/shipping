"use client";

// Multi-step booking wizard: quote → recipient & parcel → drop-off → review → done.
// Pure frontend for now; "confirm" fakes an order number.
import { useState, useTransition } from "react";
import Link from "next/link";
import { quote, eur, ME, type DeliveryOption } from "@/lib/data";
import { createOrder } from "@/app/actions";
import { Calculator, DEFAULT_CALC, type CalcState } from "@/components/calculator";
import { Card, PageTitle, Field, inputCls } from "@/components/ui";
import { ArrowRightIcon, CheckIcon, PinIcon, TruckIcon, HomeIcon } from "@/components/icons";

const STEPS = ["Quote", "Details", "Drop-off", "Review"] as const;

interface BookingState {
  calc: CalcState;
  recipient: { name: string; phone: string; address: string };
  parcel: { weight: string; description: string; declaredValue: string; dimensions: string };
  delivery: DeliveryOption;
}

const DELIVERY_OPTIONS: { value: DeliveryOption; icon: typeof PinIcon; text: string; fee: string }[] = [
  { value: "Relay point", icon: PinIcon, text: "Drop at a partner shop near you", fee: "Free" },
  { value: "Post office", icon: TruckIcon, text: "Drop at a partner post office", fee: "Free" },
  { value: "Home collection", icon: HomeIcon, text: "We collect from your address", fee: "+€18" },
];

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<{ orderNumber: string; trackingNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [b, setB] = useState<BookingState>({
    calc: DEFAULT_CALC,
    recipient: { name: "", phone: "", address: "" },
    parcel: { weight: "", description: "", declaredValue: "", dimensions: "" },
    delivery: "Relay point",
  });

  const q = quote({ ...b.calc, homeCollection: b.delivery === "Home collection" });

  const detailsValid =
    b.recipient.name && b.recipient.phone && b.recipient.address && b.parcel.weight && b.parcel.description;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await createOrder({
        origin: b.calc.origin,
        destination: b.calc.destination,
        band: b.calc.band,
        delivery: b.delivery,
        insurance: b.calc.insurance,
        recipient: b.recipient,
        parcel: {
          weight: Number(b.parcel.weight) || 0,
          description: b.parcel.description,
          declaredValue: Number(b.parcel.declaredValue) || 0,
          dimensions: b.parcel.dimensions,
        },
      });
      if ("error" in res) setError(res.error ?? "Something went wrong.");
      else setDone({ orderNumber: res.orderNumber, trackingNumber: res.trackingNumber });
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center py-10">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
          <CheckIcon width={32} height={32} strokeWidth={2.4} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Booking confirmed!</h1>
        <p className="text-muted mt-2">
          Your order <span className="font-bold text-ink">{done.orderNumber}</span> is registered.
          {b.delivery === "Home collection"
            ? " We'll contact you to schedule the pickup."
            : " Drop your parcel at the chosen point to get it moving."}
        </p>
        <Card className="mt-6 p-5 text-left">
          <p className="text-sm text-muted">Total to pay at drop-off</p>
          <p className="text-3xl font-bold text-brand">{q ? eur(q.total) : "—"}</p>
          <p className="text-xs text-muted mt-1">
            {b.calc.origin} → {b.calc.destination} · {b.calc.band} · {b.delivery}
          </p>
          <p className="text-xs text-muted mt-1">
            Tracking number{" "}
            <span className="font-mono font-bold text-ink">{done.trackingNumber}</span>
          </p>
        </Card>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/shipments" className="h-12 rounded-full bg-brand text-white font-semibold flex items-center justify-center hover:bg-brand-dark transition">
            View my shipments
          </Link>
          <Link href="/dashboard" className="h-12 rounded-full border border-line bg-card font-semibold text-ink flex items-center justify-center hover:border-brand/40 transition">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Ship a parcel" subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`} />

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
              <h2 className="font-bold text-ink mb-3">Recipient</h2>
              <div className="space-y-3">
                <Field label="Full name">
                  <input
                    className={inputCls}
                    placeholder="Moussa Ndiaye"
                    value={b.recipient.name}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, name: e.target.value } })}
                  />
                </Field>
                <Field label="Phone (WhatsApp)">
                  <input
                    type="tel"
                    className={inputCls}
                    placeholder={b.calc.destination === "Senegal" ? "+221 77 ..." : "+33 6 ..."}
                    value={b.recipient.phone}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, phone: e.target.value } })}
                  />
                </Field>
                <Field label={`Delivery address in ${b.calc.destination}`}>
                  <input
                    className={inputCls}
                    placeholder="Street, neighbourhood, city"
                    value={b.recipient.address}
                    onChange={(e) => setB({ ...b, recipient: { ...b.recipient, address: e.target.value } })}
                  />
                </Field>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-ink mb-3">Parcel</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="2.5"
                    value={b.parcel.weight}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, weight: e.target.value } })}
                  />
                </Field>
                <Field label="Dimensions">
                  <input
                    className={inputCls}
                    placeholder="40×30×20 cm"
                    value={b.parcel.dimensions}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, dimensions: e.target.value } })}
                  />
                </Field>
              </div>
              <div className="mt-3 space-y-3">
                <Field label="What's inside?">
                  <input
                    className={inputCls}
                    placeholder="Clothes, food, documents…"
                    value={b.parcel.description}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, description: e.target.value } })}
                  />
                </Field>
                <Field label="Declared value (€)" hint="Used for insurance and customs.">
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="100"
                    value={b.parcel.declaredValue}
                    onChange={(e) => setB({ ...b, parcel: { ...b.parcel, declaredValue: e.target.value } })}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-bold text-ink">How does the parcel reach us?</h2>
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
                  <span className="block font-semibold text-ink text-sm">{opt.value}</span>
                  <span className="block text-xs text-muted mt-0.5">{opt.text}</span>
                </span>
                <span className={`text-sm font-bold ${opt.fee === "Free" ? "text-brand" : "text-ink"}`}>{opt.fee}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && q && (
          <div className="space-y-4">
            <h2 className="font-bold text-ink">Review your booking</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Route", `${b.calc.origin} → ${b.calc.destination}`],
                ["Weight band", b.calc.band],
                ["Sender", `${ME.name} · ${ME.phone}`],
                ["Recipient", `${b.recipient.name} · ${b.recipient.phone}`],
                ["Deliver to", b.recipient.address],
                ["Contents", b.parcel.description],
                ["Drop-off", b.delivery],
                ["Insurance", b.calc.insurance ? `Yes (value ${eur(Number(b.parcel.declaredValue) || b.calc.declaredValue)})` : "No"],
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
                <p className="text-xs mt-0.5">Estimated {q.transitDays}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted uppercase">Total</p>
                <p className="text-3xl font-bold text-brand leading-none mt-1">{eur(q.total)}</p>
              </div>
            </div>
            <p className="text-xs text-muted">
              Pay at drop-off or collection. Online card payment is coming soon.
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
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={step === 1 && !detailsValid}
            onClick={() => setStep(step + 1)}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
          >
            Continue <ArrowRightIcon width={18} height={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="h-12 flex-1 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {pending ? "Booking…" : "Confirm booking"} <CheckIcon width={18} height={18} />
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
