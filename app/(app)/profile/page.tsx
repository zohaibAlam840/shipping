import { requireUser } from "@/lib/auth";
import { Card, PageTitle } from "@/components/ui";
import { UserIcon } from "@/components/icons";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Profil" subtitle="Vos informations et préférences." />

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3.5 mb-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
            <UserIcon width={28} height={28} />
          </span>
          <div>
            <p className="font-bold text-ink">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <ProfileForm user={user} />
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-bold text-ink mb-3">Notifications</h2>
        {[
          ["Notifications par e-mail", true],
          ["Notifications WhatsApp", true],
          ["Promotions", false],
        ].map(([label, on]) => (
          <label key={String(label)} className="flex items-center justify-between py-2.5 border-b border-line last:border-0 text-sm font-medium text-ink">
            {label}
            <input type="checkbox" defaultChecked={Boolean(on)} className="h-5 w-5 accent-[var(--brand)]" />
          </label>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink mb-2">Confidentialité (RGPD)</h2>
        <p className="text-sm text-muted mb-3">
          Exportez vos données ou demandez la suppression de votre compte à tout moment.
        </p>
        <div className="flex gap-2">
          <button className="h-10 flex-1 rounded-full border border-line text-sm font-semibold text-ink hover:border-brand/40 transition">
            Exporter mes données
          </button>
          <button className="h-10 flex-1 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
            Supprimer le compte
          </button>
        </div>
      </Card>
    </div>
  );
}
