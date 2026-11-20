"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveOperatingSettings,
  addNonOperatingDay,
  removeNonOperatingDay,
} from "@/app/admin/admin-actions";
import { WEEKDAY_FR, type OperatingSettings } from "@/lib/sn-shared";
import { Card, Field, inputCls } from "@/components/ui";
import { PlusIcon, ClockIcon } from "@/components/icons";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export interface Closure {
  id: string;
  day: string;
  label: string;
  relayName: string | null;
}

/**
 * Operating schedule administration (founder answer 6).
 *
 * Drivers collect and distribute only on transport days, while relay shops
 * stay open to customers on their own opening days. Every parameter here is
 * configurable because transport frequency will change as the network grows.
 */
export function ScheduleManager({
  settings,
  closures,
  preview,
}: {
  settings: OperatingSettings;
  closures: Closure[];
  preview: { transportDate: string | null; deliveryFrom: string | null; deliveryTo: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [days, setDays] = useState<number[]>(settings.transportDays);
  const [cutoff, setCutoff] = useState(settings.collectionCutoff);
  const [minDays, setMinDays] = useState(String(settings.deliveryMinDays));
  const [maxDays, setMaxDays] = useState(String(settings.deliveryMaxDays));

  const [newDay, setNewDay] = useState("");
  const [newLabel, setNewLabel] = useState("");

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

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-bold text-ink">Jours de transport</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Les chauffeurs collectent et distribuent uniquement ces jours-là. Les clients peuvent
          déposer et retirer leurs colis tous les jours d&apos;ouverture des boutiques.
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`h-11 rounded-full border px-4 text-sm font-semibold transition ${
                days.includes(d)
                  ? "border-brand bg-brand-light text-brand"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {WEEKDAY_FR[d]}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Heure limite de dépôt" hint="Après cette heure, le colis part au tour suivant">
            <input
              type="time"
              className={inputCls}
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
            />
          </Field>
          <Field label="Délai minimum (jours ouvrés)">
            <input
              className={inputCls}
              inputMode="numeric"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
            />
          </Field>
          <Field label="Délai maximum (jours ouvrés)">
            <input
              className={inputCls}
              inputMode="numeric"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
            />
          </Field>
        </div>

        <button
          onClick={() =>
            run(
              () =>
                saveOperatingSettings({
                  transportDays: days,
                  collectionCutoff: cutoff,
                  deliveryMinDays: Number(minDays) || 1,
                  deliveryMaxDays: Number(maxDays) || 3,
                }),
              "Planning enregistré ✓",
            )
          }
          disabled={pending}
          className="mt-4 h-12 w-full rounded-full bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer le planning"}
        </button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-ink">
          <ClockIcon width={18} height={18} /> Simulation
        </h2>
        <p className="text-sm text-muted">
          Pour un colis déposé maintenant :{" "}
          {preview.transportDate ? (
            <>
              transport le <span className="font-semibold text-ink">{preview.transportDate}</span>,
              retrait estimé entre{" "}
              <span className="font-semibold text-ink">{preview.deliveryFrom}</span> et{" "}
              <span className="font-semibold text-ink">{preview.deliveryTo}</span>.
            </>
          ) : (
            "aucun jour de transport configuré."
          )}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink">Fermetures exceptionnelles</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Jours fériés et fermetures : aucun transport n&apos;est planifié ces jours-là et ils ne
          comptent pas dans les délais de livraison.
        </p>

        <div className="space-y-2">
          {closures.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{c.day}</p>
                <p className="text-xs text-muted">
                  {c.label || "Fermeture"}
                  {c.relayName ? ` · ${c.relayName}` : " · tout le réseau"}
                </p>
              </div>
              <button
                onClick={() => run(() => removeNonOperatingDay(c.id), "Fermeture supprimée ✓")}
                disabled={pending}
                className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-muted transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          ))}
          {closures.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              Aucune fermeture enregistrée.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
            />
          </Field>
          <Field label="Motif">
            <input
              className={inputCls}
              placeholder="Jour férié"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={() => {
                run(() => addNonOperatingDay(newDay, newLabel), "Fermeture ajoutée ✓");
                setNewDay("");
                setNewLabel("");
              }}
              disabled={pending || !newDay}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              <PlusIcon width={16} height={16} /> Ajouter
            </button>
          </div>
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
    </div>
  );
}
