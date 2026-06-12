"use server";

// Customer authentication via Supabase Auth.
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function signupCustomer(
  _prev: { error?: string; info?: string } | null,
  formData: FormData,
) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent");

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!consent) return { error: "Please accept the privacy policy to continue." };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        phone,
      },
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is OFF, a session exists immediately → go to app.
  if (data.session) redirect("/dashboard");

  // Otherwise Supabase sent a confirmation email.
  return {
    info: "Account created! Check your email to confirm, then log in.",
  };
}

export async function loginCustomer(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function logoutCustomer() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
    },
  });
  if (error) return { error: error.message };
  return { ok: true };
}
