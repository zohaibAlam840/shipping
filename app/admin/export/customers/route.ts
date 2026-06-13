// Excel/CSV export of customers (derived from orders).
import { getCustomers } from "@/lib/db";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import { fmtDate } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const customers = await getCustomers();

  const headers = [
    "Nom",
    "E-mail",
    "Nombre de commandes",
    "Total dépensé (€)",
    "Première commande",
  ];

  const rows = customers.map((c) => [
    c.name,
    c.email,
    c.orders,
    c.spend,
    fmtDate(c.firstOrder),
  ]);

  return csvResponse(`yonelma-clients-${stamp()}.csv`, toCsv(headers, rows));
}
