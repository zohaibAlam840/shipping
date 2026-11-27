// Transactional email via Resend's HTTP API (no SDK needed).
// Activates automatically once RESEND_API_KEY and EMAIL_FROM are set;
// until then every send is a safe no-op so nothing breaks.
import { STATUS_FR, type OrderStatus } from "@/lib/data";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface SendResult {
  ok: boolean;
  /** Why it did not go out: a provider message, or "not_configured". */
  error?: string;
}

/**
 * Send one message. Never throws — a notification failure must not break the
 * flow that triggered it — but it does report and log what happened, because
 * a silently discarded rejection is indistinguishable from a delivery.
 *
 * Note for the shared sending domain (onboarding@resend.dev): Resend accepts
 * it without any DNS, but delivers ONLY to the address that owns the account.
 * Every other recipient comes back as an error here rather than arriving.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    const error = `${res.status} ${body.slice(0, 200)}`;
    console.error("[email] rejected by provider:", error);
    return { ok: false, error };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", error);
    return { ok: false, error };
  }
}

function shell(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
    <div style="background:#0b8457;color:#fff;padding:18px 24px;border-radius:14px 14px 0 0">
      <strong style="font-size:18px">YonelMa</strong>
    </div>
    <div style="border:1px solid #e3eae6;border-top:0;border-radius:0 0 14px 14px;padding:24px">
      <h2 style="margin:0 0 12px;color:#10261e">${title}</h2>
      <div style="color:#3a4a43;font-size:15px;line-height:1.6">${body}</div>
      <p style="color:#5b6e66;font-size:12px;margin-top:24px">YonelMa · Expédition de colis</p>
    </div>
  </div>`;
}

export async function sendOrderCreatedEmail(to: string, name: string, reference: string) {
  return sendEmail(
    to,
    `Commande ${reference} créée — YonelMa`,
    shell(
      "Votre commande est enregistrée 🎉",
      `Bonjour ${name},<br/><br/>Votre commande <strong>${reference}</strong> a bien été créée.
       Ce numéro vous servira de référence et de numéro de suivi.<br/><br/>
       Vous pouvez suivre votre colis à tout moment depuis votre espace YonelMa.`,
    ),
  );
}

export async function sendStatusEmail(
  to: string,
  name: string,
  reference: string,
  status: OrderStatus,
) {
  return sendEmail(
    to,
    `Mise à jour ${reference} : ${STATUS_FR[status]} — YonelMa`,
    shell(
      "Mise à jour de votre envoi",
      `Bonjour ${name},<br/><br/>Le statut de votre colis <strong>${reference}</strong> est maintenant :
       <br/><br/><span style="display:inline-block;background:#e6f4ee;color:#0b8457;font-weight:bold;padding:8px 14px;border-radius:999px">${STATUS_FR[status]}</span>
       <br/><br/>Suivez chaque étape depuis votre espace YonelMa.`,
    ),
  );
}

/**
 * One-time pickup code for the recipient (founder answer 2, 20 Nov 2026).
 *
 * Sent only when the recipient's email address is known; the sender can
 * always read the code in their own account and pass it on by hand. The code
 * never appears on the public tracking page.
 */
export async function sendPickupCodeEmail(opts: {
  to: string;
  recipientName: string;
  parcelRef: string;
  code: string;
  relayName: string;
  relayAddress: string;
  openingHours?: string;
}) {
  return sendEmail(
    opts.to,
    `Votre colis ${opts.parcelRef} est disponible — YonelMa`,
    shell(
      "Votre colis vous attend 📦",
      `Bonjour ${opts.recipientName},<br/><br/>
       Votre colis <strong>${opts.parcelRef}</strong> est disponible au point relais
       <strong>${opts.relayName}</strong>, ${opts.relayAddress}.
       ${opts.openingHours ? `<br/>Horaires : ${opts.openingHours}.` : ""}
       <br/><br/>
       Présentez ce code de retrait au commerçant :
       <div style="margin:18px 0;padding:16px;border-radius:12px;background:#eef7f2;
                   text-align:center;font-size:30px;letter-spacing:6px;
                   font-weight:bold;color:#0b8457">${opts.code}</div>
       Ce code est personnel et confidentiel. Ne le communiquez qu'au moment du retrait.`,
    ),
  );
}
