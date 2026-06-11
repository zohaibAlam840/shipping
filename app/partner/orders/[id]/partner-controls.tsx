"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceStatus, reportIncident } from "@/app/actions";
import { STATUSES, statusIndex, type Order } from "@/lib/data";
import { Card, inputCls } from "@/components/ui";
import { CheckIcon, AlertIcon, ArrowRightIcon } from "@/components/icons";

const PARTNER_NAME = "DakarExpress 3PL";

export function PartnerControls({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showIncident, setShowIncident] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentSent, setIncidentSent] = useState(false);

  const idx = statusIndex(order.status);
  const next = idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  const delivered = order.status === "Delivered";

  function advance() {
    if (!next) return;
    startTransition(async () => {
      await advanceStatus(order.id, next, PARTNER_NAME);
      router.refresh();
    });
  }

  function submitIncident() {
    startTransition(async () => {
      await reportIncident(order.id, incidentNote, PARTNER_NAME);
      setIncidentSent(true);
      setShowIncident(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-5 mb-4">
      <h2 className="font-bold text-ink mb-4">Update status</h2>
      {next && !delivered ? (
        <button
          onClick={advance}
          disabled={pending}
          className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? "Updating…" : `Mark as “${next}”`} <ArrowRightIcon width={18} height={18} />
        </button>
      ) : (
        <p className="flex items-center justify-center gap-2 h-12 rounded-full bg-brand-light text-brand font-semibold">
          <CheckIcon width={18} height={18} /> Delivered — all done
        </p>
      )}

      {!showIncident && !incidentSent && !order.incident && (
        <button
          onClick={() => setShowIncident(true)}
          className="mt-3 h-11 w-full rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition inline-flex items-center justify-center gap-2"
        >
          <AlertIcon width={16} height={16} /> Report an incident
        </button>
      )}
      {showIncident && (
        <div className="mt-3 space-y-2.5">
          <textarea
            className={`${inputCls} h-24 py-2.5 resize-none`}
            placeholder="What happened? (damage, customs hold, wrong address…)"
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowIncident(false)}
              className="h-11 flex-1 rounded-full border border-line text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              disabled={!incidentNote.trim() || pending}
              onClick={submitIncident}
              className="h-11 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-700 transition"
            >
              {pending ? "Submitting…" : "Submit incident"}
            </button>
          </div>
        </div>
      )}
      {(incidentSent || order.incident) && (
        <p className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 font-medium">
          Incident on file — the admin team has an open claim for this order.
        </p>
      )}
    </Card>
  );
}
