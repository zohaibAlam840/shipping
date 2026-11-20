"use client";

import { AppShell } from "@/components/app-shell";
import { TruckIcon } from "@/components/icons";

const NAV = [{ href: "/driver", label: "Ma tournée", icon: TruckIcon, exact: true }];

export function DriverNav({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <AppShell items={NAV} title="YonelMa Chauffeur" accent={accent}>
      {children}
    </AppShell>
  );
}
