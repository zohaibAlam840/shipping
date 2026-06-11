"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClaim } from "@/app/actions";

export function ClaimActions({ claimId }: { claimId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(status: "Resolved" | "Refunded") {
    startTransition(async () => {
      await updateClaim(claimId, status);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        disabled={pending}
        onClick={() => act("Resolved")}
        className="h-9 rounded-full bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-dark transition disabled:opacity-60"
      >
        Mark resolved
      </button>
      <button
        disabled={pending}
        onClick={() => act("Refunded")}
        className="h-9 rounded-full border border-line px-4 text-xs font-semibold text-ink hover:border-brand/40 transition disabled:opacity-60"
      >
        Issue refund
      </button>
    </div>
  );
}
