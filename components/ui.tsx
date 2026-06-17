import Link from "next/link";
import type { ReactNode } from "react";
import {
  STATUSES,
  statusIndex,
  fmtDateTime,
  STATUS_FR,
  PAYMENT_FR,
  type OrderStatus,
  type PaymentStatus,
  type StatusEvent,
} from "@/lib/data";
import { CheckIcon, AlertIcon } from "@/components/icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-card border border-line shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  "Order Created": "bg-amber-50 text-amber-700 border-amber-200",
  "Payment Received": "bg-sky-50 text-sky-700 border-sky-200",
  "Awaiting E-Logik": "bg-sky-50 text-sky-700 border-sky-200",
  "Received by E-Logik": "bg-sky-50 text-sky-700 border-sky-200",
  "Pallet Preparation": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Collected by TAF": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "In Air Transit": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Arrived in Dakar": "bg-teal-50 text-teal-700 border-teal-200",
  "Customs Clearance": "bg-teal-50 text-teal-700 border-teal-200",
  "Out for Delivery": "bg-teal-50 text-teal-700 border-teal-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusBadge({ status, incident }: { status: OrderStatus; incident?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
      >
        {STATUS_FR[status]}
      </span>
      {incident && (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <AlertIcon width={12} height={12} /> Incident
        </span>
      )}
    </span>
  );
}

export function PaymentBadge({ payment }: { payment: PaymentStatus }) {
  const styles =
    payment === "Paid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : payment === "Refunded"
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {PAYMENT_FR[payment]}
    </span>
  );
}

/** Vertical tracking timeline built from the status log. */
export function Timeline({ log, current }: { log: StatusEvent[]; current: OrderStatus }) {
  const reached = statusIndex(current);
  const logged = new Map(log.map((e) => [e.status, e]));
  const incidents = log.filter((e) => e.status === "Incident reported");

  return (
    <ol className="relative">
      {STATUSES.map((s, i) => {
        const done = i <= reached;
        const ev = logged.get(s);
        const isLast = i === STATUSES.length - 1;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${i < reached ? "bg-brand" : "bg-line"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                done ? "bg-brand border-brand text-white" : "bg-card border-line text-transparent"
              }`}
            >
              <CheckIcon width={13} height={13} strokeWidth={2.6} />
            </span>
            <div className="min-w-0 -mt-0.5">
              <p className={`text-sm font-semibold ${done ? "text-ink" : "text-muted/60"}`}>{STATUS_FR[s]}</p>
              {ev && (
                <p className="text-xs text-muted mt-0.5">
                  {fmtDateTime(ev.at)} · {ev.by}
                  {ev.note && <span className="block text-muted/80">{ev.note}</span>}
                </p>
              )}
            </div>
          </li>
        );
      })}
      {incidents.map((e) => (
        <li key={e.at} className="relative flex gap-3 pt-1">
          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white">
            <AlertIcon width={13} height={13} strokeWidth={2.4} />
          </span>
          <div className="-mt-0.5">
            <p className="text-sm font-semibold text-red-600">Incident signalé</p>
            <p className="text-xs text-muted mt-0.5">
              {fmtDateTime(e.at)} · {e.by}
              {e.note && <span className="block text-muted/80">{e.note}</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 h-12 text-[15px] font-semibold text-white active:scale-[0.98] transition hover:bg-brand-dark ${className}`}
    >
      {children}
    </Link>
  );
}

export function GhostLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-6 h-12 text-[15px] font-semibold text-ink active:scale-[0.98] transition hover:border-brand/40 hover:text-brand ${className}`}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-12 rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink placeholder:text-muted/60 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
