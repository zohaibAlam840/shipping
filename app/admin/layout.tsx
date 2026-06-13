"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ChartIcon, BoxIcon, UsersIcon, AlertIcon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Indicateurs", icon: ChartIcon, exact: true },
  { href: "/admin/orders", label: "Commandes", icon: BoxIcon },
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
