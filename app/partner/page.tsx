import Link from "next/link";
import { fmtDate } from "@/lib/data";
import { getOrders, getOrdersByPartner } from "@/lib/db";
import { requireStaff } from "@/lib/roles";
import { Card, PageTitle, StatusBadge } from "@/components/ui";
import { BoxIcon, ChevronRightIcon, PinIcon } from "@/components/icons";

export const metadata = { title: "Partner workspace" };
export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  // Identity now comes from the authenticated session, not a hardcoded
  // partner name. Supervisors see everything; a driver sees only the
  // shipments assigned to the logistics company on their account.
  const user = await requireStaff(["driver", "support", "admin"]);
  const seesAll = user.role === "admin" || user.role === "support";
  const assigned = seesAll
    ? await getOrders()
    : user.partnerName
      ? await getOrdersByPartner(user.partnerName)
      : [];

  const scope = seesAll ? "Tous les envois" : (user.partnerName ?? "Aucune société rattachée");

  return (
    <div>
      <PageTitle
        title="Envois assignés"
        subtitle={`${scope} · ${assigned.length} commande(s)`}
      />
      {!seesAll && !user.partnerName && (
        <Card className="mb-3 p-4 text-sm text-muted">
          Votre compte n&apos;est rattaché à aucune société de transport. Demandez à
          l&apos;administrateur de renseigner votre société pour voir vos envois.
        </Card>
      )}
      <div className="space-y-3">
        {assigned.map((o) => (
          <Link key={o.id} href={`/partner/orders/${o.id}`} className="block group">
            <Card className="p-4 group-hover:border-brand/40 transition">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <BoxIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink text-sm">
                    {o.orderNumber} · {o.band}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <PinIcon width={12} height={12} /> {o.recipient.address}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Réservé le {fmtDate(o.date)}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={o.status} incident={o.incident} />
                  </div>
                </div>
                <ChevronRightIcon width={18} height={18} className="text-muted shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
        {assigned.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Aucun envoi assigné pour le moment.</Card>
        )}
      </div>
    </div>
  );
}
