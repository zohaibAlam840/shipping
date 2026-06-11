"use client";

import { useState, useTransition } from "react";
import { fmtDate, type Order } from "@/lib/data";
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
        title="Track your parcel"
        subtitle="Enter your tracking number (e.g. YMT-7F2K9Q) or order number."
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
          <span className="hidden sm:inline">{pending ? "Searching…" : "Track"}</span>
        </button>
      </form>

      <p className="mt-2 text-xs text-muted">
        You'll find the code on your booking confirmation.
      </p>

      {result === "notfound" && (
        <Card className="mt-6 p-6 text-center">
          <BoxIcon width={32} height={32} className="mx-auto text-muted mb-2" />
          <p className="font-semibold text-ink">No parcel found</p>
          <p className="text-sm text-muted mt-1">
            Check the code on your confirmation email and try again.
          </p>
        </Card>
      )}

      {result && result !== "notfound" && (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-muted font-medium">{result.orderNumber} · booked {fmtDate(result.date)}</p>
              <p className="text-lg font-bold text-ink mt-0.5">
                {result.origin} → {result.destination}
              </p>
              <p className="text-sm text-muted">
                {result.band} · {result.delivery}
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
