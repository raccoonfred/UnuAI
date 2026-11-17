import { NextResponse } from "next/server";
import { placeCall } from "@/lib/phone";

export async function POST(req: Request) {
  const { opening } = (await req.json().catch(() => ({}))) as { opening?: string };
  try {
    return NextResponse.json(await placeCall(opening?.trim() || "Hi, it's your UNU assistant. What would you like to go over?"));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Call failed" }, { status: 400 });
  }
}
