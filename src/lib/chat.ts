import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { runAgent, type ToolEvent } from "./ai";
import { getConversation, saveConversation } from "./repo";
import { ASSISTANT_ROLE, VOICE_ADDENDUM, assistantTools } from "./tools";

const MAX_HISTORY = 60;

/** Keeps the most recent messages, starting at a plain user message so tool calls stay paired. */
function trimHistory(messages: BetaMessageParam[]): BetaMessageParam[] {
  if (messages.length <= MAX_HISTORY) return messages;
  for (let i = messages.length - MAX_HISTORY; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user" && typeof m.content === "string") return messages.slice(i);
  }
  return messages.slice(-2);
}

export async function chat(
  conversationId: string,
  userText: string,
  mode: "text" | "voice" = "text",
): Promise<{ text: string; events: ToolEvent[] }> {
  const history = trimHistory(getConversation(conversationId) as BetaMessageParam[]);
  history.push({ role: "user", content: userText });
  const result = await runAgent({
    role: mode === "voice" ? ASSISTANT_ROLE + VOICE_ADDENDUM : ASSISTANT_ROLE,
    history,
    tools: assistantTools(),
    webSearch: mode === "text",
    effort: mode === "voice" ? "low" : "medium",
    maxTurns: mode === "voice" ? 6 : 12,
  });
  saveConversation(conversationId, result.messages, conversationId.startsWith("call-") ? "phone" : "web");
  return { text: result.text || "Done.", events: result.events };
}

export type DisplayMessage = { role: "user" | "assistant"; text: string; tools?: string[] };

/** Turns stored API messages into simple chat bubbles. */
export function toDisplay(messages: BetaMessageParam[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      if (typeof m.content === "string") out.push({ role: "user", text: m.content });
      continue;
    }
    const blocks = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : (m.content ?? []);
    const text = blocks.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const tools = blocks.flatMap((b) => (b.type === "tool_use" || b.type === "server_tool_use" ? [b.name] : []));
    const last = out.at(-1);
    if (last && last.role === "assistant") {
      if (text) last.text = [last.text, text].filter(Boolean).join("\n\n");
      if (tools.length) last.tools = [...(last.tools ?? []), ...tools];
    } else {
      out.push({ role: "assistant", text, tools });
    }
  }
  return out;
}
