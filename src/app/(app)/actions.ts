"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generate, generateJson } from "@/lib/ai";
import * as repo from "@/lib/repo";
import { buildPage, editPage } from "@/lib/website";
import { placeCall } from "@/lib/phone";
import { languageName, type Lang } from "@/lib/i18n";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === undefined ? undefined : Number(v);
};
const int = (fd: FormData, k: string) => {
  const v = num(fd, k);
  return v === undefined || Number.isNaN(v) ? undefined : Math.trunc(v);
};
const id = (fd: FormData) => {
  const v = int(fd, "id");
  if (!v) throw new Error("Missing id");
  return v;
};

// ---------------- Language ----------------

export async function setLanguage(lang: Lang) {
  repo.setSettings({ ui_language: lang === "en" ? "en" : "ro" });
  revalidatePath("/", "layout");
}

// ---------------- Brand ----------------

export async function saveVoices(fd: FormData) {
  repo.setSettings({ voice_ro: String(fd.get("voice_ro") ?? ""), voice_en: String(fd.get("voice_en") ?? "") });
  revalidatePath("/brand");
}

export async function saveBrandProfile(fd: FormData) {
  repo.setSettings(Object.fromEntries(repo.BRAND_FIELDS.map((f) => [f.key, String(fd.get(f.key) ?? "")])));
  revalidatePath("/brand");
}

export async function addKnowledgeAction(fd: FormData) {
  const title = str(fd, "title");
  const content = str(fd, "content");
  if (!title || !content) return;
  repo.addKnowledge({ title, content, category: str(fd, "category") ?? "brand" });
  revalidatePath("/brand");
}

export async function updateKnowledgeAction(fd: FormData) {
  repo.updateKnowledge(id(fd), { title: str(fd, "title"), category: str(fd, "category"), content: str(fd, "content") });
  revalidatePath("/brand");
}

export async function deleteKnowledgeAction(fd: FormData) {
  repo.deleteKnowledge(id(fd));
  revalidatePath("/brand");
}

const LearnSchema = z.object({
  facts: z.array(
    z.object({
      title: z.string(),
      category: z.enum(["brand", "product", "customers", "marketing", "sales", "operations", "preferences"]),
      content: z.string(),
    }),
  ),
});

/** Reads a web page (the brand's site, a shop listing, an article) and saves what it learns. */
export async function learnFromUrl(fd: FormData) {
  const url = str(fd, "url");
  if (!url) return;
  const result = await generateJson(
    `Read this page about our brand and extract the lasting facts worth remembering (story, products and specs, prices, materials, people, customers, tone, channels, shipping, warranties...): ${url}\n\nOnly include facts the page actually states. Skip anything already in the knowledge base. Each fact should be a short, self-contained note.`,
    LearnSchema,
    { webFetch: true },
  );
  for (const f of result.facts) repo.addKnowledge({ ...f, content: `${f.content}\n\nSource: ${url}` });
  revalidatePath("/brand");
}

// ---------------- Leads ----------------

