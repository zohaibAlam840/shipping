"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceStatus, reportIncident } from "@/app/actions";
import { STATUSES, statusIndex, STATUS_FR, type Order } from "@/lib/data";
import { Card, inputCls } from "@/components/ui";
import { CheckIcon, AlertIcon, ArrowRightIcon } from "@/components/icons";

export function PartnerControls({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showIncident, setShowIncident] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [incidentSent, setIncidentSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idx = statusIndex(order.status);
  const next = idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  const delivered = order.status === "Delivered";

  // The actor is resolved from the session on the server — the client no
  // longer says who it is.
  function advance() {
    if (!next) return;
    setError(null);
    startTransition(async () => {
      const res = await advanceStatus(order.id, next);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function submitIncident() {
    setError(null);
    startTransition(async () => {
      const res = await reportIncident(order.id, incidentNote);
      if (res.error) {
        setError(res.error);
        return;
      }
      setIncidentSent(true);
      setShowIncident(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-5 mb-4">
      <h2 className="font-bold text-ink mb-4">Mettre à jour le statut</h2>
      {next && !delivered ? (
        <button
          onClick={advance}
          disabled={pending}
          className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? "Mise à jour…" : `Marquer « ${STATUS_FR[next]} »`} <ArrowRightIcon width={18} height={18} />
        </button>
      ) : (
        <p className="flex items-center justify-center gap-2 h-12 rounded-full bg-brand-light text-brand font-semibold">
          <CheckIcon width={18} height={18} /> Livré — terminé
        </p>
      )}

      {!showIncident && !incidentSent && !order.incident && (
        <button
          onClick={() => setShowIncident(true)}
          className="mt-3 h-11 w-full rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition inline-flex items-center justify-center gap-2"
        >
          <AlertIcon width={16} height={16} /> Signaler un incident
        </button>
      )}
      {showIncident && (
        <div className="mt-3 space-y-2.5">
          <textarea
            className={`${inputCls} h-24 py-2.5 resize-none`}
            placeholder="Que s'est-il passé ? (dommage, blocage en douane, mauvaise adresse…)"
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowIncident(false)}
              className="h-11 flex-1 rounded-full border border-line text-sm font-semibold text-ink"
            >
              Annuler
            </button>
            <button
              disabled={!incidentNote.trim() || pending}
              onClick={submitIncident}
              className="h-11 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-700 transition"
            >
              {pending ? "Envoi…" : "Signaler l'incident"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {(incidentSent || order.incident) && (
        <p className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 font-medium">
          Incident enregistré — l'équipe admin a une réclamation ouverte pour cette commande.
        </p>
      )}
    </Card>
  );
}
