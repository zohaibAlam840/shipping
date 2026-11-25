// Notification dispatch (SN-NAT-06).
//
// The specification asks for notifications to be *designed* as configurable
// across email, SMS and WhatsApp, while explicitly not requiring paid
// messaging integrations in Phase 1. So this module defines one dispatch
// point with a provider per channel: email is implemented through Resend,
// and SMS/WhatsApp are declared but inert until a provider is configured.
//
// Adding a provider later means implementing one function here — no caller
// changes anywhere else in the application.
import { isEmailConfigured, sendPickupCodeEmail } from "@/lib/email";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type NotificationKind = "pickup_code" | "status_update";

export interface NotificationRecipient {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PickupCodePayload {
  parcelRef: string;
  code: string;
  relayName: string;
  relayAddress: string;
  openingHours?: string;
}

/** Channels currently switched on, newline/comma separated in the env. */
export function enabledChannels(): NotificationChannel[] {
  const raw = process.env.NOTIFY_CHANNELS ?? "email";
  return raw
    .split(/[,\s]+/)
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is NotificationChannel => c === "email" || c === "sms" || c === "whatsapp");
}

/** Whether a channel can actually deliver right now. */
export function channelReady(channel: NotificationChannel): boolean {
  switch (channel) {
    case "email":
      return isEmailConfigured();
    case "sms":
      return Boolean(process.env.SMS_PROVIDER_KEY);
    case "whatsapp":
      return Boolean(process.env.WHATSAPP_PROVIDER_KEY);
  }
}

export interface DispatchResult {
  channel: NotificationChannel;
  delivered: boolean;
  reason?: string;
}

/**
 * Send the pickup code through every enabled, ready channel.
 *
 * Never throws: a notification failure must not break the scan that
 * triggered it. The result says what actually went out, so the caller can
 * record it or show it to an operator.
 */
export async function dispatchPickupCode(
  recipient: NotificationRecipient,
  payload: PickupCodePayload,
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

  for (const channel of enabledChannels()) {
    if (!channelReady(channel)) {
      results.push({ channel, delivered: false, reason: "provider_not_configured" });
      continue;
    }

    try {
      switch (channel) {
        case "email": {
          if (!recipient.email) {
            results.push({ channel, delivered: false, reason: "no_address" });
            break;
          }
          await sendPickupCodeEmail({
            to: recipient.email,
            recipientName: recipient.name,
            parcelRef: payload.parcelRef,
            code: payload.code,
            relayName: payload.relayName,
            relayAddress: payload.relayAddress,
            openingHours: payload.openingHours,
          });
          results.push({ channel, delivered: true });
          break;
        }
        case "sms":
        case "whatsapp": {
          // Phase 1 carries no paid messaging contract. The integration point
          // is here: call the provider with recipient.phone and the code.
          results.push({ channel, delivered: false, reason: "not_implemented_phase_1" });
          break;
        }
      }
    } catch (e) {
      results.push({
        channel,
        delivered: false,
        reason: e instanceof Error ? e.message : "send_failed",
      });
    }
  }

  return results;
}

/** True when at least one channel actually delivered. */
export function anyDelivered(results: DispatchResult[]): boolean {
  return results.some((r) => r.delivered);
}
