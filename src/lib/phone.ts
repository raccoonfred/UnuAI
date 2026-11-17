import crypto from "node:crypto";
import { getSettings, saveConversation } from "./repo";
import { getLang } from "./i18n";

/**
 * Phone calls go through Twilio. Needed env vars:
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, PUBLIC_BASE_URL.
 * The owner's number comes from the brand profile ("Your phone") or OWNER_PHONE.
 */
export function phoneConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && process.env.PUBLIC_BASE_URL && ownerPhone(),
  );
}

export function ownerPhone(): string | undefined {
  return (getSettings().owner_phone || process.env.OWNER_PHONE || "").replace(/[^\d+]/g, "") || undefined;
}

/** Call language follows the app language unless PHONE_LANGUAGE is set. */
export function phoneLanguage(): string {
  return process.env.PHONE_LANGUAGE ?? (getLang() === "en" ? "en-US" : "ro-RO");
}
function phoneVoice(): string {
  return process.env.PHONE_VOICE ?? (phoneLanguage().startsWith("ro") ? "Google.ro-RO-Wavenet-A" : "Google.en-US-Wavenet-F");
}

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function publicUrl(path: string) {
  return new URL(path, process.env.PUBLIC_BASE_URL).toString();
}

/** TwiML that says something, then listens for the owner's reply. */
export function sayAndListen(text: string, conversationId: string, hangup = false): string {
  const spoken = text.replace(/[*_#`>|]+/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
  const say = `<Say voice="${phoneVoice()}" language="${phoneLanguage()}">${xmlEscape(spoken)}</Say>`;
  if (hangup) return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Hangup/></Response>`;
  const action = xmlEscape(publicUrl(`/api/phone/voice?c=${encodeURIComponent(conversationId)}`));
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" language="${phoneLanguage()}" speechTimeout="auto" action="${action}" method="POST">${say}</Gather><Redirect method="POST">${action}</Redirect></Response>`;
}

/** Validates the X-Twilio-Signature header (HMAC-SHA1 of URL + sorted POST params). */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Calls the owner. The call opens with `opening`, then becomes a live conversation with the assistant. */
export async function placeCall(opening: string): Promise<{ ok: true; call_sid: string }> {
  if (!phoneConfigured()) throw new Error("Phone calls are not set up. Add the Twilio settings and your phone number.");
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const conversationId = `call-${crypto.randomUUID()}`;
  saveConversation(conversationId, [{ role: "user", content: "(The assistant is calling the owner.)" }, { role: "assistant", content: opening }], "phone");
  const body = new URLSearchParams({
    To: ownerPhone()!,
    From: process.env.TWILIO_FROM_NUMBER!,
    Twiml: sayAndListen(opening, conversationId),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok || !json.sid) throw new Error(`Twilio error: ${json.message ?? res.status}`);
  return { ok: true, call_sid: json.sid };
}
