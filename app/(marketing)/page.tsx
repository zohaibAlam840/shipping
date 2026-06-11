import Link from "next/link";
import { PRICING_RULES, eur } from "@/lib/data";
import { PrimaryLink, GhostLink } from "@/components/ui";
import {
  BoxIcon,
  PlaneIcon,
  ShieldIcon,
  PinIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckIcon,
  TruckIcon,
  ClipboardIcon,
} from "@/components/icons";

const STEPS = [
  { icon: BoxIcon, title: "Get a price", text: "Pick origin, destination and weight — see your price and delivery time instantly." },
  { icon: ClipboardIcon, title: "Book online", text: "Add the recipient and parcel details in two minutes, from your phone." },
  { icon: TruckIcon, title: "Drop off or pickup", text: "Bring it to a relay point or have us collect it from your door." },
  { icon: PlaneIcon, title: "Track to the door", text: "Follow every step from Paris to Dakar until it's delivered." },
];

const FAQS = [
  {
    q: "How long does delivery take?",
    a: "Most parcels arrive in 5–10 days depending on weight and destination city. You see the estimate before you pay.",
  },
  {
    q: "What can I send?",
    a: "Clothes, food (non-perishable), electronics, documents, medication and more. Prohibited items follow French and Senegalese customs rules.",
  },
  {
    q: "Is my parcel insured?",
    a: "Optional insurance covers your declared value for 4% of its value. Every parcel is tracked regardless.",
  },
  {
    q: "How do I pay?",
    a: "Book online and pay on drop-off or collection. Card payment online is coming soon.",
  },
];

const REVIEWS = [
  { name: "Aminata D.", city: "Paris", text: "Sent a 5kg parcel to my mum in Dakar — arrived in 6 days, she got a WhatsApp at every step. Best service I've used." },
  { name: "Ousmane F.", city: "Marseille", text: "The price calculator is honest, no surprise fees at drop-off. Tracking actually works." },
  { name: "Khady S.", city: "Dakar", text: "Sent fabrics to my sister in Lyon. Home collection in Dakar made everything easy." },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-accent" aria-label="5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5 14.9 9l7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.6 9.1 9z" />
        </svg>
      ))}
    </div>
  );
}

