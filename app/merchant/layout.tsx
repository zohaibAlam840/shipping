// Relay merchant workspace. A merchant sees only their own shop (AT-02).
import { requireStaff } from "@/lib/roles";
import { MerchantNav } from "./nav";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff(["merchant", "admin", "support"]);
  return <MerchantNav accent={user.name}>{children}</MerchantNav>;
}
