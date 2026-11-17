import { z } from "zod";
import type { AgentTool } from "./ai";
import * as repo from "./repo";
import { buildPage, editPage } from "./website";
import { placeCall, phoneConfigured } from "./phone";

const opt = <T extends z.ZodType>(t: T) => t.optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

const leadFields = {
  name: opt(z.string()),
  company: opt(z.string()),
  kind: opt(z.enum(repo.LEAD_KINDS)),
  status: opt(z.enum(repo.LEAD_STATUSES)),
  email: opt(z.string()),
  phone: opt(z.string()),
  website: opt(z.string()),
  instagram: opt(z.string()),
  city: opt(z.string()),
  country: opt(z.string()),
  source: opt(z.string()),
  est_value: opt(z.number().describe("Estimated deal value in EUR")),
  next_follow_up: opt(date),
  notes: opt(z.string()),
};

const productFields = {
  name: opt(z.string()),
  sku: opt(z.string()),
  category: opt(z.string()),
  price: opt(z.number()),
  cost: opt(z.number()),
  stock: opt(z.number().int()),
  specs: opt(z.string()),
  description: opt(z.string()),
};

function tool<S extends z.ZodRawShape>(
  name: string,
  description: string,
  shape: S,
  run: (input: z.infer<z.ZodObject<S>>) => unknown,
): AgentTool {
  return {
    name,
    description,
    schema: z.object(shape) as unknown as z.ZodObject<z.ZodRawShape>,
    run: run as AgentTool["run"],
  };
}

export const ASSISTANT_ROLE = `You are UNU AI, the personal business assistant of the owner of UNU, a guitar brand. You help run the business day to day: leads and dealers, sales tracking, sales prep, marketing planning and copy, product descriptions, the website, and anything else a small brand owner needs.

How you work:
- You have tools that read and change the owner's real business data (leads, sales, products, tasks, content plan, website pages, brand knowledge). Use them instead of guessing. When the owner tells you something worth keeping (a new lead, a sale, a fact about the brand, a decision), save it with the right tool without being asked, and say briefly what you saved.
- When you learn something lasting about the brand, products, customers or preferences, store it with remember_brand_fact so you know it next time.
- Use web_search for market research, finding dealers/shops/artists, competitor checks and trends. Say where facts came from.
- Be concise and practical, like a sharp colleague. Lead with the answer or the action. Use short Markdown lists when helpful.
- Reply in the language the owner writes in (Romanian or English).
- Ask before deleting anything. Never invent sales numbers, prices or contact details.`;

export const VOICE_ADDENDUM = `
You are speaking on a phone call or voice chat right now. Answer in short, natural spoken sentences (2 to 4 sentences), with no Markdown, lists, links or emojis. Spell out numbers naturally.`;