/** Mini tracking card shown floating in the hero. */
function HeroTrackingCard() {
  const steps = [
    { label: "Parcel received · Paris hub", done: true },
    { label: "Shipped from France", done: true },
    { label: "In transit · CDG → DSS", done: true, active: true },
    { label: "Out for delivery · Dakar", done: false },
  ];
  return (
    <div className="anim-float w-[330px] rounded-3xl bg-white p-5 shadow-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
            <BoxIcon width={20} height={20} />
          </span>
          <div>
            <p className="text-[13px] font-bold text-ink leading-tight">YMT-7F2K9Q</p>
            <p className="text-[11px] text-muted">Paris → Dakar · 5.2 kg</p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
          IN TRANSIT
        </span>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${s.done ? "bg-brand" : "bg-line"}`} />
            )}
            <span
              className={`relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full ${
                s.done ? "bg-brand text-white" : "border-2 border-line bg-white"
              } ${s.active ? "ring-4 ring-brand/20" : ""}`}
            >
              {s.done && <CheckIcon width={11} height={11} strokeWidth={3} />}
            </span>
            <span className={`text-[12.5px] font-semibold ${s.done ? "text-ink" : "text-muted/60"}`}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-background px-4 py-3">
        <span className="text-[11px] font-semibold text-muted">Estimated arrival</span>
        <span className="text-[13px] font-bold text-brand">2 days</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const fr2sn = PRICING_RULES.filter((r) => r.origin === "France");
  return (
    <div>
      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden bg-[#06301f] text-white">
        {/* layered glows */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(11,132,87,0.9),transparent)]" />
          <div className="absolute -right-32 top-24 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(245,180,24,0.22),transparent)]" />
          <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(11,132,87,0.5),transparent)]" />
          {/* dotted route line */}
          <svg className="absolute inset-x-0 bottom-10 hidden lg:block opacity-25" height="120" width="100%" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M-20,90 C300,20 900,140 1220,40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
          </svg>
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="anim-fade-up inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase backdrop-blur">
              <PlaneIcon width={14} height={14} className="text-accent" />
              France ↔ Senegal · door to door
            </p>
            <h1 className="anim-fade-up anim-d1 mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] sm:text-6xl">
              Send parcels home,
              <br />
              from <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">€15</span>
              <span className="text-white/90"> — tracked</span>
              <br />
              all the way.
            </h1>
            <p className="anim-fade-up anim-d2 mt-5 max-w-lg text-base text-white/75 sm:text-lg">
              Honest prices, pickup from your door, and a live timeline for
              every parcel until it reaches your family's hands.
            </p>
            <div className="anim-fade-up anim-d3 mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/book" className="!bg-accent !text-[#06301f] !h-[54px] !px-8 shadow-lift hover:!bg-amber-400">
                Ship a parcel <ArrowRightIcon width={18} height={18} />
              </PrimaryLink>
              <GhostLink href="/track" className="!h-[54px] !px-8 !bg-white/10 !text-white !border-white/20 backdrop-blur hover:!text-white hover:!border-white/50">
                Track a parcel
              </GhostLink>
            </div>

            <dl className="anim-fade-up anim-d4 mt-12 flex max-w-md items-center justify-between gap-4 border-t border-white/15 pt-6">
              {[
                ["5–10", "days delivery"],
                ["€15", "starting price"],
                ["100%", "parcels tracked"],
              ].map(([v, l], i) => (
                <div key={l} className={i > 0 ? "border-l border-white/15 pl-4" : ""}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-bold sm:text-3xl">{v}</dd>
                  <dd className="mt-0.5 text-[11px] font-medium text-white/60">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="anim-fade-up anim-d3 hidden lg:block">
            <HeroTrackingCard />
          </div>
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            From your hands to theirs, in four steps
          </h2>
        </div>
        <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* connecting line on desktop */}
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-[44px] hidden border-t-2 border-dashed border-brand/25 lg:block" aria-hidden />
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-3xl border border-line bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift"
            >
              <div className="relative mb-5 inline-flex">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand transition group-hover:bg-brand group-hover:text-white">
                  <s.icon width={26} height={26} />
                </span>
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-[#06301f]">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-display text-[17px] font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Pricing ============ */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Pricing</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              No hidden fees. Ever.
            </h2>
            <p className="mt-3 text-muted">
              France → Senegal — what you see is what you pay at drop-off.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {fr2sn.map((r, i) => {
              const popular = i === 2;
              return (
                <Link key={r.band} href="/calculator" className="group">
                  <div
                    className={`relative rounded-3xl border p-5 text-center transition duration-300 group-hover:-translate-y-1.5 ${
                      popular
                        ? "border-brand bg-gradient-to-b from-brand to-brand-dark text-white shadow-lift"
                        : "border-line bg-background shadow-soft group-hover:border-brand/40 group-hover:shadow-lift"
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#06301f]">
                        Popular
                      </span>
                    )}
                    <div className={`text-xs font-bold uppercase tracking-wide ${popular ? "text-white/75" : "text-muted"}`}>
                      {r.band}
                    </div>
                    <div className={`font-display mt-2 text-[27px] font-extrabold ${popular ? "text-white" : "text-brand"}`}>
                      {eur(r.basePrice)}
                    </div>
                    <div className={`mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium ${popular ? "text-white/75" : "text-muted"}`}>
                      <ClockIcon width={12} height={12} /> {r.transitDays}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <PrimaryLink href="/calculator" className="!h-[54px] !px-8 shadow-soft">
              Get an exact quote <ArrowRightIcon width={18} height={18} />
            </PrimaryLink>
          </div>
        </div>
      </section>

      {/* ============ Why YonelMa ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Why YonelMa</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Built for families, not freight
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldIcon, title: "Insured & secure", text: "Optional insurance on declared value and careful handling at both hubs." },
            { icon: PinIcon, title: "Door to door", text: "Home collection in France, home delivery or relay pickup in Senegal." },
            { icon: ClockIcon, title: "Live tracking", text: "A real timeline for every parcel — from drop-off to your family's hands." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-line bg-card p-8 text-center shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift"
            >
              <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <f.icon width={26} height={26} />
              </span>
              <h3 className="font-display text-[17px] font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Reviews ============ */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Reviews</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Loved on both sides of the journey
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure
                key={r.name}
                className="flex flex-col rounded-3xl border border-line bg-background p-6 shadow-soft"
              >
                <Stars />
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {r.name[0]}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{r.name}</span>
                    <span className="block text-xs text-muted">{r.city}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Questions, answered
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-card px-6 py-5 shadow-soft open:shadow-lift transition">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15px] font-bold text-ink">
                {f.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand transition group-open:rotate-90">
                  <ArrowRightIcon width={15} height={15} />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#06301f] p-10 text-center text-white sm:p-16">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(11,132,87,0.9),transparent)]" />
            <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(245,180,24,0.25),transparent)]" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to send something home?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/75">
              Get a price in seconds — book in two minutes.
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryLink href="/book" className="!bg-accent !text-[#06301f] !h-[54px] !px-8 shadow-lift hover:!bg-amber-400">
                Ship a parcel now <ArrowRightIcon width={18} height={18} />
              </PrimaryLink>
            </div>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-white/65">
              {["No account needed to get a quote", "Free cancellation before drop-off", "Support in FR / WO / EN"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckIcon width={13} height={13} className="text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
