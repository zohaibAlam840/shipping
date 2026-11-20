"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePricingRule, setPricingRuleStatus } from "@/app/admin/admin-actions";
import {
  SERVICE_TYPE_FR,
  xof,
  type PricingRuleSN,
  type ServiceType,
  type Zone,
} from "@/lib/sn-shared";
import { Card, Field, inputCls } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

const SERVICES = Object.keys(SERVICE_TYPE_FR) as ServiceType[];

/**
 * Pricing administration.
 *
 * The founder requires prices to be creatable, modifiable, activatable and
 * deactivatable by the administrator "without developer intervention", by
 * zone, weight category and delivery method — so every one of those fields is
 * editable here.
 */
export function PricingManager({
  rules,
  zones,
}: {
  rules: PricingRuleSN[];
  zones: Zone[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? "—";

  // Draft state for each existing rule, so edits are local until saved.
  const [drafts, setDrafts] = useState<Record<string, { price: string; min: string; max: string; label: string }>>(
    Object.fromEntries(
      rules.map((r) => [
        r.id,
        {
          price: String(r.price),
          min: String(r.minWeightKg),
          max: r.maxWeightKg == null ? "" : String(r.maxWeightKg),
          label: r.label,
        },
      ]),
    ),
  );

  const firstZone = zones[0]?.id ?? "";
  const [nw, setNw] = useState({
    originZoneId: firstZone,
    destinationZoneId: firstZone,
    serviceType: "relay_to_relay" as ServiceType,
    label: "",
    min: "0",
    max: "",
    price: "",
  });

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>, success: string) {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setMsg(success);
        router.refresh();
      }
    });
  }

  function saveExisting(rule: PricingRuleSN) {
    const d = drafts[rule.id];
    run(
      () =>
        savePricingRule({
          id: rule.id,
          originZoneId: rule.originZoneId ?? firstZone,
          destinationZoneId: rule.destinationZoneId ?? firstZone,
          serviceType: rule.serviceType,
          label: d.label,
          minWeightKg: Number(d.min) || 0,
          maxWeightKg: d.max === "" ? null : Number(d.max),
          price: Number(d.price) || 0,
          currency: rule.currency,
          status: rule.status,
          sortOrder: rule.sortOrder,
        }),
      "Tarif enregistré ✓",
    );
  }

  function createRule() {
    run(
      () =>
        savePricingRule({
          originZoneId: nw.originZoneId,
          destinationZoneId: nw.destinationZoneId,
          serviceType: nw.serviceType,
          label: nw.label,
          minWeightKg: Number(nw.min) || 0,
          maxWeightKg: nw.max === "" ? null : Number(nw.max),
          price: Number(nw.price) || 0,
        }),
      "Tarif créé ✓",
    );
    setShowNew(false);
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm font-medium text-amber-800">
          Tarifs provisoires, destinés aux tests. Ils ne sont pas encore validés
          commercialement.
        </p>
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

      {rules.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">
          Aucune règle tarifaire. Créez la première ci-dessous.
        </Card>
      )}

      {rules.map((r) => {
        const d = drafts[r.id];
        if (!d) return null;
        const inactive = r.status === "inactive";
        return (
          <Card key={r.id} className={`p-4 ${inactive ? "opacity-60" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {zoneName(r.originZoneId)} → {zoneName(r.destinationZoneId)} ·{" "}
                {SERVICE_TYPE_FR[r.serviceType]}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-brand">{xof(r.price)}</span>
                <button
                  onClick={() =>
                    run(
                      () => setPricingRuleStatus(r.id, inactive ? "active" : "inactive"),
                      inactive ? "Tarif réactivé ✓" : "Tarif désactivé ✓",
                    )
                  }
                  disabled={pending}
                  className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-50"
                >
                  {inactive ? "Réactiver" : "Désactiver"}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Libellé">
                <input
                  className={inputCls}
                  value={d.label}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...d, label: e.target.value } })}
                />
              </Field>
              <Field label="Poids min (kg)">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={d.min}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...d, min: e.target.value } })}
                />
              </Field>
              <Field label="Poids max (kg)" hint="Vide = sans limite">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={d.max}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...d, max: e.target.value } })}
                />
              </Field>
              <Field label="Prix (FCFA)">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={d.price}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...d, price: e.target.value } })}
                />
              </Field>
              <div className="flex items-end">
                <button
                  onClick={() => saveExisting(r)}
                  disabled={pending}
                  className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon width={16} height={16} /> Ajouter une règle tarifaire
        </button>
      ) : (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Nouvelle règle tarifaire</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Zone d'origine">
              <select
                className={inputCls}
                value={nw.originZoneId}
                onChange={(e) => setNw({ ...nw, originZoneId: e.target.value })}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zone de destination">
              <select
                className={inputCls}
                value={nw.destinationZoneId}
                onChange={(e) => setNw({ ...nw, destinationZoneId: e.target.value })}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode de livraison">
              <select
                className={inputCls}
                value={nw.serviceType}
                onChange={(e) => setNw({ ...nw, serviceType: e.target.value as ServiceType })}
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_TYPE_FR[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Libellé">
              <input
                className={inputCls}
                placeholder="Jusqu'à 2 kg"
                value={nw.label}
                onChange={(e) => setNw({ ...nw, label: e.target.value })}
              />
            </Field>
            <Field label="Poids min (kg)">
              <input
                className={inputCls}
                inputMode="decimal"
                value={nw.min}
                onChange={(e) => setNw({ ...nw, min: e.target.value })}
              />
            </Field>
            <Field label="Poids max (kg)">
              <input
                className={inputCls}
                inputMode="decimal"
                value={nw.max}
                onChange={(e) => setNw({ ...nw, max: e.target.value })}
              />
            </Field>
            <Field label="Prix (FCFA)">
              <input
                className={inputCls}
                inputMode="numeric"
                value={nw.price}
                onChange={(e) => setNw({ ...nw, price: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowNew(false)}
              className="h-11 flex-1 rounded-full border border-line text-sm font-semibold text-ink"
            >
              Annuler
            </button>
            <button
              onClick={createRule}
              disabled={pending}
              className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              Créer le tarif
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
