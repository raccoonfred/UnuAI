import { NextResponse } from "next/server";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { chat, toDisplay } from "@/lib/chat";
import { aiConfigured } from "@/lib/ai";
import { getConversation } from "@/lib/repo";

export const maxDuration = 300;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "main";
  return NextResponse.json({ messages: toDisplay(getConversation(id) as BetaMessageParam[]) });
}

export async function POST(req: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Add your ANTHROPIC_API_KEY to .env.local to use the assistant." }, { status: 400 });
  }
  const body = (await req.json()) as { id?: string; message?: string; mode?: "text" | "voice" };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  try {
    const result = await chat(body.id ?? "main", message, body.mode ?? "text");
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
  }
}
