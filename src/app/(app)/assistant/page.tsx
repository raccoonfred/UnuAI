import Chat from "@/components/Chat";
import { phoneConfigured } from "@/lib/phone";
import { getDict, getLang } from "@/lib/i18n";
import { ttsConfigured } from "@/lib/tts";

export default function AssistantPage() {
  const lang = getLang();
  return <Chat canCall={phoneConfigured()} ttsEnabled={ttsConfigured()} t={getDict(lang).assistant} defaultSpeech={lang === "en" ? "en-US" : "ro-RO"} />;
}
