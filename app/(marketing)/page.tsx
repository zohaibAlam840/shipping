import Link from "next/link";
import { PRICING_RULES, eur, FEATURES } from "@/lib/data";
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
  { icon: BoxIcon, title: "Obtenez un prix", text: "Choisissez le poids — le prix et le délai de livraison s'affichent instantanément." },
  { icon: ClipboardIcon, title: "Réservez en ligne", text: "Ajoutez le destinataire et les détails du colis en deux minutes, depuis votre téléphone." },
  { icon: TruckIcon, title: "Dépôt ou collecte", text: "Déposez-le dans un point relais / bureau de poste ou faites-le collecter chez vous." },
  { icon: PlaneIcon, title: "Suivi jusqu'à la porte", text: "Suivez chaque étape de Paris à Dakar jusqu'à la livraison." },
];

const FAQS = [
  {
    q: "Combien de temps prend la livraison ?",
    a: "La plupart des colis arrivent en 5 à 10 jours selon le poids et la ville de destination. Vous voyez l'estimation avant de payer.",
  },
  {
    q: "Que puis-je envoyer ?",
    a: "Vêtements, chaussures, documents, produits électroniques, cadeaux et produits non périssables. Certains produits réglementés nécessitent une validation préalable.",
  },
  {
    q: "Puis-je envoyer depuis toute la France ?",
    a: "Oui. Vous pouvez déposer votre colis via nos partenaires ou demander une collecte à domicile selon votre localisation.",
  },
  {
    q: "Le dédouanement est-il inclus ?",
    a: "Oui. Les formalités douanières nécessaires à l'export et à l'import sont prises en charge par nos partenaires logistiques.",
  },
  {
    q: "Comment puis-je payer ?",
    a: "Paiement sécurisé en ligne. D'autres moyens de paiement pourront être proposés selon votre mode d'expédition.",
  },
  {
    q: "Comment suivre mon colis ?",
    a: "Un numéro de suivi est attribué à chaque expédition. Vous pouvez consulter l'état de votre colis directement depuis YonelMa.",
  },
  {
    q: "Que se passe-t-il en cas de retard ?",
    a: "Notre équipe vous informe de l'évolution de votre expédition et vous accompagne jusqu'à la livraison.",
  },
];

const REVIEWS = [
  { name: "Aminata D.", city: "Paris", text: "J'ai envoyé un colis de 5 kg à ma mère à Dakar — arrivé en 6 jours, elle a reçu un WhatsApp à chaque étape. Le meilleur service que j'aie utilisé." },
  { name: "Ousmane F.", city: "Marseille", text: "Le calculateur de prix est honnête, aucun frais surprise au dépôt. Le suivi fonctionne vraiment." },
  { name: "Khady S.", city: "Dakar", text: "J'ai envoyé des tissus à ma sœur. L'enlèvement à domicile a tout simplifié." },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-accent" aria-label="5 étoiles">
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
    { label: "Colis reçu · hub Paris", done: true },
    { label: "Expédié de France", done: true },
    { label: "En transit · CDG → DSS", done: true, active: true },
    { label: "En cours de livraison · Dakar", done: false },
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
          EN TRANSIT
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
        <span className="text-[11px] font-semibold text-muted">Arrivée estimée</span>
        <span className="text-[13px] font-bold text-brand">2 jours</span>
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
              France → Sénégal · porte à porte
            </p>
            <h1 className="anim-fade-up anim-d1 mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] sm:text-6xl">
              Envoyez vos colis,
              <br />
              dès <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">19 €</span>
              <span className="text-white/90"> — suivis</span>
              <br />
              jusqu'au bout.
            </h1>
            <p className="anim-fade-up anim-d2 mt-5 max-w-lg text-base text-white/75 sm:text-lg">
              Des prix honnêtes, dépôt de colis ou collecte à domicile partout
              en France, et un suivi en temps réel pour chaque colis jusqu'aux
              mains de votre famille.
            </p>
            <div className="anim-fade-up anim-d3 mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/book" className="!bg-accent !text-[#06301f] !h-[54px] !px-8 shadow-lift hover:!bg-amber-400">
                Envoyer un colis <ArrowRightIcon width={18} height={18} />
              </PrimaryLink>
              <GhostLink href="/track" className="!h-[54px] !px-8 !bg-white/10 !text-white !border-white/20 backdrop-blur hover:!text-white hover:!border-white/50">
                Suivre un colis
              </GhostLink>
            </div>

            <dl className="anim-fade-up anim-d4 mt-12 flex max-w-md items-center justify-between gap-4 border-t border-white/15 pt-6">
              {[
                ["5–10", "jours de livraison"],
                ["19 €", "prix de départ"],
                ["100 %", "colis suivis"],
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

      {/* ============ Drop-off banner ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-brand/15 bg-brand-light/50 p-6 text-center sm:flex-row sm:text-left sm:p-7">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
            <PinIcon width={28} height={28} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              Dépôt possible partout en France
            </h3>
            <p className="mt-1 text-sm text-muted">
              Grâce à nos partenaires <span className="font-semibold text-ink">La Poste</span> et{" "}
              <span className="font-semibold text-ink">Mondial Relay</span>, déposez votre colis
              dans des milliers de bureaux de poste et points relais près de chez vous.
            </p>
          </div>
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Comment ça marche ?</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            De vos mains aux leurs, en quatre étapes
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Tarifs</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Aucun frais caché. Jamais.
            </h2>
            <p className="mt-3 text-muted">
              France → Sénégal — ce que vous voyez est ce que vous payez au dépôt.
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
                        Populaire
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
              Obtenir un devis précis <ArrowRightIcon width={18} height={18} />
            </PrimaryLink>
          </div>
        </div>
      </section>

      {/* ============ Why YonelMa ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Pourquoi YonelMa ?</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Pensé pour les familles, pas pour le fret
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldIcon, title: "Dédouanement inclus", text: "Avec nos partenaires, nous nous occupons de toutes les formalités douanières." },
            { icon: PinIcon, title: "Porte à porte", text: "Collecte à domicile ou dépôt dans un bureau de poste / point relais partout en France, livraison à domicile au Sénégal." },
            { icon: ClockIcon, title: "Suivi en temps réel", text: "Un vrai suivi pour chaque colis — du dépôt aux mains de votre famille." },
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

      {/* ============ Reviews (hidden until real testimonials — FEATURES.reviews) ============ */}
      {FEATURES.reviews && (
        <section className="border-y border-line bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Avis</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Apprécié des deux côtés du voyage
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
      )}

      {/* ============ FAQ ============ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Vos questions, nos réponses
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
              Prêt à envoyer un colis ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/75">
              Obtenez un prix en quelques secondes — réservez en deux minutes.
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryLink href="/book" className="!bg-accent !text-[#06301f] !h-[54px] !px-8 shadow-lift hover:!bg-amber-400">
                Envoyer un colis maintenant <ArrowRightIcon width={18} height={18} />
              </PrimaryLink>
            </div>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-white/65">
              {["Aucun compte requis pour un devis", "Annulation gratuite avant le dépôt", "Support en Français / Wolof / Anglais"].map((t) => (
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
