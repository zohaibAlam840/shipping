"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  scanCollect,
  scanDepart,
  scanHandover,
  confirmHomeDelivery,
  reportFailedAttempt,
} from "@/app/scan-actions";
import { PARCEL_STATUS_FR, type ParcelWithContext } from "@/lib/parcels";
import { ParcelScanner } from "@/components/parcel-scanner";
import { Card, inputCls } from "@/components/ui";
import { BoxIcon, PinIcon, TruckIcon } from "@/components/icons";

type Step = "collect" | "depart" | "handover" | "deliver";

const STEP_LABEL: Record<Step, string> = {
  collect: "Collecte",
  depart: "Départ",
  handover: "Remise au relais",
  deliver: "Livraison à domicile",
};

export interface RelayOption {
  id: string;
  name: string;
  town: string;
}

/**
 * Driver console (spec §6 wireframe, AT-04, AT-05, AT-07).
 *
 * Handing a parcel to a shop only marks it "awaiting relay acceptance" — the
 * merchant's own scan is what makes it available to the recipient.
 */
export function DriverConsole({
  parcels,
  relays,
}: {
  parcels: ParcelWithContext[];
  relays: RelayOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("collect");
  const [relayId, setRelayId] = useState(relays[0]?.id ?? "");
  const [scanned, setScanned] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [failNote, setFailNote] = useState("");
  const [showFail, setShowFail] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);

  function report(res: { error?: string; duplicate?: boolean; parcelRef?: string; status?: string }, success: string) {
    if (res.duplicate) setMessage({ kind: "warn", text: res.error ?? "Déjà scanné." });
    else if (res.error) setMessage({ kind: "error", text: res.error });
    else {
      setMessage({ kind: "ok", text: `${res.parcelRef} — ${success}` });
      router.refresh();
    }
  }

  function handleScan(value: string) {
    setMessage(null);
    if (step === "deliver") {
      setScanned(value); // delivery needs the recipient's code too
      return;
    }
    startTransition(async () => {
      if (step === "collect") report(await scanCollect(value, relayId || undefined), "collecté");
      else if (step === "depart") report(await scanDepart(value), "en transit");
      else {
        if (!relayId) {
          setMessage({ kind: "error", text: "Choisissez le point relais destinataire." });
          return;
        }
        report(
          await scanHandover(value, relayId),
          "remis — en attente de l'acceptation du commerçant",
        );
      }
    });
  }

  function confirmDelivery() {
    if (!scanned) return;
    setMessage(null);
    startTransition(async () => {
      const res = await confirmHomeDelivery(scanned, code);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "ok", text: `${res.parcelRef} livré ✓` });
        setScanned(null);
        setCode("");
        router.refresh();
      }
    });
  }

  function submitFailure() {
    if (!scanned) return;
    startTransition(async () => {
      const res = await reportFailedAttempt(scanned, failNote);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "ok", text: "Tentative échouée enregistrée ✓" });
        setScanned(null);
        setShowFail(false);
        setFailNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(Object.keys(STEP_LABEL) as Step[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStep(s);
                setScanned(null);
                setMessage(null);
              }}
              className={`h-11 rounded-xl border text-sm font-semibold transition ${
                step === s ? "border-brand bg-brand-light text-brand" : "border-line text-muted"
              }`}
            >
              {STEP_LABEL[s]}
            </button>
          ))}
        </div>

        {(step === "collect" || step === "handover") && (
          <div className="mb-3">
            <p className="mb-1.5 text-sm font-medium text-ink">
              {step === "collect" ? "Point relais de collecte" : "Point relais destinataire"}
            </p>
            <select
              className={inputCls}
              value={relayId}
              onChange={(e) => setRelayId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {relays.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.town}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === "deliver" && scanned ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Demandez son code confidentiel au destinataire.
            </p>
            <input
              className={`${inputCls} text-center text-2xl tracking-[0.4em]`}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setScanned(null);
                  setCode("");
                }}
                className="h-12 flex-1 rounded-full border border-line text-sm font-semibold text-ink"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelivery}
                disabled={pending || code.length < 4}
                className="h-12 flex-1 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-40"
              >
                {pending ? "Vérification…" : "Confirmer la livraison"}
              </button>
            </div>

            {!showFail ? (
              <button
                onClick={() => setShowFail(true)}
                className="mt-3 h-11 w-full rounded-full border border-amber-200 text-sm font-semibold text-amber-700"
              >
                Tentative échouée
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <textarea
                  className={`${inputCls} h-20 resize-none py-2.5`}
                  placeholder="Destinataire absent, adresse introuvable…"
                  value={failNote}
                  onChange={(e) => setFailNote(e.target.value)}
                />
                <button
                  onClick={submitFailure}
                  disabled={pending || !failNote.trim()}
                  className="h-11 w-full rounded-full bg-amber-600 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Enregistrer la tentative
                </button>
              </div>
            )}
          </div>
        ) : (
          <ParcelScanner onScan={handleScan} busy={pending} label={`Scanner — ${STEP_LABEL[step]}`} />
        )}

        {message && (
          <p
            className={`mt-3 rounded-xl border p-3.5 text-sm font-medium ${
              message.kind === "ok"
                ? "border-brand/20 bg-brand-light text-brand"
                : message.kind === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
          <TruckIcon width={18} height={18} /> Colis à traiter
        </h2>
        <div className="space-y-2">
          {parcels.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <BoxIcon width={16} height={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{p.parcelRef}</p>
                <p className="truncate text-xs text-muted">
                  {p.recipientName} · {p.recipientPhone}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <PinIcon width={12} height={12} />
                  {p.destinationRelayName ?? p.recipientAddress}
                </p>
                <p className="mt-1 text-xs font-semibold text-brand">
                  {PARCEL_STATUS_FR[p.status]}
                </p>
              </div>
            </div>
          ))}
          {parcels.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Aucun colis à traiter pour le moment.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