function leadFromForm(fd: FormData): Partial<repo.Lead> {
  return {
    name: str(fd, "name"),
    company: str(fd, "company"),
    kind: str(fd, "kind"),
    status: str(fd, "status"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    website: str(fd, "website"),
    instagram: str(fd, "instagram"),
    city: str(fd, "city"),
    country: str(fd, "country"),
    source: str(fd, "source"),
    est_value: num(fd, "est_value"),
    next_follow_up: str(fd, "next_follow_up"),
    notes: str(fd, "notes"),
  };
}

export async function addLeadAction(fd: FormData) {
  const lead = leadFromForm(fd);
  if (!lead.name) return;
  const newId = repo.addLead(lead as repo.Lead);
  redirect(`/leads/${newId}`);
}

export async function updateLeadAction(fd: FormData) {
  const leadId = id(fd);
  const fields = leadFromForm(fd);
  // Allow clearing the follow-up date from the form.
  repo.updateLead(leadId, { ...fields, next_follow_up: fields.next_follow_up ?? null });
  revalidatePath(`/leads/${leadId}`);
}

export async function setLeadStatus(fd: FormData) {
  const leadId = id(fd);
  repo.updateLead(leadId, { status: str(fd, "status") });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLeadAction(fd: FormData) {
  repo.deleteLead(id(fd));
  redirect("/leads");
}

export async function addActivityAction(fd: FormData) {
  const leadId = int(fd, "lead_id")!;
  const note = str(fd, "note");
  if (!note) return;
  repo.addActivity({ lead_id: leadId, kind: str(fd, "kind") ?? "note", note });
  const follow = str(fd, "next_follow_up");
  if (follow) repo.updateLead(leadId, { next_follow_up: follow });
  revalidatePath(`/leads/${leadId}`);
}

function leadDossier(leadId: number) {
  const lead = repo.getLead(leadId);
  if (!lead) throw new Error("Lead not found");
  const acts = repo.listActivities(leadId);
  const sales = repo.listSales().filter((s) => s.lead_id === leadId);
  return {
    lead,
    text: [
      `Lead #${lead.id}: ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      `Type: ${lead.kind}. Status: ${lead.status}. Location: ${[lead.city, lead.country].filter(Boolean).join(", ") || "unknown"}.`,
      `Contact: ${[lead.email, lead.phone, lead.website, lead.instagram].filter(Boolean).join(" | ") || "none"}`,
      lead.est_value ? `Estimated value: €${lead.est_value}` : "",
      lead.notes ? `Notes: ${lead.notes}` : "",
      acts.length ? `History:\n${acts.map((a) => `- ${a.created_at.slice(0, 10)} ${a.kind}: ${a.note}`).join("\n")}` : "No interactions yet.",
      sales.length ? `Past sales: ${sales.map((s) => `${s.sold_at} €${s.amount} ${s.product_name ?? s.description ?? ""} (${s.status})`).join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function generateSalesBrief(fd: FormData) {
  const leadId = int(fd, "lead_id")!;
  const { lead, text } = leadDossier(leadId);
  const goal = str(fd, "goal") ?? "move this lead to the next stage";
  const content = await generate(
    `Prepare me for my next conversation with this lead. Goal: ${goal}.\n\n${text}\n\nResearch them on the web first (their shop/site/socials, what brands they carry or play, recent news). Then write a sales prep brief with:\n1. Who they are (with sources)\n2. Why UNU fits them, matched to specific UNU products\n3. My goal for the conversation and the ideal outcome\n4. Opening line and 5 smart questions\n5. Likely objections with short answers\n6. Offer and pricing angle (dealer terms if they are a shop/distributor)\n7. Next step to propose`,
    { webSearch: true, effort: "medium" },
  );
  repo.addDocument({ kind: "sales_brief", title: `Sales brief: ${lead.name}`, content, lead_id: leadId });
  revalidatePath(`/leads/${leadId}`);
}

export async function generateOutreach(fd: FormData) {
  const leadId = int(fd, "lead_id")!;
  const { lead, text } = leadDossier(leadId);
  const channel = str(fd, "channel") ?? "email";
  const goal = str(fd, "goal") ?? "start a conversation";
  const language = str(fd, "language") ?? "the language that fits this lead";
  const content = await generate(
    `Write a ${channel} message to this lead. Goal: ${goal}. Language: ${language}.\n\n${text}\n\nKeep it short, personal and specific to them, in the UNU brand voice. ${channel === "email" ? "Give a subject line and the body." : ""} Then give one follow-up message to send if they don't reply in 4 days.`,
    { effort: "low" },
  );
  repo.addDocument({ kind: "outreach", title: `${channel[0].toUpperCase() + channel.slice(1)} to ${lead.name}`, content, lead_id: leadId });
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteDocumentAction(fd: FormData) {
  repo.deleteDocument(id(fd));
  revalidatePath("/", "layout");
}

const CandidateSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().describe("Contact person or business name"),
      company: z.string().optional(),
      kind: z.enum(repo.LEAD_KINDS),
      city: z.string().optional(),
      country: z.string().optional(),
      website: z.string().optional(),
      instagram: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      why: z.string().describe("One or two sentences: why they are a good fit for UNU"),
    }),
  ),
});
export type Candidate = z.infer<typeof CandidateSchema>["leads"][number];

export async function findLeads(
  _prev: { candidates: Candidate[]; error?: string },
  fd: FormData,
): Promise<{ candidates: Candidate[]; error?: string }> {
  const what = str(fd, "what") ?? "independent guitar shops";
  const where = str(fd, "where") ?? "Romania";
  const count = Math.min(int(fd, "count") ?? 10, 25);
  const existing = repo.listLeads().map((l) => l.company || l.name);
  try {
    const result = await generateJson(
      `Find ${count} real, currently active ${what} in ${where} that would be good leads for UNU. Use web search and only include businesses or people you found evidence for, with contact details that appear publicly (leave a field empty rather than guessing). Prefer ones that sell or play boutique/independent guitars.\n\nAlready in my list (skip these): ${existing.join(", ") || "none"}.`,
      CandidateSchema,
      { webSearch: true, effort: "medium" },
    );
    return { candidates: result.leads };
  } catch (err) {
    return { candidates: [], error: err instanceof Error ? err.message : "Search failed" };
  }
}

export async function importCandidate(c: Candidate) {
  const { why, ...rest } = c;
  const newId = repo.addLead({ ...rest, notes: why, source: "AI lead finder", status: "new" });
  revalidatePath("/leads");
  return newId;
}

// ---------------- Sales ----------------

export async function addSaleAction(fd: FormData) {
  const amount = num(fd, "amount");
  if (amount === undefined) return;
  repo.addSale({
    amount,
    quantity: int(fd, "quantity") ?? 1,
    product_id: int(fd, "product_id") ?? null,
    lead_id: int(fd, "lead_id") ?? null,
    description: str(fd, "description"),
    channel: str(fd, "channel"),
    status: str(fd, "status"),
    currency: str(fd, "currency"),
    sold_at: str(fd, "sold_at"),
  });
  revalidatePath("/sales");
}

export async function setSaleStatus(fd: FormData) {
  repo.updateSale(id(fd), { status: str(fd, "status") });
  revalidatePath("/sales");
}

export async function deleteSaleAction(fd: FormData) {
  repo.deleteSale(id(fd));
  revalidatePath("/sales");
}

export async function salesInsights() {
  const summary = repo.salesSummary();
  const recent = repo.listSales().slice(0, 50);
  const content = await generate(
    `Here is my sales data.\n\nSummary: ${JSON.stringify(summary)}\n\nRecent sales: ${JSON.stringify(recent)}\n\nGive me a short, honest read: what's working, what's slipping, and 3 concrete actions for the next 2 weeks. If there is too little data, say so and tell me what to track.`,
    { effort: "low" },
  );
  repo.addDocument({ kind: "sales_insight", title: `Sales read ${new Date().toISOString().slice(0, 10)}`, content });
  revalidatePath("/sales");
}

// ---------------- Products ----------------

function productFromForm(fd: FormData): Partial<repo.Product> {
  return {
    name: str(fd, "name"),
    sku: str(fd, "sku"),
    category: str(fd, "category"),
    price: num(fd, "price"),
    cost: num(fd, "cost"),
    stock: int(fd, "stock"),
    specs: str(fd, "specs"),
    description: str(fd, "description"),
  };
}

export async function addProductAction(fd: FormData) {
  const p = productFromForm(fd);
  if (!p.name) return;
  const newId = repo.addProduct(p as repo.Product);
  redirect(`/products/${newId}`);
}

export async function updateProductAction(fd: FormData) {
  const pid = id(fd);
  repo.updateProduct(pid, productFromForm(fd));
  revalidatePath(`/products/${pid}`);
}

export async function deleteProductAction(fd: FormData) {
  repo.deleteProduct(id(fd));
  redirect("/products");
}

export async function describeProduct(fd: FormData) {
  const pid = id(fd);
  const p = repo.getProduct(pid);
  if (!p) return;
  const style = str(fd, "style") ?? "website product page";
  const language = str(fd, "language") ?? languageName();
  const description = await generate(
    `Write the ${style} description for this guitar, in ${language}.\n\nProduct: ${JSON.stringify(p)}\n\nMake it vivid and specific (tone, feel, build, who it's for), honest to the specs, in the UNU voice. Include a one-line hook, the description, and a short bullet list of key specs. Output only the description, ready to paste.`,
    { effort: "low" },
  );
  repo.updateProduct(pid, { description });
  revalidatePath(`/products/${pid}`);
}

// ---------------- Marketing ----------------

export async function addTaskAction(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return;
  repo.addTask({ title, area: str(fd, "area"), due_date: str(fd, "due_date"), notes: str(fd, "notes") });
  revalidatePath("/marketing");
}

export async function setTaskStatus(fd: FormData) {
  repo.updateTask(id(fd), { status: str(fd, "status") });
  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function deleteTaskAction(fd: FormData) {
  repo.deleteTask(id(fd));
  revalidatePath("/marketing");
}

const PlanSchema = z.object({
  summary: z.string().describe("The strategy in 3-5 sentences"),
  tasks: z.array(
    z.object({
      title: z.string(),
      area: z.enum(repo.TASK_AREAS),
      due_date: z.string().describe("YYYY-MM-DD"),
      notes: z.string().optional(),
    }),
  ),
  content: z.array(
    z.object({
      title: z.string(),
      channel: z.enum(repo.CONTENT_CHANNELS),
      scheduled_for: z.string().describe("YYYY-MM-DD"),
      body: z.string().describe("Full ready-to-post text including caption and hashtags, or the email copy"),
    }),
  ),
});

export async function planMarketing(fd: FormData) {
  const goal = str(fd, "goal") ?? "grow awareness and sales";
  const weeks = Math.min(int(fd, "weeks") ?? 4, 12);
  const channels = fd.getAll("channels").map(String).join(", ") || "instagram, tiktok, email";
  const perWeek = int(fd, "per_week") ?? 3;
  const plan = await generateJson(
    `Build a ${weeks}-week marketing plan for UNU starting this week. Goal: ${goal}. Channels: ${channels}. About ${perWeek} posts per week.\n\nGive: a short strategy summary; concrete tasks with due dates (shoots, outreach to artists and shops, ads, website updates...); and the content calendar with every post fully written in the brand voice (hooks, captions, hashtags, video ideas with shot lists for reels/TikToks). Tie posts to real products from the catalog where possible. Use the language from the brand profile.`,
    PlanSchema,
    { tier: "standard", effort: "medium", maxTokens: 32000 },
  );
  for (const t of plan.tasks) repo.addTask(t);
  for (const c of plan.content) repo.addContent({ ...c, status: "draft" });
  repo.addDocument({ kind: "plan", title: `Marketing plan: ${goal}`, content: plan.summary });
  revalidatePath("/marketing");
}

export async function generatePost(fd: FormData) {
  const channel = str(fd, "channel") ?? "instagram";
  const topic = str(fd, "topic") ?? "a product highlight";
  const pid = int(fd, "product_id");
  const product = pid ? repo.getProduct(pid) : undefined;
  const body = await generate(
    `Write a ${channel} post about: ${topic}.${product ? `\nProduct: ${JSON.stringify(product)}` : ""}\n\nGive the hook, the full caption/copy, hashtags if relevant, and for video channels a shot list. Then 2 alternative hooks. Output only the post content.`,
    { effort: "low" },
  );
  const newId = repo.addContent({ channel, title: topic.slice(0, 80), body, status: "draft", product_id: pid ?? null, scheduled_for: str(fd, "scheduled_for") });
  redirect(`/marketing/${newId}`);
}

export async function updateContentAction(fd: FormData) {
  const cid = id(fd);
  repo.updateContent(cid, {
    title: str(fd, "title"),
    body: String(fd.get("body") ?? ""),
    channel: str(fd, "channel"),
    status: str(fd, "status"),
    scheduled_for: str(fd, "scheduled_for") ?? null,
  });
  revalidatePath(`/marketing/${cid}`);
  revalidatePath("/marketing");
}

export async function rewriteContent(fd: FormData) {
  const cid = id(fd);
  const c = repo.getContent(cid);
  const instruction = str(fd, "instruction");
  if (!c || !instruction) return;
  const body = await generate(
    `Rewrite this ${c.channel} content following the instruction. Output only the new content.\n\nInstruction: ${instruction}\n\nCurrent content:\n${c.body}`,
    { effort: "low" },
  );
  repo.updateContent(cid, { body });
  revalidatePath(`/marketing/${cid}`);
}

export async function deleteContentAction(fd: FormData) {
  repo.deleteContent(id(fd));
  redirect("/marketing");
}

// ---------------- Website ----------------

export async function buildPageAction(fd: FormData) {
  const slug = (str(fd, "slug") ?? "home").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const title = str(fd, "title") ?? "Home";
  const brief = str(fd, "brief") ?? "A home page for the brand.";
  const pid = await buildPage({ slug, title, brief });
  redirect(`/website/${pid}`);
}

export async function editPageAction(fd: FormData) {
  const pid = id(fd);
  const instruction = str(fd, "instruction");
  if (!instruction) return;
  await editPage(pid, instruction);
  revalidatePath(`/website/${pid}`);
}

export async function savePageHtml(fd: FormData) {
  const pid = id(fd);
  repo.updatePage(pid, { html: String(fd.get("html") ?? ""), title: str(fd, "title") });
  revalidatePath(`/website/${pid}`);
}

export async function togglePublish(fd: FormData) {
  const pid = id(fd);
  const page = repo.getPage(pid);
  if (page) repo.updatePage(pid, { published: page.published ? 0 : 1 });
  revalidatePath(`/website/${pid}`);
  revalidatePath("/website");
}

export async function deletePageAction(fd: FormData) {
  repo.deletePage(id(fd));
  redirect("/website");
}

// ---------------- Dashboard ----------------

function overviewText() {
  return JSON.stringify({
    sales: repo.salesSummary(),
    pipeline: repo.pipelineSummary(),
    follow_ups_due: repo.followUpsDue().map((l) => ({ name: l.name, company: l.company, due: l.next_follow_up, status: l.status })),
    open_tasks: repo.listTasks().filter((t) => t.status !== "done").slice(0, 20),
    upcoming_content: repo.listContent().filter((c) => c.status !== "published").slice(0, 10).map((c) => ({ title: c.title, channel: c.channel, date: c.scheduled_for, status: c.status })),
  });
}

export async function dailyBriefing() {
  const content = await generate(
    `Write my daily briefing for UNU from this data: ${overviewText()}\n\nFormat: one-line headline, then "Today" (the 3-5 most important things to do, most important first, with who/what exactly), "Numbers" (2-3 lines), and "Ideas" (1-2 quick wins). Be brief.`,
    { effort: "low" },
  );
  repo.addDocument({ kind: "report", title: `Briefing ${new Date().toISOString().slice(0, 10)}`, content });
  revalidatePath("/");
}

export async function callMeWithBriefing() {
  const spoken = await generate(
    `I'm about to call the owner. Write what to say when they pick up: a spoken daily briefing of at most 6 short sentences from this data, then ask what they want to work on. No Markdown, natural spoken language in the owner's preferred language. Data: ${overviewText()}`,
    { effort: "low" },
  );
  await placeCall(spoken);
}
