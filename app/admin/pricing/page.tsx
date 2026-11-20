// Pricing administration (founder answer 5).
import { getPricingRules, getZones } from "@/lib/sn-domain";
import { PageTitle } from "@/components/ui";
import { PricingManager } from "./pricing-manager";

export const metadata = { title: "Tarifs" };
export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [rules, zones] = await Promise.all([getPricingRules(), getZones()]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <PageTitle
          title="Tarifs nationaux"
          subtitle="Modèle régional uniforme : le prix dépend du poids et du mode de livraison, pas de la distance entre les relais."
        />
      </div>
      <PricingManager rules={rules} zones={zones} />
    </div>
  );
}
