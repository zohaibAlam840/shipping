"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRoute, setRouteStatus, assignParcelsToRoute } from "@/app/admin/admin-actions";
import { ROUTE_STATUS_FR, type DriverRoute, type RouteStatus } from "@/lib/routes";
import { Card, Field, inputCls } from "@/components/ui";
import { PlusIcon, TruckIcon, BoxIcon } from "@/components/icons";

export interface DriverChoice {
  id: string;
  name: string;
}

export interface UnassignedParcel {
  id: string;
  parcelRef: string;
  status: string;
  town: string | null;
  recipientName: string | null;
}

const STATUS_STYLE: Record<RouteStatus, string> = {
  planned: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-brand-light text-brand border-brand/20",
  completed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

/**
 * Driver rounds (spec §10).
 *
 * Assigning a parcel to a round is planning, not custody: the parcel only
 * changes hands when a driver actually scans it.
 */
export function RoutesManager({
  routes,
  drivers,
  unassigned,
  defaultCode,
}: {
  routes: DriverRoute[];
  drivers: DriverChoice[];
  unassigned: UnassignedParcel[];
  defaultCode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const [nw, setNw] = useState({
    code: defaultCode,
    driverId: drivers[0]?.id ?? "",
    routeDate: new Date().toISOString().slice(0, 10),
    originTown: "",
    destinationTown: "",
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

      {routes.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <TruckIcon width={20} height={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {r.code} · {r.driverName ?? "Chauffeur non assigné"}
              </p>
              <p className="text-xs text-muted">
                {r.routeDate}
                {r.originTown || r.destinationTown
                  ? ` · ${r.originTown ?? "—"} → ${r.destinationTown ?? "—"}`
                  : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                >
                  {ROUTE_STATUS_FR[r.status]}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <BoxIcon width={12} height={12} /> {r.parcelCount} colis
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setAssigning(assigning === r.id ? null : r.id);
                  setSelected([]);
                }}
                className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
              >
                Affecter des colis
              </button>
              {r.status === "planned" && (
                <button
                  onClick={() => run(() => setRouteStatus(r.id, "active"), "Tournée démarrée ✓")}
                  disabled={pending}
                  className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Démarrer
                </button>
              )}
              {r.status === "active" && (
                <button
                  onClick={() => run(() => setRouteStatus(r.id, "completed"), "Tournée terminée ✓")}
                  disabled={pending}
                  className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  Terminer
                </button>
              )}
            </div>
          </div>

          {assigning === r.id && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium text-ink">
                Colis non affectés ({unassigned.length})
              </p>
              {unassigned.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
                  Tous les colis sont déjà affectés à une tournée.
                </p>
              ) : (
                <>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {unassigned.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0b8457]"
                          checked={selected.includes(p.id)}
                          onChange={() =>
                            setSelected(
                              selected.includes(p.id)
                                ? selected.filter((x) => x !== p.id)
                                : [...selected, p.id],
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-ink">{p.parcelRef}</span>
                          <span className="ml-2 text-xs text-muted">
                            {p.recipientName ?? "—"}
                            {p.town ? ` · ${p.town}` : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      run(
                        () => assignParcelsToRoute(selected, r.id),
                        `${selected.length} colis affecté(s) ✓`,
                      );
                      setAssigning(null);
                      setSelected([]);
                    }}
                    disabled={pending || selected.length === 0}
                    className="mt-3 h-11 w-full rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Affecter {selected.length > 0 ? `(${selected.length})` : ""}
                  </button>
                </>
              )}
            </div>
          )}
        </Card>
      ))}

      {routes.length === 0 && (
        <Card className="p-8 text-center">
          <p className="font-semibold text-ink">Aucune tournée planifiée</p>
          <p className="mt-1 text-sm text-muted">
            Créez une tournée pour un jour de transport, puis affectez-lui des colis.
          </p>
        </Card>
      )}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon width={16} height={16} /> Planifier une tournée
        </button>
      ) : (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Nouvelle tournée</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <input
                className={inputCls}
                value={nw.code}
                onChange={(e) => setNw({ ...nw, code: e.target.value })}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className={inputCls}
                value={nw.routeDate}
                onChange={(e) => setNw({ ...nw, routeDate: e.target.value })}
              />
            </Field>
            <Field label="Chauffeur">
              <select
                className={inputCls}
                value={nw.driverId}
                onChange={(e) => setNw({ ...nw, driverId: e.target.value })}
              >
                <option value="">Non assigné</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trajet">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Dakar"
                  value={nw.originTown}
                  onChange={(e) => setNw({ ...nw, originTown: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Rufisque"
                  value={nw.destinationTown}
                  onChange={(e) => setNw({ ...nw, destinationTown: e.target.value })}
                />
              </div>
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
                    saveRoute({
                      code: nw.code,
                      driverId: nw.driverId || null,
                      routeDate: nw.routeDate,
                      originTown: nw.originTown,
                      destinationTown: nw.destinationTown,
                    }),
                  "Tournée créée ✓",
                );
                setShowNew(false);
              }}
              disabled={pending}
              className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-60"
            >
              Créer la tournée
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
