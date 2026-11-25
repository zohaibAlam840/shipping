"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteStaff,
  updateStaff,
  setStaffStatus,
  resetStaffPassword,
} from "@/app/admin/admin-actions";
import { ROLE_FR, type AppRole } from "@/lib/roles-shared";
import type { StaffMember } from "@/lib/staff";
import { Card, Field, inputCls } from "@/components/ui";
import { PlusIcon, UserIcon, ShieldIcon } from "@/components/icons";

const STAFF_ROLES: AppRole[] = ["admin", "merchant", "driver", "support"];

const STATUS_FR: Record<StaffMember["status"], string> = {
  invited: "Invité — mot de passe à changer",
  active: "Actif",
  suspended: "Suspendu",
};

const STATUS_STYLE: Record<StaffMember["status"], string> = {
  invited: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-brand-light text-brand border-brand/20",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

export interface RelayChoice {
  id: string;
  name: string;
  town: string;
}

/**
 * Staff administration (SN-REL-03).
 *
 * Temporary passwords appear exactly once, right after they are generated:
 * they are never stored in readable form, so an administrator who misses the
 * message has to issue a new one rather than look the old one up.
 */
export function StaffManager({
  staff,
  relays,
}: {
  staff: StaffMember[];
  relays: RelayChoice[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [nw, setNw] = useState({
    email: "",
    fullName: "",
    phone: "",
    role: "merchant" as AppRole,
    relayIds: [] as string[],
    partnerName: "",
  });

  function run(
    fn: () => Promise<{ error?: string; ok?: boolean; tempPassword?: string }>,
    opts: { email?: string } = {},
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.tempPassword) {
        setSecret({ email: opts.email ?? "", password: res.tempPassword });
      }
      router.refresh();
    });
  }

  function toggleRelay(list: string[], id: string) {
    return list.includes(id) ? list.filter((r) => r !== id) : [...list, id];
  }

  return (
    <div className="space-y-4">
      {secret && (
        <Card className="border-brand/30 bg-brand-light p-5">
          <h2 className="flex items-center gap-2 font-bold text-brand">
            <ShieldIcon width={18} height={18} /> Mot de passe temporaire
          </h2>
          <p className="mt-1 text-sm text-brand/90">
            Communiquez-le à {secret.email || "l'utilisateur"}. Il ne sera plus affiché —
            en cas d&apos;oubli, générez-en un nouveau.
          </p>
          <p className="mt-3 rounded-xl bg-white p-4 text-center font-mono text-2xl font-bold tracking-widest text-ink">
            {secret.password}
          </p>
          <button
            onClick={() => setSecret(null)}
            className="mt-3 h-11 w-full rounded-full border border-brand/30 text-sm font-semibold text-brand"
          >
            J&apos;ai noté le mot de passe
          </button>
        </Card>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {staff.map((u) => (
        <Card key={u.id} className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <UserIcon width={20} height={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{u.name}</p>
              <p className="text-xs text-muted">{u.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {ROLE_FR[u.role]}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[u.status]}`}
                >
                  {STATUS_FR[u.status]}
                </span>
                {u.relayNames.length > 0 && (
                  <span className="text-xs text-muted">{u.relayNames.join(" · ")}</span>
                )}
                {u.partnerName && <span className="text-xs text-muted">{u.partnerName}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditing(editing === u.id ? null : u.id)}
                className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
              >
                Modifier
              </button>
              <button
                onClick={() => run(() => resetStaffPassword(u.id), { email: u.email })}
                disabled={pending}
                className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
              >
                Réinitialiser
              </button>
              <button
                onClick={() =>
                  run(() => setStaffStatus(u.id, u.status === "suspended" ? "active" : "suspended"))
                }
                disabled={pending}
                className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
              >
                {u.status === "suspended" ? "Réactiver" : "Suspendre"}
              </button>
            </div>
          </div>

          {editing === u.id && (
            <EditStaff
              member={u}
              relays={relays}
              pending={pending}
              onSave={(patch) => {
                run(() => updateStaff(u.id, patch));
                setEditing(null);
              }}
            />
          )}
        </Card>
      ))}

      {staff.length === 0 && (
        <Card className="p-8 text-center">
          <p className="font-semibold text-ink">Aucun compte du personnel</p>
          <p className="mt-1 text-sm text-muted">
            Créez les comptes administrateur, commerçant, chauffeur et support.
          </p>
        </Card>
      )}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon width={16} height={16} /> Inviter un membre du personnel
        </button>
      ) : (
        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Nouveau compte</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom complet">
              <input
                className={inputCls}
                value={nw.fullName}
                onChange={(e) => setNw({ ...nw, fullName: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <input
                className={inputCls}
                type="email"
                value={nw.email}
                onChange={(e) => setNw({ ...nw, email: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <input
                className={inputCls}
                value={nw.phone}
                onChange={(e) => setNw({ ...nw, phone: e.target.value })}
              />
            </Field>
            <Field label="Rôle">
              <select
                className={inputCls}
                value={nw.role}
                onChange={(e) => setNw({ ...nw, role: e.target.value as AppRole })}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_FR[r]}
                  </option>
                ))}
              </select>
            </Field>
            {nw.role === "driver" && (
              <Field label="Société de transport">
                <input
                  className={inputCls}
                  value={nw.partnerName}
                  onChange={(e) => setNw({ ...nw, partnerName: e.target.value })}
                />
              </Field>
            )}
          </div>

          {nw.role === "merchant" && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">
                Boutiques autorisées
                <span className="ml-1 text-xs font-normal text-muted">
                  — le commerçant ne verra que ces boutiques
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {relays.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setNw({ ...nw, relayIds: toggleRelay(nw.relayIds, r.id) })}
                    className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                      nw.relayIds.includes(r.id)
                        ? "border-brand bg-brand-light text-brand"
                        : "border-line text-muted hover:text-ink"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowNew(false)}
              className="h-11 flex-1 rounded-full border border-line text-sm font-semibold text-ink"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                run(
                  () =>
                    inviteStaff({
                      email: nw.email,
                      fullName: nw.fullName,
                      phone: nw.phone,
                      role: nw.role,
                      relayIds: nw.relayIds,
                      partnerName: nw.partnerName,
                    }),
                  { email: nw.email },
                );
                setShowNew(false);
                setNw({ ...nw, email: "", fullName: "", phone: "", relayIds: [] });
              }}
              disabled={pending || !nw.email || !nw.fullName}
              className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-40"
            >
              Créer le compte
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function EditStaff({
  member,
  relays,
  pending,
  onSave,
}: {
  member: StaffMember;
  relays: RelayChoice[];
  pending: boolean;
  onSave: (patch: { role: AppRole; relayIds: string[]; partnerName: string | null }) => void;
}) {
  const [role, setRole] = useState<AppRole>(member.role);
  const [relayIds, setRelayIds] = useState<string[]>(member.relayIds);
  const [partnerName, setPartnerName] = useState(member.partnerName ?? "");

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rôle">
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_FR[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Société de transport">
          <input
            className={inputCls}
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
          />
        </Field>
      </div>
      <p className="mb-2 mt-3 text-sm font-medium text-ink">Boutiques autorisées</p>
      <div className="flex flex-wrap gap-2">
        {relays.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() =>
              setRelayIds(
                relayIds.includes(r.id) ? relayIds.filter((x) => x !== r.id) : [...relayIds, r.id],
              )
            }
            className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
              relayIds.includes(r.id)
                ? "border-brand bg-brand-light text-brand"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSave({ role, relayIds, partnerName: partnerName || null })}
        disabled={pending}
        className="mt-4 h-11 w-full rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-60"
      >
        Enregistrer
      </button>
    </div>
  );
}
