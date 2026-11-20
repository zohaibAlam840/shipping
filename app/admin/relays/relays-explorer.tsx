"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RELAY_STATUS_FR,
  COMMERCIAL_STATUS_FR,
  type Relay,
  type RelayStatus,
} from "@/lib/relays";
import type { Zone } from "@/lib/sn-shared";
import { setRelayStatus } from "@/app/admin/admin-actions";
import { Card, inputCls } from "@/components/ui";
import { SearchIcon, PinIcon, BoxIcon, ChevronRightIcon } from "@/components/icons";

const STATUS_STYLES: Record<RelayStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-brand-light text-brand border-brand/20",
  suspended: "bg-orange-50 text-orange-700 border-orange-200",
  closed: "bg-red-50 text-red-700 border-red-200",
};

/** Next step in the lifecycle, shown as a one-click button (SN-REL-02). */
const NEXT_ACTION: Partial<Record<RelayStatus, { to: RelayStatus; label: string }>> = {
  draft: { to: "pending", label: "Soumettre" },
  pending: { to: "active", label: "Approuver" },
  active: { to: "suspended", label: "Suspendre" },
  suspended: { to: "active", label: "Réactiver" },
};

export function RelaysExplorer({ relays, zones }: { relays: Relay[]; zones: Zone[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RelayStatus | "All">("All");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? "—";

  const filtered = relays.filter((r) => {
    const needle = q.trim().toLowerCase();
    const matchesText =
      !needle ||
      r.name.toLowerCase().includes(needle) ||
      r.code.toLowerCase().includes(needle) ||
      r.town.toLowerCase().includes(needle);
    return matchesText && (status === "All" || r.status === status);
  });

  function advance(id: string, to: RelayStatus) {
    setError(null);
    startTransition(async () => {
      const res = await setRelayStatus(id, to);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            width={18}
            height={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            className={`${inputCls} pl-10`}
            placeholder="Nom, ville ou code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={`${inputCls} sm:w-64`}
          value={status}
          onChange={(e) => setStatus(e.target.value as RelayStatus | "All")}
        >
          <option value="All">Tous les statuts</option>
          {(Object.keys(RELAY_STATUS_FR) as RelayStatus[]).map((s) => (
            <option key={s} value={s}>
              {RELAY_STATUS_FR[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const next = NEXT_ACTION[r.status];
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <PinIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {r.code} · {r.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.town}
                    {r.neighborhood ? ` · ${r.neighborhood}` : ""} · Zone {zoneName(r.zoneId)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}
                    >
                      {RELAY_STATUS_FR[r.status]}
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                      {COMMERCIAL_STATUS_FR[r.commercialStatus]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <BoxIcon width={12} height={12} />
                      {r.parcelsOnSite ?? 0} colis sur place
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {next && (
                    <button
                      onClick={() => advance(r.id, next.to)}
                      disabled={pending}
                      className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
                    >
                      {next.label}
                    </button>
                  )}
                  <Link
                    href={`/admin/relays/${r.id}`}
                    className="inline-flex h-10 items-center gap-1 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
                  >
                    Ouvrir <ChevronRightIcon width={16} height={16} />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">
            Aucun point relais ne correspond à cette recherche.
          </Card>
        )}
      </div>
    </div>
  );
}
