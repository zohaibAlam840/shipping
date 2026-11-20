import Link from "next/link";
import { nextRelayCode } from "@/lib/relays";
import { getZones } from "@/lib/sn-domain";
import { PageTitle } from "@/components/ui";
import { RelayForm } from "../relay-form";

export const metadata = { title: "Nouveau point relais" };
export const dynamic = "force-dynamic";

export default async function NewRelayPage() {
  // Suggest the next code in the series so the administrator doesn't have to
  // track numbering by hand (SN-REL-01).
  const [zones, code] = await Promise.all([getZones(), nextRelayCode()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/relays" className="text-sm font-semibold text-brand">
        ← Points relais
      </Link>
      <div className="mt-3 mb-5">
        <PageTitle
          title="Nouveau point relais"
          subtitle="La boutique est créée en brouillon, puis soumise et approuvée avant d'apparaître à la réservation."
        />
      </div>
      <RelayForm zones={zones} defaultCode={code} />
    </div>
  );
}
