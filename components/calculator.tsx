"use client";

// Live shipping quote widget — used on the public calculator page and as
// step 1 of the booking wizard. Pricing is based on the CHARGEABLE weight:
// the greater of the actual weight and the volumetric weight (L×W×H / 6000).
import {
  HOME_COLLECTION_FEE,
  quote,
  eur,
  volumetricWeight,
  chargeableWeight,
  bandForWeight,
  type Country,
} from "@/lib/data";
import { Card, Field, inputCls } from "@/components/ui";
import { ClockIcon } from "@/components/icons";

export interface CalcState {
  origin: Country;
  destination: Country;
  actualWeight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
  homeCollection: boolean;
}

export const DEFAULT_CALC: CalcState = {
  origin: "France",
  destination: "Senegal",
  actualWeight: 2,
  length: 30,
  width: 20,
  height: 15,
  homeCollection: false,
};

/** Derives volumetric/chargeable weight, band and price from calculator state. */
export function computeQuote(s: CalcState) {
  const volumetric = volumetricWeight(s.length, s.width, s.height);
  const chargeable = chargeableWeight(s.actualWeight, volumetric);
  const band = bandForWeight(chargeable);
  const q = quote({
    origin: s.origin,
    destination: s.destination,
    band,
    homeCollection: s.homeCollection,
  });
  return { volumetric, chargeable, band, q };
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition ${
        checked ? "border-brand bg-brand-light/60" : "border-line bg-card"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted mt-0.5">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function Calculator({
  state,
  onChange,
}: {
  state: CalcState;
  onChange: (s: CalcState) => void;
}) {
  const { volumetric, chargeable, band, q } = computeQuote(state);
  const set = (patch: Partial<CalcState>) => onChange({ ...state, ...patch });
  const numInput = "w-full h-12 rounded-xl border border-line bg-card px-3 text-[15px] text-ink text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";

  return (
    <div className="grid gap-4">
      {/* Single launch route: France → Sénégal (fixed) */}
      <Field label="Destination">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-background px-4 h-12 text-[15px] font-semibold text-ink">
          France <span className="text-brand">→</span> Sénégal
        </div>
      </Field>

      <Field label="Poids réel (kg)">
        <input
          type="number"
          min={0}
          step="0.1"
          className={inputCls}
          value={state.actualWeight || ""}
          onChange={(e) => set({ actualWeight: Number(e.target.value) })}
          placeholder="2.5"
        />
      </Field>

      <Field label="Dimensions (cm)" hint="Longueur × Largeur × Hauteur — pour le poids volumétrique.">
        <div className="grid grid-cols-3 gap-2">
          {(["length", "width", "height"] as const).map((dim, i) => (
            <input
              key={dim}
              type="number"
              min={0}
              className={numInput}
              value={state[dim] || ""}
              onChange={(e) => set({ [dim]: Number(e.target.value) } as Partial<CalcState>)}
              placeholder={["L", "l", "H"][i]}
            />
          ))}
        </div>
      </Field>

      {/* Chargeable weight breakdown */}
      <div className="rounded-xl border border-line bg-background p-3.5 text-sm">
        <div className="flex justify-between"><span className="text-muted">Poids réel</span><span className="font-semibold text-ink">{state.actualWeight || 0} kg</span></div>
        <div className="flex justify-between mt-1"><span className="text-muted">Poids volumétrique</span><span className="font-semibold text-ink">{volumetric} kg</span></div>
        <div className="flex justify-between mt-1 pt-1 border-t border-line">
          <span className="text-ink font-semibold">Poids facturable</span>
          <span className="font-bold text-brand">{chargeable} kg · tranche {band}</span>
        </div>
      </div>

      <Toggle
        checked={state.homeCollection}
        onChange={(v) => set({ homeCollection: v })}
        label="Collecte à domicile"
        hint={`Nous récupérons le colis chez vous (+${eur(HOME_COLLECTION_FEE)})`}
      />

      {q && (
        <Card className="p-4 bg-brand-light/50 !border-brand/25">
          <div className="flex items-end justify-between gap-3">
            <div className="text-sm text-muted space-y-0.5">
              <p>Prix de base <span className="font-semibold text-ink">{eur(q.basePrice)}</span></p>
              {q.optionsFee > 0 && (
                <p>Collecte <span className="font-semibold text-ink">{eur(q.optionsFee)}</span></p>
              )}
              <p className="flex items-center gap-1.5">
                <ClockIcon width={14} height={14} /> {q.transitDays}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted uppercase">Total</p>
              <p className="text-3xl font-bold text-brand leading-none mt-1">{eur(q.total)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
