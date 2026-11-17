import Chat from "@/components/Chat";
import { phoneConfigured } from "@/lib/phone";
import { getDict, getLang } from "@/lib/i18n";

export default function AssistantPage() {
  const lang = getLang();
  return <Chat canCall={phoneConfigured()} t={getDict(lang).assistant} defaultSpeech={lang === "en" ? "en-US" : "ro-RO"} />;
}
