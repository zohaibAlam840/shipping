"use client";

import { AppShell } from "@/components/app-shell";
import { BoxIcon } from "@/components/icons";

const NAV = [{ href: "/merchant", label: "Ma boutique", icon: BoxIcon, exact: true }];

export function MerchantNav({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <AppShell items={NAV} title="YonelMa Relais" accent={accent}>
      {children}
    </AppShell>
  );
}
