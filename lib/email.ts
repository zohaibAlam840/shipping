// Transactional email via Resend's HTTP API (no SDK needed).
// Activates automatically once RESEND_API_KEY and EMAIL_FROM are set;
// until then every send is a safe no-op so nothing breaks.
import { STATUS_FR, type OrderStatus } from "@/lib/data";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) return; // no-op until configured
  try {
    await fetch("https://api.resend.com/emails", {
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
  } catch {
    // Never let a notification failure break the main flow.
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
      <p style="color:#5b6e66;font-size:12px;margin-top:24px">YonelMa · Expédition France → Sénégal</p>
    </div>
  </div>`;
}

export async function sendOrderCreatedEmail(to: string, name: string, reference: string) {
  await sendEmail(
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
  await sendEmail(
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
