"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderAdmin } from "@/app/actions";
import {
  STATUSES,
  PARTNERS,
  STATUS_FR,
  PAYMENT_FR,
  isCustomQuoteBand,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/data";
import { Field, inputCls } from "@/components/ui";

export function ManageOrderForm({ order }: { order: Order }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [payment, setPayment] = useState<PaymentStatus>(order.payment);
  const [partner, setPartner] = useState(order.partner ?? "");
  const [total, setTotal] = useState(String(order.total ?? 0));
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const needsQuote = isCustomQuoteBand(order.band);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateOrderAdmin(order.id, {
        status,
        payment,
        partner: partner || null,
        total: Number(total) || 0,
        note: note || undefined,
      });
      if (res.error) setMsg(res.error);
      else {
        setMsg("Enregistré ✓");
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <Field label="Statut">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_FR[s]}</option>
          ))}
        </select>
      </Field>
      <Field label="Paiement">
        <select className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
          <option value="Unpaid">{PAYMENT_FR.Unpaid}</option>
          <option value="Paid">{PAYMENT_FR.Paid}</option>
          <option value="Refunded">{PAYMENT_FR.Refunded}</option>
        </select>
      </Field>
      <Field
        label={needsQuote ? "Prix du devis (€)" : "Prix (€)"}
        hint={
          needsQuote
            ? "Colis > 25 kg : saisissez le montant du devis, puis passez le paiement à « Payé » une fois réglé."
            : "Montant total facturé au client."
        }
      >
        <input
          type="number"
          min={0}
          step="0.01"
          className={`${inputCls} ${needsQuote && Number(total) <= 0 ? "border-accent ring-2 ring-accent/20" : ""}`}
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </Field>
      <Field label="Partenaire assigné">
        <select className={inputCls} value={partner} onChange={(e) => setPartner(e.target.value)}>
          <option value="">— Non assigné —</option>
          {PARTNERS.map((p) => (
            <option key={p.name}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Note de statut" hint="Enregistrée dans l'historique de suivi, visible par le client.">
        <textarea
          className={`${inputCls} h-20 py-2.5 resize-none`}
          placeholder="Note facultative…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <button
        onClick={save}
        disabled={pending}
        className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Enregistré") ? "text-brand" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
