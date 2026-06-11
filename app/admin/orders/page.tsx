import { getOrders } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { OrdersExplorer } from "./orders-explorer";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageTitle title="Orders" subtitle={`${orders.length} total`} />
      <OrdersExplorer orders={orders} />
    </div>
  );
}