export function assistantTools(): AgentTool[] {
  const tools: AgentTool[] = [
    tool("business_overview", "Snapshot of the business: revenue, pipeline by status, follow-ups due, open tasks, upcoming content.", {}, () => ({
      sales: repo.salesSummary(),
      pipeline: repo.pipelineSummary(),
      follow_ups_due: repo.followUpsDue().map((l) => ({ id: l.id, name: l.name, company: l.company, due: l.next_follow_up, status: l.status })),
      open_tasks: repo.listTasks().filter((t) => t.status !== "done").slice(0, 15),
      upcoming_content: repo.listContent().filter((c) => c.status !== "published").slice(0, 10).map((c) => ({ id: c.id, title: c.title, channel: c.channel, status: c.status, scheduled_for: c.scheduled_for })),
    })),

    // Leads
    tool("search_leads", "Search leads (customers, dealers, artists, distributors, press). All filters optional.", {
      q: opt(z.string().describe("Free text: name, company, city, country, notes")),
      status: opt(z.enum(repo.LEAD_STATUSES)),
      kind: opt(z.enum(repo.LEAD_KINDS)),
    }, (i) => repo.listLeads(i).slice(0, 50)),
    tool("get_lead", "Full lead record with activity history and saved documents.", { id: z.number().int() }, ({ id }) => {
      const lead = repo.getLead(id);
      if (!lead) throw new Error(`No lead #${id}`);
      return { lead, activities: repo.listActivities(id), documents: repo.listDocuments({ lead_id: id }).map((d) => ({ id: d.id, kind: d.kind, title: d.title, created_at: d.created_at })) };
    }),
    tool("create_lead", "Add a new lead.", { ...leadFields, name: z.string() }, (i) => ({ id: repo.addLead(i) })),
    tool("update_lead", "Update fields on a lead (status, follow-up date, notes, contact details...).", { id: z.number().int(), ...leadFields }, ({ id, ...f }) => {
      repo.updateLead(id, f);
      return { ok: true };
    }),
    tool("log_activity", "Log an interaction with a lead (call, email, meeting, message, note).", {
      lead_id: z.number().int(),
      kind: z.enum(["call", "email", "meeting", "message", "note"]),
      note: z.string(),
    }, (i) => ({ id: repo.addActivity(i) })),

    // Products
    tool("list_products", "List all products with price, stock and specs.", {}, () => repo.listProducts()),
    tool("create_product", "Add a product (guitar model, accessory, etc.).", { ...productFields, name: z.string() }, (i) => ({ id: repo.addProduct(i) })),
    tool("update_product", "Update a product, e.g. stock, price or its saved description.", { id: z.number().int(), ...productFields }, ({ id, ...f }) => {
      repo.updateProduct(id, f);
      return { ok: true };
    }),

    // Sales
    tool("record_sale", "Record a sale, order or quote. Reduces stock for the product unless it is a quote.", {
      amount: z.number().describe("Total amount"),
      currency: opt(z.string()),
      quantity: opt(z.number().int()),
      product_id: opt(z.number().int()),
      lead_id: opt(z.number().int()),
      description: opt(z.string()),
      channel: opt(z.enum(repo.SALE_CHANNELS)),
      status: opt(z.enum(repo.SALE_STATUSES)),
      sold_at: opt(date),
    }, (i) => ({ id: repo.addSale(i) })),
    tool("update_sale", "Change a sale's status or details.", {
      id: z.number().int(),
      status: opt(z.enum(repo.SALE_STATUSES)),
      amount: opt(z.number()),
      sold_at: opt(date),
      description: opt(z.string()),
    }, ({ id, ...f }) => {
      repo.updateSale(id, f);
      return { ok: true };
    }),
    tool("list_sales", "List sales, optionally between two dates.", { from: opt(date), to: opt(date) }, (i) => repo.listSales(i).slice(0, 100)),
    tool("sales_summary", "Revenue this month, last month, this year, by channel, by product and per month.", {}, () => repo.salesSummary()),

    // Tasks
    tool("list_tasks", "List tasks (marketing, sales, website, product, admin).", {
      status: opt(z.enum(repo.TASK_STATUSES)),
      area: opt(z.enum(repo.TASK_AREAS)),
    }, (i) => repo.listTasks(i)),
    tool("create_tasks", "Create one or more tasks, e.g. a marketing plan broken into steps.", {
      tasks: z.array(z.object({ title: z.string(), area: opt(z.enum(repo.TASK_AREAS)), due_date: opt(date), notes: opt(z.string()) })),
    }, ({ tasks }) => ({ ids: tasks.map((t) => repo.addTask(t)) })),
    tool("update_task", "Update a task (mark done, change due date...).", {
      id: z.number().int(),
      title: opt(z.string()),
      status: opt(z.enum(repo.TASK_STATUSES)),
      due_date: opt(date),
      notes: opt(z.string()),
    }, ({ id, ...f }) => {
      repo.updateTask(id, f);
      return { ok: true };
    }),

    // Content plan
    tool("list_content", "List the content plan (posts, emails, ads...).", {
      status: opt(z.enum(repo.CONTENT_STATUSES)),
      channel: opt(z.enum(repo.CONTENT_CHANNELS)),
    }, (i) => repo.listContent(i)),
    tool("save_content", "Add posts/emails/ads to the content plan. Write the full ready-to-post text in body.", {
      items: z.array(z.object({
        title: z.string(),
        channel: z.enum(repo.CONTENT_CHANNELS),
        body: z.string(),
        status: opt(z.enum(repo.CONTENT_STATUSES)),
        scheduled_for: opt(date),
        product_id: opt(z.number().int()),
      })),
    }, ({ items }) => ({ ids: items.map((c) => repo.addContent(c)) })),
    tool("update_content", "Edit a content item (text, status, date).", {
      id: z.number().int(),
      title: opt(z.string()),
      body: opt(z.string()),
      status: opt(z.enum(repo.CONTENT_STATUSES)),
      scheduled_for: opt(date),
    }, ({ id, ...f }) => {
      repo.updateContent(id, f);
      return { ok: true };
    }),

    // Brand knowledge
    tool("remember_brand_fact", "Save a lasting fact about the brand, products, customers, suppliers or the owner's preferences to the knowledge base.", {
      title: z.string(),
      category: z.enum(["brand", "product", "customers", "marketing", "sales", "operations", "preferences"]),
      content: z.string(),
    }, (i) => ({ id: repo.addKnowledge(i) })),
    tool("update_brand_fact", "Correct or extend an existing knowledge base entry.", {
      id: z.number().int(),
      content: z.string(),
    }, ({ id, content }) => {
      repo.updateKnowledge(id, { content });
      return { ok: true };
    }),
    tool("list_brand_facts", "List knowledge base entries with their ids.", {}, () => repo.listKnowledge().map((k) => ({ id: k.id, title: k.title, category: k.category }))),
    tool("update_brand_profile", "Update the brand profile fields.", {
      brand_name: opt(z.string()),
      brand_story: opt(z.string()),
      products_overview: opt(z.string()),
      audience: opt(z.string()),
      voice: opt(z.string()),
      channels: opt(z.string()),
      goals: opt(z.string()),
    }, (i) => {
      repo.setSettings(Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined)) as Record<string, string>);
      return { ok: true };
    }),

    // Documents
    tool("save_document", "Save a longer piece of work (sales brief, pitch, plan, report, email draft), optionally linked to a lead.", {
      kind: z.enum(["sales_brief", "outreach", "plan", "report", "description", "other"]),
      title: z.string(),
      content: z.string().describe("Markdown"),
      lead_id: opt(z.number().int()),
    }, (i) => ({ id: repo.addDocument(i) })),

    // Website
    tool("list_website_pages", "List website pages with slug and published state.", {}, () => repo.listPages().map((p) => ({ id: p.id, slug: p.slug, title: p.title, published: Boolean(p.published), updated_at: p.updated_at }))),
    tool("build_website_page", "Design and save a complete new website page from a brief (e.g. home page, product page for a model, dealer page).", {
      slug: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string(),
      brief: z.string(),
    }, async (i) => ({ id: await buildPage(i), preview_url: `/website` })),
    tool("edit_website_page", "Change an existing website page following an instruction.", {
      id: z.number().int(),
      instruction: z.string(),
    }, async ({ id, instruction }) => {
      await editPage(id, instruction);
      return { ok: true };
    }),
  ];

  if (phoneConfigured()) {
    tools.push(
      tool("call_owner", "Phone the owner now, e.g. to read a briefing or remind them of something. They can talk back to you on the call.", {
        opening: z.string().describe("What to say when they pick up (spoken, short)"),
      }, async ({ opening }) => placeCall(opening)),
    );
  }
  return tools;
}
