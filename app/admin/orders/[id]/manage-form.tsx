"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderAdmin } from "@/app/actions";
import {
  STATUSES,
  PARTNERS,
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
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateOrderAdmin(order.id, {
        status,
        payment,
        partner: partner || null,
        note: note || undefined,
      });
      if (res.error) setMsg(res.error);
      else {
        setMsg("Saved ✓");
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <Field label="Status">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Payment">
        <select className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
          <option>Unpaid</option>
          <option>Paid</option>
          <option>Refunded</option>
        </select>
      </Field>
      <Field label="Assigned partner">
        <select className={inputCls} value={partner} onChange={(e) => setPartner(e.target.value)}>
          <option value="">— Unassigned —</option>
          {PARTNERS.map((p) => (
            <option key={p.name}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Status note" hint="Saved to the tracking history, visible to the customer.">
        <textarea
          className={`${inputCls} h-20 py-2.5 resize-none`}
          placeholder="Optional note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <button
        onClick={save}
        disabled={pending}
        className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Saved") ? "text-brand" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
