import { fmtDateTime } from "@/lib/data";
import { getOrdersByPartner } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { AlertIcon } from "@/components/icons";

export const metadata = { title: "Incidents" };
export const dynamic = "force-dynamic";

const PARTNER_NAME = "DakarExpress 3PL";

export default async function PartnerIncidentsPage() {
  const orders = await getOrdersByPartner(PARTNER_NAME);
  const incidents = orders
    .filter((o) => o.incident)
    .flatMap((o) =>
      o.log
        .filter((e) => e.status === "Incident reported")
        .map((e) => ({ order: o, event: e })),
    );

  return (
    <div>
      <PageTitle title="Incidents" subtitle="Problèmes signalés sur vos envois assignés." />
      <div className="space-y-3">
        {incidents.map(({ order, event }) => (
          <Card key={order.id + event.at} className="p-4 flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <AlertIcon width={22} height={22} />
            </span>
            <div>
              <p className="font-semibold text-ink text-sm">{order.orderNumber}</p>
              <p className="text-xs text-muted mt-0.5">{fmtDateTime(event.at)}</p>
              {event.note && <p className="text-sm text-ink mt-1.5">{event.note}</p>}
            </div>
          </Card>
        ))}
        {incidents.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Aucun incident signalé. 🎉</Card>
        )}
      </div>
    </div>
  );
}
