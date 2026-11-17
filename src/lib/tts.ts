import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./repo";
import type { Lang } from "./i18n";

/**
 * Natural-sounding speech through ElevenLabs, with one voice per language.
 * Audio is cached on disk by content, so the same sentence is never paid for twice.
 */
const API = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io/v1";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5"; // cheapest/fastest model that speaks Romanian
const CACHE_DIR = path.join(path.dirname(process.env.UNUAI_DB_PATH ?? path.join(process.cwd(), "data", "unuai.db")), "tts");
export const MAX_TTS_CHARS = 2500;

// Premade multilingual voices; pick native-sounding ones in Brand brain > Voices.
const DEFAULT_VOICES: Record<Lang, string> = {
  ro: "21m00Tcm4TlvDq8ikWAM",
  en: "JBFqnCBsd6RMkjVDRZzb",
};

export function ttsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function voiceFor(lang: Lang): string {
  const s = getSettings();
  return (
    (lang === "ro" ? s.voice_ro || process.env.ELEVENLABS_VOICE_RO : s.voice_en || process.env.ELEVENLABS_VOICE_EN) ||
    DEFAULT_VOICES[lang]
  );
}

export function cachedAudioPath(id: string): string | null {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const file = path.join(CACHE_DIR, `${id}.mp3`);
  return fs.existsSync(file) ? file : null;
}

/** Returns the id of the cached MP3 for this text (creating it if needed). */
export async function synthesize(text: string, lang: Lang): Promise<string> {
  const clean = text.trim().slice(0, MAX_TTS_CHARS);
  const voice = voiceFor(lang);
  const id = crypto.createHash("sha256").update(`${MODEL}|${voice}|${lang}|${clean}`).digest("hex");
  if (cachedAudioPath(id)) return id;

  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: clean, model_id: MODEL, language_code: lang }),
  });
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${id}.mp3`), Buffer.from(await res.arrayBuffer()));
  return id;
}

export type Voice = { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string };

export async function listVoices(): Promise<Voice[]> {
  if (!ttsConfigured()) return [];
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } });
  if (!res.ok) return [];
  const data = (await res.json()) as { voices?: Voice[] };
  return (data.voices ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

/** Strips Markdown so the voice reads only the words. */
export function speakableText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>|]+/g, " ")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
