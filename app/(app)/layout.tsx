"use client";

import { AppShell } from "@/components/app-shell";
import { HomeIcon, PlusIcon, BoxIcon, UserIcon } from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/book", label: "Ship", icon: PlusIcon },
  { href: "/shipments", label: "Shipments", icon: BoxIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell items={NAV} title="YonelMa">
      {children}
    </AppShell>
  );
}
