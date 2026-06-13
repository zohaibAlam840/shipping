"use client";

import { AppShell } from "@/components/app-shell";
import { HomeIcon, PlusIcon, BoxIcon, UserIcon } from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/book", label: "Envoyer", icon: PlusIcon },
  { href: "/shipments", label: "Envois", icon: BoxIcon },
  { href: "/profile", label: "Profil", icon: UserIcon },
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
