import Chat from "@/components/Chat";
import { phoneConfigured } from "@/lib/phone";

export default function AssistantPage() {
  return <Chat canCall={phoneConfigured()} />;
}
