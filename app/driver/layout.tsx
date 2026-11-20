// Driver workspace (spec §6 wireframe).
import { requireStaff } from "@/lib/roles";
import { DriverNav } from "./nav";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff(["driver", "admin", "support"]);
  return <DriverNav accent={user.name}>{children}</DriverNav>;
}
