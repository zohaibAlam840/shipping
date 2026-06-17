"use client";

import { useState } from "react";
import Link from "next/link";
import {
  STATUSES,
  eur,
  fmtDate,
  STATUS_FR,
  PAYMENT_FR,
  COUNTRY_FR,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/data";
import { Card, StatusBadge, PaymentBadge, inputCls } from "@/components/ui";
import { ChevronRightIcon, SearchIcon } from "@/components/icons";

export function OrdersExplorer({ orders }: { orders: Order[] }) {
  const [qStr, setQStr] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "All">("All");

  const filtered = orders.filter((o) => {
    const matchesText =
      !qStr ||
      [o.orderNumber, o.trackingNumber, o.customer, o.recipient.name]
        .join(" ")
        .toLowerCase()
        .includes(qStr.toLowerCase());
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    const matchesPayment = paymentFilter === "All" || o.payment === paymentFilter;
    return matchesText && matchesStatus && matchesPayment;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon width={18} height={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={`${inputCls} pl-10`}
            placeholder="Rechercher commande, suivi, client…"
            value={qStr}
            onChange={(e) => setQStr(e.target.value)}
          />
        </div>
        <select
          className={`${inputCls} sm:w-52`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "All")}
        >
          <option value="All">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_FR[s]}</option>
          ))}
        </select>
        <select
          className={`${inputCls} sm:w-44`}
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | "All")}
        >
          <option value="All">Tous les paiements</option>
          <option value="Paid">{PAYMENT_FR.Paid}</option>
          <option value="Unpaid">{PAYMENT_FR.Unpaid}</option>
          <option value="Refunded">{PAYMENT_FR.Refunded}</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="block group">
            <Card className="p-4 group-hover:border-brand/40 transition">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink text-sm truncate">
                      {o.orderNumber} · {o.customer}
                    </p>
                    <p className="font-bold text-ink text-sm shrink-0">{eur(o.total)}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {COUNTRY_FR[o.origin]} → {COUNTRY_FR[o.destination]} · {o.band} · {fmtDate(o.date)}
                    {o.partner && <> · {o.partner}</>}
                  </p>
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    <StatusBadge status={o.status} incident={o.incident} />
                    <PaymentBadge payment={o.payment} />
                  </div>
                </div>
                <ChevronRightIcon width={18} height={18} className="text-muted shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Aucune commande ne correspond à vos filtres.</Card>
        )}
      </div>
    </div>
  );
}
