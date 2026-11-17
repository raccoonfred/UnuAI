import crypto from "node:crypto";
import { chat } from "@/lib/chat";
import { getSettings, saveConversation } from "@/lib/repo";
import { ownerPhone, publicUrl, sayAndListen, validTwilioSignature, phoneLanguage } from "@/lib/phone";

export const maxDuration = 60;

const twiml = (xml: string) => new Response(xml, { headers: { "Content-Type": "text/xml" } });
const BYE = /\b(bye|goodbye|that'?s all|pa|la revedere|gata|mulțumesc,? atât|multumesc,? atat)\b/i;

/** Twilio voice webhook: inbound calls from the owner and every turn of a call. */
export async function POST(req: Request) {
  const ro = phoneLanguage().startsWith("ro");
  const url = new URL(req.url);
  const form = await req.formData();
  const params = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const signedUrl = publicUrl(url.pathname + url.search);
  if (!validTwilioSignature(signedUrl, params, req.headers.get("x-twilio-signature"))) {
    return new Response("Forbidden", { status: 403 });
  }

  let conversationId = url.searchParams.get("c");
  if (!conversationId) {
    // Inbound call: only the owner may talk to the assistant.
    const from = (params.From ?? "").replace(/[^\d+]/g, "");
    if (!from || from !== ownerPhone()) {
      return twiml(await sayAndListen(ro ? "Ne pare rău, acest număr nu este disponibil." : "Sorry, this line is private.", "x", true));
    }
    conversationId = `call-${crypto.randomUUID()}`;
    const name = getSettings().owner_name;
    const greeting = ro ? `Salut${name ? " " + name : ""}! Cu ce te pot ajuta?` : `Hi${name ? " " + name : ""}! What can I do for you?`;
    saveConversation(conversationId, [{ role: "user", content: "(The owner is calling the assistant.)" }, { role: "assistant", content: greeting }], "phone");
    return twiml(await sayAndListen(greeting, conversationId));
  }

  const speech = params.SpeechResult?.trim();
  if (!speech) {
    return twiml(await sayAndListen(ro ? "Bine, vorbim mai târziu!" : "Alright, talk soon!", conversationId, true));
  }
  try {
    const { text } = await chat(conversationId, speech, "voice");
    return twiml(await sayAndListen(text, conversationId, BYE.test(speech)));
  } catch (err) {
    console.error(err);
    return twiml(await sayAndListen(ro ? "Am o problemă tehnică acum. Încearcă din nou mai târziu." : "I hit a technical problem. Please try again later.", conversationId, true));
  }
}
