import Link from "next/link";
import { ME } from "@/lib/data";
import { Card, PageTitle, Field, inputCls } from "@/components/ui";
import { UserIcon, LogoutIcon } from "@/components/icons";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Profile" subtitle="Your details and preferences." />

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3.5 mb-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
            <UserIcon width={28} height={28} />
          </span>
          <div>
            <p className="font-bold text-ink">{ME.name}</p>
            <p className="text-sm text-muted">{ME.email}</p>
          </div>
        </div>
        {/* Demo form — saving comes with the backend */}
        <div className="space-y-3">
          <Field label="Full name">
            <input className={inputCls} defaultValue={ME.name} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} defaultValue={ME.phone} />
          </Field>
          <Field label="Address (pickup)">
            <input className={inputCls} defaultValue={ME.address} />
          </Field>
          <button className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition">
            Save changes
          </button>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-bold text-ink mb-3">Notifications</h2>
        {[
          ["Email updates", true],
          ["WhatsApp updates", true],
          ["Promotions", false],
        ].map(([label, on]) => (
          <label key={String(label)} className="flex items-center justify-between py-2.5 border-b border-line last:border-0 text-sm font-medium text-ink">
            {label}
            <input type="checkbox" defaultChecked={Boolean(on)} className="h-5 w-5 accent-[var(--brand)]" />
          </label>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink mb-2">Privacy (GDPR)</h2>
        <p className="text-sm text-muted mb-3">
          Export your data or request account deletion at any time.
        </p>
        <div className="flex gap-2">
          <button className="h-10 flex-1 rounded-full border border-line text-sm font-semibold text-ink hover:border-brand/40 transition">
            Export my data
          </button>
          <button className="h-10 flex-1 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
            Delete account
          </button>
        </div>
      </Card>

      <Link
        href="/"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-card font-semibold text-muted hover:text-ink transition"
      >
        <LogoutIcon width={18} height={18} /> Log out
      </Link>
    </div>
  );
}
