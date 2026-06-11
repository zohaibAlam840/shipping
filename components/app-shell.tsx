"use client";

// Shared shell for the customer / admin / partner areas.
// Mobile: native-app feel with a fixed bottom tab bar (safe-area aware).
// Desktop: left sidebar.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo, LogoutIcon } from "@/components/icons";
import { logoutAdmin } from "@/app/actions";

export interface NavItem {
  href: string;
  label: string;
  icon: (props: { width?: number; height?: number; strokeWidth?: number }) => ReactNode;
  exact?: boolean;
}

export function AppShell({
  items,
  title,
  accent,
  children,
}: {
  items: NavItem[];
  title: string;
  accent?: string; // small role tag next to the logo
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
    router.refresh();
  };
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="app-chrome hidden md:flex w-60 shrink-0 flex-col border-r border-line bg-card sticky top-0 h-dvh">
        <Link href="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-line">
          <Logo size={30} />
          <span className="font-bold text-ink">YonelMa</span>
          {accent && (
            <span className="ml-auto rounded-full bg-brand-light text-brand text-[11px] font-bold px-2 py-0.5 uppercase">
              {accent}
            </span>
          )}
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-light text-brand"
                    : "text-muted hover:bg-background hover:text-ink"
                }`}
              >
                <item.icon width={20} height={20} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line space-y-1">
          {pathname.startsWith("/admin") && (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50/50 hover:text-red-700 transition cursor-pointer border-0 bg-transparent text-left font-semibold"
            >
              <LogoutIcon width={20} height={20} />
              Log out
            </button>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:text-ink hover:bg-background transition"
          >
            <LogoutIcon width={20} height={20} />
            Exit to site
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="app-chrome md:hidden sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-line pt-safe">
          <div className="flex items-center gap-2.5 h-14 px-4">
            <Logo size={28} />
            <span className="font-bold text-ink">{title}</span>
            {accent && (
              <span className="ml-auto rounded-full bg-brand-light text-brand text-[11px] font-bold px-2 py-0.5 uppercase">
                {accent}
              </span>
            )}
            {pathname.startsWith("/admin") && (
              <button
                onClick={handleLogout}
                className="ml-2 rounded-full border border-red-200 bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 uppercase hover:bg-red-100 cursor-pointer"
              >
                Log out
              </button>
            )}
          </div>
        </header>

        {/* Page content; bottom padding clears the mobile tab bar */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 md:px-8 md:py-8 pb-28 md:pb-10">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="app-chrome md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-card/95 backdrop-blur pb-safe">
          <div className="grid auto-cols-fr grid-flow-col">
            {items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  <item.icon width={23} height={23} strokeWidth={active ? 2.2 : 1.7} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
