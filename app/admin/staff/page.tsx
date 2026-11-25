// Staff accounts: invitations, roles, shop access and credential resets
// (spec §3, SN-REL-03, SN-REL-05).
import { getStaff } from "@/lib/staff";
import { getRelays } from "@/lib/relays";
import { Card, PageTitle } from "@/components/ui";
import { StaffManager, type RelayChoice } from "./staff-manager";

export const metadata = { title: "Personnel" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const [staff, relays] = await Promise.all([getStaff(), getRelays()]);

  const choices: RelayChoice[] = relays.map((r) => ({
    id: r.id,
    name: r.name,
    town: r.town,
  }));

  const counts = staff.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <PageTitle
          title="Personnel"
          subtitle={`${staff.length} compte(s) · ${counts.merchant ?? 0} commerçant(s) · ${counts.driver ?? 0} chauffeur(s)`}
        />
      </div>

      <Card className="mb-4 border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm text-amber-800">
          Chaque action sensible est enregistrée avec l&apos;identité de son auteur. Un compte
          suspendu perd immédiatement l&apos;accès à toutes les interfaces.
        </p>
      </Card>

      <StaffManager staff={staff} relays={choices} />
    </div>
  );
}
