import { eur, fmtDate } from "@/lib/data";
import { getCustomers } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { UserIcon, DownloadIcon } from "@/components/icons";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  return (
    <div>
      <PageTitle
        title="Clients"
        subtitle={`${customers.length} avec des commandes`}
        action={
          <a
            href="/admin/export/customers"
            download
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            <DownloadIcon width={16} height={16} /> Export Excel
          </a>
        }
      />
      <div className="space-y-3">
        {customers.map((c) => (
          <Card key={c.email} className="p-4 flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
              <UserIcon width={22} height={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink text-sm">{c.name}</p>
              <p className="text-xs text-muted mt-0.5 truncate">{c.email}</p>
              <p className="text-xs text-muted mt-0.5">Première commande {fmtDate(c.firstOrder)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-ink text-sm">{eur(c.spend)}</p>
              <p className="text-xs text-muted">{c.orders} commande{c.orders === 1 ? "" : "s"}</p>
            </div>
          </Card>
        ))}
        {customers.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Aucun client pour le moment.</Card>
        )}
      </div>
    </div>
  );
}
