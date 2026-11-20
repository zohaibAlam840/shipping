"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scanRelayReceipt, verifyPickup, reportParcelException } from "@/app/scan-actions";
import { PARCEL_STATUS_FR, type ParcelWithContext } from "@/lib/parcels";
import { ParcelScanner } from "@/components/parcel-scanner";
import { Card, inputCls } from "@/components/ui";
import { BoxIcon, CheckIcon, AlertIcon } from "@/components/icons";

type Mode = "receipt" | "pickup";

/**
 * Relay merchant console (spec §6 wireframe).
 *
 * Two jobs: acknowledge parcels the driver hands over — which is the only
 * action that makes a parcel available (AT-05) — and hand parcels to
 * recipients against their one-time code (AT-06).
 */
export function MerchantConsole({
  parcels,
  shopName,
}: {
  parcels: ParcelWithContext[];
  shopName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("receipt");
  const [scanned, setScanned] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState("");

  const awaiting = parcels.filter((p) => p.status === "Awaiting relay acceptance");
  const ready = parcels.filter((p) => p.status === "Ready for pickup");

  function handleScan(value: string) {
    setMessage(null);
    if (mode === "pickup") {
      // Collection needs the recipient's code as well as the scan.
      setScanned(value);
      return;
    }
    startTransition(async () => {
      const res = await scanRelayReceipt(value);
      if (res.duplicate) setMessage({ kind: "warn", text: res.error ?? "Déjà scanné." });
      else if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({
          kind: "ok",
          text: `${res.parcelRef} accepté — disponible pour retrait. Le code a été envoyé au destinataire.`,
        });
        router.refresh();
      }
    });
  }

  function confirmPickup() {
    if (!scanned) return;
    setMessage(null);
    startTransition(async () => {
      const res = await verifyPickup(scanned, code);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "ok", text: `${res.parcelRef} remis au destinataire ✓` });
        setScanned(null);
        setCode("");
        router.refresh();
      }
    });
  }

  function submitIssue(ref: string) {
    startTransition(async () => {
      const res = await reportParcelException(ref, "relay_issue", issueNote);
      if (res.error) setMessage({ kind: "error", text: res.error });
      else {
        setMessage({ kind: "ok", text: "Anomalie signalée ✓" });
        setIssueFor(null);
        setIssueNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex gap-2">
          {(
            [
              ["receipt", "Réception"],
              ["pickup", "Remise au client"],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setMode(value);
                setScanned(null);
                setMessage(null);
              }}
              className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition ${
                mode === value ? "border-brand bg-brand-light text-brand" : "border-line text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "pickup" && scanned ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Colis scanné. Demandez son code de retrait au destinataire.
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
                onClick={confirmPickup}
                disabled={pending || code.length < 4}
                className="h-12 flex-1 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-40"
              >
                {pending ? "Vérification…" : "Confirmer la remise"}
              </button>
            </div>
          </div>
        ) : (
          <ParcelScanner
            onScan={handleScan}
            busy={pending}
            label={mode === "receipt" ? "Scanner la réception" : "Scanner le colis à remettre"}
          />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">En attente d&apos;acceptation</p>
          <p className="text-3xl font-bold text-ink">{awaiting.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Disponibles pour retrait</p>
          <p className="text-3xl font-bold text-brand">{ready.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-ink">Colis — {shopName}</h2>
        <div className="space-y-2">
          {parcels.map((p) => (
            <div key={p.id} className="rounded-xl border border-line p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <BoxIcon width={16} height={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{p.parcelRef}</p>
                  <p className="text-xs text-muted">
                    {p.recipientName} · {p.recipientPhone}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand">
                    {PARCEL_STATUS_FR[p.status]}
                  </p>
                </div>
                <button
                  onClick={() => setIssueFor(issueFor === p.parcelRef ? null : p.parcelRef)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-muted transition hover:border-red-200 hover:text-red-600"
                >
                  <AlertIcon width={14} height={14} /> Anomalie
                </button>
              </div>
              {issueFor === p.parcelRef && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className={`${inputCls} h-20 resize-none py-2.5`}
                    placeholder="Colis endommagé, mauvaise boutique, colis manquant…"
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                  />
                  <button
                    onClick={() => submitIssue(p.parcelRef)}
                    disabled={pending || !issueNote.trim()}
                    className="h-10 w-full rounded-full bg-red-600 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Signaler l&apos;anomalie
                  </button>
                </div>
              )}
            </div>
          ))}
          {parcels.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              <CheckIcon width={18} height={18} className="mx-auto mb-1 text-brand" />
              Aucun colis en boutique pour le moment.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
