import fs from "node:fs";
import { cachedAudioPath } from "@/lib/tts";

/**
 * Serves already-generated audio by its unguessable id, for Twilio <Play> during phone calls.
 * It never generates new audio, so it is safe to leave public.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const file = cachedAudioPath(id.replace(/\.mp3$/, ""));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" } });
}
