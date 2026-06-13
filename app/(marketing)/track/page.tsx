"use client";

import { useState, useTransition } from "react";
import { fmtDate, COUNTRY_FR, DELIVERY_FR, type Order } from "@/lib/data";
import { trackByCode } from "@/app/actions";
import { Card, PageTitle, StatusBadge, Timeline, inputCls } from "@/components/ui";
import { SearchIcon, BoxIcon } from "@/components/icons";

export default function TrackPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Order | null | "notfound">(null);
  const [pending, startTransition] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const order = await trackByCode(code);
      setResult(order ?? "notfound");
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <PageTitle
        title="Suivez votre colis"
        subtitle="Saisissez votre numéro de suivi (ex. YMT-7F2K9Q) ou de commande."
      />
      <form onSubmit={search} className="flex gap-2">
        <input
          className={inputCls}
          placeholder="YMT-XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-60"
        >
          <SearchIcon width={18} height={18} />
          <span className="hidden sm:inline">{pending ? "Recherche…" : "Suivre"}</span>
        </button>
      </form>

      <p className="mt-2 text-xs text-muted">
        Vous trouverez le code sur votre confirmation de réservation.
      </p>

      {result === "notfound" && (
        <Card className="mt-6 p-6 text-center">
          <BoxIcon width={32} height={32} className="mx-auto text-muted mb-2" />
          <p className="font-semibold text-ink">Aucun colis trouvé</p>
          <p className="text-sm text-muted mt-1">
            Vérifiez le code sur votre e-mail de confirmation et réessayez.
          </p>
        </Card>
      )}

      {result && result !== "notfound" && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-muted font-medium">{result.orderNumber} · réservé le {fmtDate(result.date)}</p>
              <p className="text-lg font-bold text-ink mt-0.5">
                {COUNTRY_FR[result.origin]} → {COUNTRY_FR[result.destination]}
              </p>
              <p className="text-sm text-muted">
                {result.band} · {DELIVERY_FR[result.delivery]}
              </p>
            </div>
            <StatusBadge status={result.status} incident={result.incident} />
          </div>
          <Timeline log={result.log} current={result.status} />
        </Card>
      )}
    </div>
  );
}
