"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveZone, setZoneCommercialStatus } from "@/app/admin/admin-actions";
import type { CommercialStatus, Zone } from "@/lib/sn-shared";
import { COMMERCIAL_STATUS_FR } from "@/lib/relays";
import { Card, Field, inputCls } from "@/components/ui";
import { PlusIcon, PinIcon } from "@/components/icons";

const STATUS_STYLES: Record<CommercialStatus, string> = {
  active: "bg-brand-light text-brand border-brand/20",
  test: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-orange-50 text-orange-700 border-orange-200",
};

/**
 * Zone administration (founder answer 4).
 *
 * The commercial launch covers the Dakar region. Other zones stay in "test"
 * so they can be demonstrated without being sold, and the administrator
 * activates further regions progressively — no developer involvement.
 */
export function ZonesManager({ zones, relayCounts }: { zones: Zone[]; relayCounts: Record<string, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [nw, setNw] = useState({ code: "", name: "", region: "", towns: "" });

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

  return (
    <div className="space-y-3">
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

      {zones.map((z) => (
        <Card key={z.id} className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <PinIcon width={22} height={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {z.code} · {z.name}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {z.towns.join(" · ") || "Aucune ville"} · {relayCounts[z.id] ?? 0} point(s) relais
              </p>
              <span
                className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[z.commercialStatus]}`}
              >
                {COMMERCIAL_STATUS_FR[z.commercialStatus]}
              </span>
            </div>
            <button
              onClick={() =>
                run(
                  () =>
                    setZoneCommercialStatus(z.id, z.commercialStatus === "active" ? "test" : "active"),
                  z.commercialStatus === "active"
                    ? "Zone repassée en test ✓"
                    : "Zone ouverte commercialement ✓",
                )
              }
              disabled={pending}
              className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
            >
              {z.commercialStatus === "active" ? "Repasser en test" : "Ouvrir commercialement"}
            </button>
          </div>
        </Card>
      ))}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon width={16} height={16} /> Ajouter une zone
        </button>
      ) : (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Nouvelle zone</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <input
                className={inputCls}
                placeholder="SL-REGION"
                value={nw.code}
                onChange={(e) => setNw({ ...nw, code: e.target.value })}
              />
            </Field>
            <Field label="Nom">
              <input
                className={inputCls}
                placeholder="Région de Saint-Louis"
                value={nw.name}
                onChange={(e) => setNw({ ...nw, name: e.target.value })}
              />
            </Field>
            <Field label="Région">
              <input
                className={inputCls}
                value={nw.region}
                onChange={(e) => setNw({ ...nw, region: e.target.value })}
              />
            </Field>
            <Field label="Villes" hint="Séparées par des virgules">
              <input
                className={inputCls}
                placeholder="Saint-Louis, Richard-Toll"
                value={nw.towns}
                onChange={(e) => setNw({ ...nw, towns: e.target.value })}
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
              onClick={() => {
                run(
                  () =>
                    saveZone({
                      code: nw.code,
                      name: nw.name,
                      region: nw.region,
                      towns: nw.towns.split(",").map((t) => t.trim()).filter(Boolean),
                    }),
                  "Zone créée ✓",
                );
                setShowNew(false);
              }}
              disabled={pending}
              className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              Créer la zone
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
