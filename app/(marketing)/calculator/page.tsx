"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, DEFAULT_CALC, type CalcState } from "@/components/calculator";
import { Card, PageTitle } from "@/components/ui";
import { ArrowRightIcon } from "@/components/icons";

export default function CalculatorPage() {
  const [state, setState] = useState<CalcState>(DEFAULT_CALC);

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-8 sm:py-12">
      <PageTitle
        title="Calculateur de prix"
        subtitle="Obtenez un devis instantané — aucun compte requis."
      />
      <Card className="p-5 sm:p-6">
        <Calculator state={state} onChange={setState} />
        <Link
          href="/book"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition"
        >
          Continuer vers la réservation <ArrowRightIcon width={18} height={18} />
        </Link>
      </Card>
    </div>
  );
}
