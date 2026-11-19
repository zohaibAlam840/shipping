// Partner / driver workspace.
//
// SECURITY: this area used to be completely unguarded — it is not in the
// customer route list, so anyone who knew the URL could open it and advance
// parcel statuses. The role guard below is the fix (spec §3).
import { requireStaff, ROLE_FR } from "@/lib/roles";
import { PartnerNav } from "./partner-nav";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff(["driver", "support", "admin"]);

  return <PartnerNav accent={ROLE_FR[user.role]}>{children}</PartnerNav>;
}
