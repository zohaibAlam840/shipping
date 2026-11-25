"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ChartIcon, BoxIcon, UsersIcon, AlertIcon, TruckIcon, PinIcon, ClockIcon, ShieldIcon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Indicateurs", icon: ChartIcon, exact: true },
  { href: "/admin/orders", label: "Commandes", icon: BoxIcon },
  { href: "/admin/operations", label: "Opérations", icon: TruckIcon },
  { href: "/admin/routes", label: "Tournées", icon: TruckIcon },
  { href: "/admin/relays", label: "Points relais", icon: PinIcon },
  { href: "/admin/zones", label: "Zones", icon: PinIcon },
  { href: "/admin/pricing", label: "Tarifs", icon: ChartIcon },
  { href: "/admin/schedule", label: "Planning", icon: ClockIcon },
  { href: "/admin/partners", label: "Partenaires", icon: TruckIcon },
  { href: "/admin/staff", label: "Personnel", icon: ShieldIcon },
  { href: "/admin/customers", label: "Clients", icon: UsersIcon },
  { href: "/admin/claims", label: "Réclamations", icon: AlertIcon },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <AppShell items={NAV} title="YonelMa Admin" accent="Admin">
      {children}
    </AppShell>
  );
}
