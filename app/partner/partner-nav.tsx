"use client";

import { AppShell } from "@/components/app-shell";
import { BoxIcon, AlertIcon } from "@/components/icons";

const NAV = [
  { href: "/partner", label: "Assignés", icon: BoxIcon, exact: true },
  { href: "/partner/incidents", label: "Incidents", icon: AlertIcon },
];

/**
 * Client chrome for the partner/driver workspace. Kept separate from the
 * layout so the layout itself can stay a server component and run the role
 * guard (icon components can't cross the server/client boundary as props).
 */
export function PartnerNav({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell items={NAV} title="YonelMa Partner" accent={accent}>
      {children}
    </AppShell>
  );
}
