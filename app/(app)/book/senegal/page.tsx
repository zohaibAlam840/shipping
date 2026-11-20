// Senegal domestic booking (spec §4, SN-NAT-01…05).
import { getBookableRelays } from "@/lib/relays";
import { getPricingRules, scheduleForDropoff } from "@/lib/sn-domain";
import { fmtDate } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { SenegalBooking, type BookableRelay } from "./senegal-booking";

export const metadata = { title: "Envoyer un colis au Sénégal" };
export const dynamic = "force-dynamic";

export default async function SenegalBookingPage() {
  await requireUser();

  const [relays, rules, plan] = await Promise.all([
    getBookableRelays(),
    getPricingRules(),
    scheduleForDropoff(new Date()),
  ]);

  // Only what the screen needs — internal fields stay on the server.
  const bookable: BookableRelay[] = relays.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    town: r.town,
    neighborhood: r.neighborhood,
    address: r.address,
    zoneId: r.zoneId,
    hours: Object.values(r.openingHours).filter(Boolean).join(" · "),
  }));

  const schedule = {
    transportDate: plan.transportDate ? fmtDate(plan.transportDate.toISOString()) : null,
    deliveryFrom: plan.deliveryFrom ? fmtDate(plan.deliveryFrom.toISOString()) : null,
    deliveryTo: plan.deliveryTo ? fmtDate(plan.deliveryTo.toISOString()) : null,
  };

  return (
    <SenegalBooking
      relays={bookable}
      rules={rules.filter((r) => r.status === "active")}
      schedule={schedule}
    />
  );
}
