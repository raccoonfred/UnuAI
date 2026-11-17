import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
  BetaToolUnion,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { getSettings, listKnowledge, listProducts, BRAND_FIELDS } from "./repo";

export const MODEL = process.env.UNUAI_MODEL ?? "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let _client: Anthropic | undefined;
export function client() {
  _client ??= new Anthropic();
  return _client;
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export const WEB_SEARCH: BetaToolUnion = { type: "web_search_20260209", name: "web_search", max_uses: 8 };
export const WEB_FETCH: BetaToolUnion = { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 };

/** Everything the assistant knows about UNU: brand profile, knowledge base and product line. */
export function brandContext(): string {
  const s = getSettings();
  const brand = s.brand_name || "UNU";
  const profile = BRAND_FIELDS.filter((f) => s[f.key]?.trim())
    .map((f) => `- ${f.label}: ${s[f.key].trim()}`)
    .join("\n");
  const knowledge = listKnowledge()
    .map((k) => `### ${k.title} (${k.category})\n${k.content}`)
    .join("\n\n");
  const products = listProducts()
    .map(
      (p) =>
        `- #${p.id} ${p.name}${p.sku ? ` [${p.sku}]` : ""}: €${p.price}${p.stock ? `, ${p.stock} in stock` : ", out of stock"}${p.specs ? `. Specs: ${p.specs}` : ""}`,
    )
    .join("\n");
  return [
    `# About ${brand}`,
    `${brand} is a guitar brand. The person you work for owns and runs it.`,
    profile ? `## Brand profile\n${profile}` : "## Brand profile\n(Not filled in yet. Ask the owner about the brand when it matters, and save what you learn.)",
    knowledge ? `## Brand knowledge base\n${knowledge}` : "",
    products ? `## Product catalog\n${products}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function systemBlocks(role: string): BetaTextBlockParam[] {
  const now = new Date().toLocaleString("en-GB", {
    timeZone: process.env.UNUAI_TIMEZONE ?? "Europe/Bucharest",
    dateStyle: "full",
    timeStyle: "short",
  });
  return [
    { type: "text", text: role },
    { type: "text", text: brandContext(), cache_control: { type: "ephemeral" } },
    { type: "text", text: `Current date and time for the owner: ${now}.` },
  ];
}

export function textOf(content: BetaContentBlock[]): string {
  return content
    .filter((b): b is Extract<BetaContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

type GenerateOptions = {
  role?: string;
  webSearch?: boolean;
  webFetch?: boolean;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
};

const WRITER_ROLE = `You are the in-house AI business partner for a guitar brand. You write marketing copy, sales material and plans that sound like the brand, are specific to its products and customers, and are ready to use without editing. Never invent facts about the brand, prices, specs or customers: use what is in the context below, and mark anything you had to assume with [check]. Answer in the language the request is written in unless told otherwise. Use Markdown.`;

/** Zod schema -> tool input_schema (without the $schema marker). */
function toInputSchema(schema: z.ZodType): Anthropic.Beta.Messages.BetaTool.InputSchema {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _ignored;
  return rest as Anthropic.Beta.Messages.BetaTool.InputSchema;
}

function webTools(opts: GenerateOptions): BetaToolUnion[] | undefined {
  const t = [...(opts.webSearch ? [WEB_SEARCH] : []), ...(opts.webFetch ? [WEB_FETCH] : [])];
  return t.length ? t : undefined;
}

/** One-shot generation (with optional web search), returning Markdown text. */
export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const messages: BetaMessageParam[] = [{ role: "user", content: prompt }];
  let response: BetaMessage;
  // Loop only to resume server-tool turns that pause (long web searches).
  for (let i = 0; i < 4; i++) {
    response = await client().beta.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(opts.role ?? WRITER_ROLE),
      output_config: { effort: opts.effort ?? "medium" },
      tools: webTools(opts),
      messages,
    }).finalMessage();
    if (response.stop_reason === "refusal") {
      throw new Error("The AI declined this request. Try rephrasing it.");
    }
    if (response.stop_reason !== "pause_turn") return textOf(response.content);
    messages.push({ role: "assistant", content: response.content });
  }
  return textOf(response!.content);
}

/** Structured generation: returns JSON validated against a Zod schema. */
export async function generateJson<T extends z.ZodType>(
  prompt: string,
  schema: T,
  opts: GenerateOptions = {},
): Promise<z.infer<T>> {
  const toolName = "submit_result";
  const tools: BetaToolUnion[] = [
    {
      name: toolName,
      description: "Submit the final result. Call this exactly once, when you are done.",
      input_schema: toInputSchema(schema),
    },
  ];
  tools.unshift(...(webTools(opts) ?? []));

  const messages: BetaMessageParam[] = [
    { role: "user", content: `${prompt}\n\nWhen you are done, call the ${toolName} tool with the result.` },
  ];
  for (let i = 0; i < 6; i++) {
    const response = await client().beta.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(opts.role ?? WRITER_ROLE),
      output_config: { effort: opts.effort ?? "medium" },
      tools,
      messages,
    }).finalMessage();
    if (response.stop_reason === "refusal") throw new Error("The AI declined this request. Try rephrasing it.");
    messages.push({ role: "assistant", content: response.content });
    const call = response.content.find(
      (b): b is Extract<BetaContentBlock, { type: "tool_use" }> => b.type === "tool_use" && b.name === toolName,
    );
    if (call) {
      const parsed = schema.safeParse(call.input);
      if (parsed.success) return parsed.data;
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: `Invalid result: ${parsed.error.message}. Fix it and call ${toolName} again.`,
          },
        ],
      });
      continue;
    }
    if (response.stop_reason === "pause_turn") continue;
    messages.push({ role: "user", content: `Please call ${toolName} with the result now.` });
  }
  throw new Error("The AI did not return a usable result. Please try again.");
}

// ---------------- Agent loop for the chat assistant ----------------

export type AgentTool = {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  run: (input: Record<string, unknown>) => Promise<unknown> | unknown;
};

export type ToolEvent = { tool: string; input: unknown; ok: boolean; summary: string };

export type AgentResult = {
  text: string;
  messages: BetaMessageParam[];
  events: ToolEvent[];
};

export async function runAgent(params: {
  role: string;
  history: BetaMessageParam[];
  tools: AgentTool[];
  webSearch?: boolean;
  effort?: GenerateOptions["effort"];
  maxTurns?: number;
}): Promise<AgentResult> {
  const messages = [...params.history];
  const events: ToolEvent[] = [];
  const byName = new Map(params.tools.map((t) => [t.name, t]));
  const toolDefs: BetaToolUnion[] = params.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: toInputSchema(t.schema),
  }));
  if (params.webSearch) toolDefs.push(WEB_SEARCH);
  const texts: string[] = [];

  for (let turn = 0; turn < (params.maxTurns ?? 12); turn++) {
    const response = await client().beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(params.role),
      output_config: { effort: params.effort ?? "medium" },
      tools: toolDefs,
      messages,
    }).finalMessage();
    messages.push({ role: "assistant", content: response.content });
    const text = textOf(response.content);
    if (text) texts.push(text);

    if (response.stop_reason === "refusal") {
      texts.push("Sorry, I can't help with that one.");
      break;
    }
    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason !== "tool_use") break;

    const results: BetaToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const tool = byName.get(block.name);
      if (!tool) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: `Unknown tool ${block.name}` });
        continue;
      }
      const parsed = tool.schema.safeParse(block.input);
      if (!parsed.success) {
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: `Invalid input: ${parsed.error.message}`,
        });
        events.push({ tool: block.name, input: block.input, ok: false, summary: "invalid input" });
        continue;
      }
      try {
        const out = await tool.run(parsed.data as Record<string, unknown>);
        const content = typeof out === "string" ? out : JSON.stringify(out ?? { ok: true });
        results.push({ type: "tool_result", tool_use_id: block.id, content });
        events.push({ tool: block.name, input: parsed.data, ok: true, summary: content.slice(0, 200) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: msg });
        events.push({ tool: block.name, input: parsed.data, ok: false, summary: msg });
      }
    }
    messages.push({ role: "user", content: results });
  }

  return { text: texts.join("\n\n"), messages, events };
}
