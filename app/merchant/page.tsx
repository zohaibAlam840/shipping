import { requireStaff } from "@/lib/roles";
import { getRelays } from "@/lib/relays";
import { getParcelsAtRelays } from "@/lib/parcels";
import { Card, PageTitle } from "@/components/ui";
import { MerchantConsole } from "./merchant-console";

export const metadata = { title: "Point relais" };
export const dynamic = "force-dynamic";

export default async function MerchantPage() {
  const user = await requireStaff(["merchant", "admin", "support"]);
  const relays = await getRelays();

  // Supervisors see every shop; a merchant sees strictly their own (AT-02).
  const myRelayIds =
    user.role === "merchant" ? user.relayIds : relays.map((r) => r.id);
  const myRelays = relays.filter((r) => myRelayIds.includes(r.id));
  const parcels = await getParcelsAtRelays(myRelayIds);

  const shopName =
    myRelays.length === 1 ? myRelays[0].name : `${myRelays.length} boutique(s)`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <PageTitle title={shopName} subtitle={`${parcels.length} colis sur place`} />
      </div>

      {user.role === "merchant" && myRelayIds.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          Aucune boutique n&apos;est rattachée à votre compte. Contactez l&apos;administrateur
          YonelMa.
        </Card>
      ) : (
        <MerchantConsole parcels={parcels} shopName={shopName} />
      )}
    </div>
  );
}
