import { getOrders } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { OrdersExplorer } from "./orders-explorer";

export const metadata = { title: "Commandes" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageTitle title="Commandes" subtitle={`${orders.length} au total`} />
      <OrdersExplorer orders={orders} />
    </div>
  );
}
