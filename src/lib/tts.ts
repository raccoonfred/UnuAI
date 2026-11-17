import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./repo";
import type { Lang } from "./i18n";

/**
 * Natural-sounding speech with one voice per language, from one of two services:
 * - Azure Speech (free tier: 500,000 characters a month, Romanian voices Alina and Emil): AZURE_SPEECH_KEY + AZURE_SPEECH_REGION
 * - ElevenLabs (paid beyond a small free allowance): ELEVENLABS_API_KEY
 * If both are set, TTS_PROVIDER picks one (default: azure, because it is free).
 * Audio is cached on disk by content, so the same sentence is never generated twice.
 */
type Provider = "azure" | "elevenlabs";
const ELEVEN_API = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io/v1";
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5"; // cheapest/fastest model that speaks Romanian
const CACHE_DIR = path.join(path.dirname(process.env.UNUAI_DB_PATH ?? path.join(process.cwd(), "data", "unuai.db")), "tts");
export const MAX_TTS_CHARS = 2500;

export function ttsProvider(): Provider | null {
  const azure = Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  const eleven = Boolean(process.env.ELEVENLABS_API_KEY);
  if (azure && eleven) return process.env.TTS_PROVIDER === "elevenlabs" ? "elevenlabs" : "azure";
  return azure ? "azure" : eleven ? "elevenlabs" : null;
}

export function ttsConfigured(): boolean {
  return ttsProvider() !== null;
}

// Azure neural voices worth offering (the Romanian ones are the most natural free Romanian voices available).
const AZURE_VOICES: Voice[] = [
  { voice_id: "ro-RO-AlinaNeural", name: "Alina", lang: "ro", labels: { gender: "female", accent: "Romanian" } },
  { voice_id: "ro-RO-EmilNeural", name: "Emil", lang: "ro", labels: { gender: "male", accent: "Romanian" } },
  { voice_id: "en-US-AvaMultilingualNeural", name: "Ava", lang: "en", labels: { gender: "female", accent: "American" } },
  { voice_id: "en-US-AndrewMultilingualNeural", name: "Andrew", lang: "en", labels: { gender: "male", accent: "American" } },
  { voice_id: "en-US-JennyNeural", name: "Jenny", lang: "en", labels: { gender: "female", accent: "American" } },
  { voice_id: "en-US-GuyNeural", name: "Guy", lang: "en", labels: { gender: "male", accent: "American" } },
  { voice_id: "en-GB-SoniaNeural", name: "Sonia", lang: "en", labels: { gender: "female", accent: "British" } },
  { voice_id: "en-GB-RyanNeural", name: "Ryan", lang: "en", labels: { gender: "male", accent: "British" } },
];

const DEFAULT_VOICES: Record<Provider, Record<Lang, string>> = {
  azure: { ro: "ro-RO-AlinaNeural", en: "en-US-AvaMultilingualNeural" },
  elevenlabs: { ro: "21m00Tcm4TlvDq8ikWAM", en: "JBFqnCBsd6RMkjVDRZzb" },
};

/** Settings key for the chosen voice: one per service and language. */
export function voiceSettingKey(provider: Provider, lang: Lang) {
  return `voice_${provider}_${lang}`;
}

export function voiceFor(lang: Lang, provider: Provider | null = ttsProvider()): string {
  if (!provider) return "";
  const env = provider === "elevenlabs" ? (lang === "ro" ? process.env.ELEVENLABS_VOICE_RO : process.env.ELEVENLABS_VOICE_EN) : undefined;
  return getSettings()[voiceSettingKey(provider, lang)] || env || DEFAULT_VOICES[provider][lang];
}

export function cachedAudioPath(id: string): string | null {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const file = path.join(CACHE_DIR, `${id}.mp3`);
  return fs.existsSync(file) ? file : null;
}

function xmlEscape(t: string) {
  return t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

async function azureSpeech(text: string, voice: string): Promise<ArrayBuffer> {
  const region = process.env.AZURE_SPEECH_REGION!;
  const locale = voice.split("-").slice(0, 2).join("-");
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${xmlEscape(voice)}">${xmlEscape(text)}</voice></speak>`;
  const base = process.env.AZURE_SPEECH_BASE_URL ?? `https://${region}.tts.speech.microsoft.com`;
  const res = await fetch(`${base}/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "unuai",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure Speech error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.arrayBuffer();
}

async function elevenSpeech(text: string, voice: string, lang: Lang): Promise<ArrayBuffer> {
  const res = await fetch(`${ELEVEN_API}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: ELEVEN_MODEL, language_code: lang }),
  });
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.arrayBuffer();
}

/** Returns the id of the cached MP3 for this text (creating it if needed). */
export async function synthesize(text: string, lang: Lang): Promise<string> {
  const provider = ttsProvider();
  if (!provider) throw new Error("No voice service configured");
  const clean = text.trim().slice(0, MAX_TTS_CHARS);
  const voice = voiceFor(lang, provider);
  const id = crypto.createHash("sha256").update(`${provider}|${ELEVEN_MODEL}|${voice}|${lang}|${clean}`).digest("hex");
  if (cachedAudioPath(id)) return id;
  const audio = provider === "azure" ? await azureSpeech(clean, voice) : await elevenSpeech(clean, voice, lang);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${id}.mp3`), Buffer.from(audio));
  return id;
}

export type Voice = { voice_id: string; name: string; lang?: Lang; labels?: Record<string, string> };

/** Voices to choose from for a language. */
export async function listVoices(lang: Lang): Promise<Voice[]> {
  const provider = ttsProvider();
  if (provider === "azure") return AZURE_VOICES.filter((v) => v.lang === lang);
  if (provider !== "elevenlabs") return [];
  const res = await fetch(`${ELEVEN_API}/voices`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } }).catch(() => null);
  if (!res?.ok) return [];
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
