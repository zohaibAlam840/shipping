import { getOrders } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { DownloadIcon } from "@/components/icons";
import { OrdersExplorer } from "./orders-explorer";

export const metadata = { title: "Commandes" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageTitle
        title="Commandes"
        subtitle={`${orders.length} au total`}
        action={
          <div className="flex gap-2">
            <a
              href="/admin/export/orders"
              download
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-brand/40"
            >
              <DownloadIcon width={16} height={16} /> Export Excel
            </a>
            <a
              href="/admin/export/manifest"
              download
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              <DownloadIcon width={16} height={16} /> Manifeste
            </a>
          </div>
        }
      />
      <OrdersExplorer orders={orders} />
    </div>
  );
}
