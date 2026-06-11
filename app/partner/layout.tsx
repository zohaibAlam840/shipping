"use client";

import { AppShell } from "@/components/app-shell";
import { BoxIcon, AlertIcon } from "@/components/icons";

const NAV = [
  { href: "/partner", label: "Assigned", icon: BoxIcon, exact: true },
  { href: "/partner/incidents", label: "Incidents", icon: AlertIcon },
];

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell items={NAV} title="YonelMa Partner" accent="Partner">
      {children}
    </AppShell>
  );
}
