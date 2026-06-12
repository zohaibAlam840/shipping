"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, logoutCustomer } from "@/app/auth-actions";
import { Field, inputCls } from "@/components/ui";
import { LogoutIcon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth";

export function ProfileForm({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const router = useRouter();
  const [loggingOut, startLogout] = useTransition();

  return (
    <>
      <form action={action} className="space-y-3">
        <Field label="Full name">
          <input name="name" className={inputCls} defaultValue={user.name} />
        </Field>
        <Field label="Phone">
          <input name="phone" className={inputCls} defaultValue={user.phone} />
        </Field>
        <Field label="Address (pickup)">
          <input name="address" className={inputCls} defaultValue={user.address} />
        </Field>
        {state?.error && (
          <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}
        <button
          disabled={pending}
          className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-60"
        >
          {pending ? "Saving…" : state?.ok ? "Saved ✓" : "Save changes"}
        </button>
      </form>

      <button
        onClick={() => startLogout(async () => { await logoutCustomer(); router.refresh(); })}
        disabled={loggingOut}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-card font-semibold text-muted hover:text-ink transition disabled:opacity-60"
      >
        <LogoutIcon width={18} height={18} /> {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </>
  );
}
