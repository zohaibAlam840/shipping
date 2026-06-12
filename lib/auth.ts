// Customer identity derived from the Supabase Auth session.
// Replaces the old hardcoded ME constant.
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
}

function toSessionUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): SessionUser {
  const m = user.user_metadata ?? {};
  const email = user.email ?? "";
  return {
    id: user.id,
    email,
    name: (m.full_name as string) || (m.name as string) || email.split("@")[0] || "Customer",
    phone: (m.phone as string) || "",
    address: (m.address as string) || "",
  };
}

/** Returns the signed-in customer, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? toSessionUser(user) : null;
}

/** Returns the signed-in customer or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
