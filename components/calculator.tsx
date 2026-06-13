"use client";

// Live shipping quote widget — used on the public calculator page and as
// step 1 of the booking wizard.
import {
  WEIGHT_BANDS,
  HOME_COLLECTION_FEE,
  INSURANCE_RATE,
  quote,
  eur,
  type Country,
  type WeightBand,
} from "@/lib/data";
import { Card, Field, inputCls } from "@/components/ui";
import { ClockIcon } from "@/components/icons";

export interface CalcState {
  origin: Country;
  destination: Country;
  band: WeightBand;
  homeCollection: boolean;
  insurance: boolean;
  declaredValue: number;
}

export const DEFAULT_CALC: CalcState = {
  origin: "France",
  destination: "Senegal",
  band: "1-3kg",
  homeCollection: false,
  insurance: false,
  declaredValue: 100,
};

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
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
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
  const q = quote(state);
  const set = (patch: Partial<CalcState>) => onChange({ ...state, ...patch });

  return (
    <div className="grid gap-4">
      {/* Single launch route: France → Sénégal (fixed) */}
      <Field label="Destination">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-background px-4 h-12 text-[15px] font-semibold text-ink">
          France <span className="text-brand">→</span> Sénégal
        </div>
      </Field>

      <Field label="Poids du colis">
        <div className="grid grid-cols-5 gap-1.5">
          {WEIGHT_BANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set({ band: b })}
              className={`rounded-xl border px-1 py-2.5 text-xs sm:text-sm font-semibold transition ${
                state.band === b
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-card text-ink hover:border-brand/40"
              }`}
            >
              {b.replace("kg", "")}
              <span className="hidden sm:inline"> kg</span>
            </button>
          ))}
        </div>
      </Field>

      <Toggle
        checked={state.homeCollection}
        onChange={(v) => set({ homeCollection: v })}
        label="Enlèvement à domicile"
        hint={`Nous récupérons le colis chez vous (+${eur(HOME_COLLECTION_FEE)})`}
      />
      <Toggle
        checked={state.insurance}
        onChange={(v) => set({ insurance: v })}
        label="Assurance"
        hint={`Couvre la valeur déclarée (${(INSURANCE_RATE * 100).toFixed(0)} % de la valeur)`}
      />
      {state.insurance && (
        <Field label="Valeur déclarée (€)">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={state.declaredValue || ""}
            onChange={(e) => set({ declaredValue: Number(e.target.value) })}
          />
        </Field>
      )}

      {q && (
        <Card className="p-4 bg-brand-light/50 !border-brand/25">
          <div className="flex items-end justify-between gap-3">
            <div className="text-sm text-muted space-y-0.5">
              <p>Prix de base <span className="font-semibold text-ink">{eur(q.basePrice)}</span></p>
              {q.optionsFee > 0 && (
                <p>Options <span className="font-semibold text-ink">{eur(q.optionsFee)}</span></p>
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
