// Role names and labels — pure, with NO database or next/headers import, so
// client components can use them safely. The server-side guards live in
// lib/roles.ts, which re-exports everything below.

export type AppRole = "customer" | "admin" | "merchant" | "driver" | "support";

export const STAFF_ROLES: AppRole[] = ["admin", "merchant", "driver", "support"];

export const ROLE_FR: Record<AppRole, string> = {
  customer: "Client",
  admin: "Administrateur Sénégal",
  merchant: "Commerçant point relais",
  driver: "Chauffeur / coursier",
  support: "Support / superviseur",
};
