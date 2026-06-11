import { fmtDate } from "@/lib/data";
import { getClaims } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { AlertIcon } from "@/components/icons";
import { ClaimActions } from "./claim-actions";

export const metadata = { title: "Claims" };
export const dynamic = "force-dynamic";

const CLAIM_STYLES: Record<string, string> = {
  Open: "bg-amber-50 text-amber-700 border-amber-200",
  Investigating: "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export default async function AdminClaimsPage() {
  const claims = await getClaims();
  return (
    <div>
      <PageTitle title="Claims & incidents" subtitle={`${claims.length} total`} />
      <div className="space-y-3">
        {claims.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <AlertIcon width={22} height={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-ink text-sm">
                    {c.type} · {c.orderNumber}
                  </p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLAIM_STYLES[c.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {c.customer} · opened {fmtDate(c.opened)}
                </p>
                <p className="text-sm text-ink mt-2">{c.detail}</p>
                {(c.status === "Open" || c.status === "Investigating") && (
                  <ClaimActions claimId={c.id} />
                )}
              </div>
            </div>
          </Card>
        ))}
        {claims.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">No claims. 🎉</Card>
        )}
      </div>
    </div>
  );
}
