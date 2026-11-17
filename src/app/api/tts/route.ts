import { synthesize, ttsConfigured, cachedAudioPath, speakableText } from "@/lib/tts";
import fs from "node:fs";

/** Text to natural speech for the signed-in app (chat "read aloud"). */
export async function POST(req: Request) {
  if (!ttsConfigured()) return Response.json({ error: "No voice service configured" }, { status: 400 });
  const { text, lang } = (await req.json()) as { text?: string; lang?: string };
  if (!text?.trim()) return Response.json({ error: "Empty text" }, { status: 400 });
  try {
    const id = await synthesize(speakableText(text), lang === "en" ? "en" : "ro");
    return new Response(fs.readFileSync(cachedAudioPath(id)!), { headers: { "Content-Type": "audio/mpeg" } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : "Voice failed" }, { status: 502 });
  }
}
