import Link from "next/link";
import { Logo } from "@/components/icons";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="app-chrome sticky top-0 z-40 border-b border-line/70 bg-card/80 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              YonelMa
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/track"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-ink"
            >
              Track
            </Link>
            <Link
              href="/calculator"
              className="hidden sm:block rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-ink"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/book"
              className="ml-1 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.97]"
            >
              Ship a parcel
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-[#06301f] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <Logo size={30} />
              <span className="font-display font-bold">YonelMa</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Trusted parcel shipping between France and Senegal — transparent
              prices, real people, real tracking.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-4 font-display font-bold">Services</p>
            <ul className="space-y-2.5 text-white/60">
              <li><Link href="/calculator" className="transition hover:text-accent">Price calculator</Link></li>
              <li><Link href="/book" className="transition hover:text-accent">Book a shipment</Link></li>
              <li><Link href="/track" className="transition hover:text-accent">Track a parcel</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-4 font-display font-bold">Company</p>
            <ul className="space-y-2.5 text-white/60">
              <li><Link href="/login" className="transition hover:text-accent">Customer portal</Link></li>
              <li><Link href="/admin" className="transition hover:text-accent">Admin</Link></li>
              <li><Link href="/partner" className="transition hover:text-accent">Partner workspace</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40 pb-safe">
          © 2026 YonelMa · Paris — Dakar
        </div>
      </footer>
    </div>
  );
}
