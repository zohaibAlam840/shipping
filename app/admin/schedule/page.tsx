// Operating schedule administration (founder answer 6).
import { supabaseAdmin } from "@/lib/supabase";
import { getOperatingSettings, scheduleForDropoff } from "@/lib/sn-domain";
import { fmtDate } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { ScheduleManager, type Closure } from "./schedule-manager";

export const metadata = { title: "Planning" };
export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const [settings, plan, closureRows] = await Promise.all([
    getOperatingSettings(),
    scheduleForDropoff(new Date()),
    supabaseAdmin()
      .from("non_operating_days")
      .select("id, day, label, relays(name)")
      .order("day", { ascending: true }),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const closures: Closure[] = ((closureRows.data ?? []) as any[]).map((r) => ({
    id: r.id,
    day: String(r.day).slice(0, 10),
    label: r.label ?? "",
    relayName: r.relays?.name ?? null,
  }));

  const preview = {
    transportDate: plan.transportDate ? fmtDate(plan.transportDate.toISOString()) : null,
    deliveryFrom: plan.deliveryFrom ? fmtDate(plan.deliveryFrom.toISOString()) : null,
    deliveryTo: plan.deliveryTo ? fmtDate(plan.deliveryTo.toISOString()) : null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <PageTitle
          title="Planning opérationnel"
          subtitle="Jours de transport, heure limite de dépôt, délais de livraison et fermetures exceptionnelles."
        />
      </div>
      <ScheduleManager settings={settings} closures={closures} preview={preview} />
    </div>
  );
}
