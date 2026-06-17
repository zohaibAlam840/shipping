"use server";

// Customer authentication via Supabase Auth.
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

// Map common Supabase auth errors to French.
function frError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "E-mail non confirmé. Vérifiez votre boîte mail.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("password")) return "Mot de passe invalide (au moins 8 caractères).";
  if (m.includes("invalid") && m.includes("email")) return "Adresse e-mail invalide.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Une erreur est survenue. Veuillez réessayer.";
}

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

  if (!email || !password) return { error: "L'e-mail et le mot de passe sont requis." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!consent) return { error: "Veuillez accepter la politique de confidentialité pour continuer." };

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

  if (error) return { error: frError(error.message) };

  // If email confirmation is OFF, a session exists immediately → go to app.
  if (data.session) redirect("/dashboard");

  // Otherwise Supabase sent a confirmation email.
  return {
    info: "Compte créé ! Vérifiez votre e-mail pour confirmer, puis connectez-vous.",
  };
}

export async function loginCustomer(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Saisissez votre e-mail et votre mot de passe." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: frError(error.message) };
  redirect("/dashboard");
}

export async function logoutCustomer() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: { error?: string; info?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Saisissez votre adresse e-mail." };

  const supabase = await createSupabaseServer();
  const site = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/reset-password`,
  });
  if (error) return { error: frError(error.message) };
  return {
    info: "Si un compte existe pour cet e-mail, un lien de réinitialisation vient d'être envoyé.",
  };
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
