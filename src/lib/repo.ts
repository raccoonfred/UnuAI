import { db } from "./db";

export const LEAD_KINDS = ["customer", "dealer", "artist", "distributor", "press", "partner"] as const;
export const LEAD_STATUSES = ["new", "contacted", "interested", "negotiating", "won", "lost"] as const;
export const SALE_STATUSES = ["quote", "ordered", "paid", "shipped", "refunded"] as const;
export const SALE_CHANNELS = ["direct", "website", "dealer", "marketplace", "event"] as const;
export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export const TASK_AREAS = ["marketing", "sales", "website", "product", "admin"] as const;
export const CONTENT_CHANNELS = ["instagram", "tiktok", "facebook", "youtube", "email", "blog", "website", "ad"] as const;
export const CONTENT_STATUSES = ["idea", "draft", "scheduled", "published"] as const;

export type Lead = {
  id: number;
  name: string;
  company: string | null;
  kind: string;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  city: string | null;
  country: string | null;
  source: string | null;
  est_value: number;
  next_follow_up: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type Activity = { id: number; lead_id: number; kind: string; note: string; created_at: string };
export type Product = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  cost: number;
  stock: number;
  specs: string | null;
  description: string | null;
  created_at: string;
};
export type Sale = {
  id: number;
  lead_id: number | null;
  product_id: number | null;
  description: string | null;
  quantity: number;
  amount: number;
  currency: string;
  channel: string;
  status: string;
  sold_at: string;
  created_at: string;
  lead_name?: string | null;
  product_name?: string | null;
};
export type Task = {
  id: number;
  title: string;
  area: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};
export type Content = {
  id: number;
  channel: string;
  title: string;
  body: string;
  status: string;
  scheduled_for: string | null;
  product_id: number | null;
  created_at: string;
};
export type Knowledge = {
  id: number;
  title: string;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
};
export type Doc = {
  id: number;
  kind: string;
  title: string;
  content: string;
  lead_id: number | null;
  created_at: string;
};
export type Page = { id: number; slug: string; title: string; html: string; published: number; updated_at: string };

type Row = Record<string, unknown>;

/** Builds "a = @a, b = @b" for the keys present in `fields`, restricted to `allowed`. */
function updateClause(fields: Row, allowed: readonly string[]) {
  const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
  return { keys, sql: keys.map((k) => `${k} = @${k}`).join(", ") };
}

function insert(table: string, fields: Row, allowed: readonly string[]): number {
  const keys = Object.keys(fields).filter((k) => allowed.includes(k) && fields[k] !== undefined);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map((k) => "@" + k).join(", ")})`;
  const params = Object.fromEntries(keys.map((k) => [k, fields[k]]));
  return Number(db().prepare(sql).run(params).lastInsertRowid);
}

function update(table: string, id: number, fields: Row, allowed: readonly string[], touch = false) {
  const { keys, sql } = updateClause(fields, allowed);
  if (keys.length === 0) return;
  const params = { ...Object.fromEntries(keys.map((k) => [k, fields[k]])), id };
  db()
    .prepare(`UPDATE ${table} SET ${sql}${touch ? ", updated_at = datetime('now')" : ""} WHERE id = @id`)
    .run(params);
}

// ---------- settings / brand ----------

export const BRAND_FIELDS = [
  { key: "brand_name", label: "Brand name", placeholder: "UNU" },
  { key: "brand_story", label: "Story and mission", placeholder: "Who you are, why UNU exists, what makes the guitars special" },
  { key: "products_overview", label: "Product line", placeholder: "Models, price ranges, woods, pickups, what is custom" },
  { key: "audience", label: "Target customers", placeholder: "Players, styles, countries, dealers you want" },
  { key: "voice", label: "Brand voice", placeholder: "How UNU talks: tone, words to use and avoid" },
  { key: "channels", label: "Channels and links", placeholder: "Website, Instagram, TikTok, shops, marketplaces" },
  { key: "goals", label: "Current goals", placeholder: "e.g. 10 dealers in EU by summer, launch new model in March" },
  { key: "owner_name", label: "Your name", placeholder: "How the assistant should address you" },
  { key: "owner_phone", label: "Your phone (for calls)", placeholder: "+40..." },
  { key: "language", label: "Preferred language", placeholder: "Romanian, English, or both" },
] as const;

export function getSettings(): Record<string, string> {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function setSettings(values: Record<string, string>) {
  const stmt = db().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const tx = db().transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) stmt.run(k, v);
  });
  tx(Object.entries(values));
}

// ---------- knowledge ----------

export function listKnowledge(): Knowledge[] {
  return db().prepare("SELECT * FROM knowledge ORDER BY category, title").all() as Knowledge[];
}
export function addKnowledge(k: { title: string; category?: string; content: string }) {
  return insert("knowledge", k, ["title", "category", "content"]);
}
export function updateKnowledge(id: number, k: Partial<Knowledge>) {
  update("knowledge", id, k, ["title", "category", "content"], true);
}
export function deleteKnowledge(id: number) {
  db().prepare("DELETE FROM knowledge WHERE id = ?").run(id);
}

// ---------- products ----------

const PRODUCT_COLS = ["name", "sku", "category", "price", "cost", "stock", "specs", "description"] as const;
export function listProducts(): Product[] {
  return db().prepare("SELECT * FROM products ORDER BY name").all() as Product[];
}
export function getProduct(id: number): Product | undefined {
  return db().prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}
export function addProduct(p: Partial<Product> & { name: string }) {
  return insert("products", p, PRODUCT_COLS);
}
export function updateProduct(id: number, p: Partial<Product>) {
  update("products", id, p, PRODUCT_COLS);
}
export function deleteProduct(id: number) {
  db().prepare("DELETE FROM products WHERE id = ?").run(id);
}

// ---------- leads ----------

const LEAD_COLS = [
  "name", "company", "kind", "status", "email", "phone", "website", "instagram",
  "city", "country", "source", "est_value", "next_follow_up", "notes",
] as const;

export function listLeads(filter: { status?: string; kind?: string; q?: string } = {}): Lead[] {
  const where: string[] = [];
  const params: Row = {};
  if (filter.status) { where.push("status = @status"); params.status = filter.status; }
  if (filter.kind) { where.push("kind = @kind"); params.kind = filter.kind; }
  if (filter.q) {
    where.push("(name LIKE @q OR company LIKE @q OR city LIKE @q OR country LIKE @q OR notes LIKE @q)");
    params.q = `%${filter.q}%`;
  }
  const sql = `SELECT * FROM leads ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC`;
  return db().prepare(sql).all(params) as Lead[];
}
export function getLead(id: number): Lead | undefined {
  return db().prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
}
export function addLead(l: Partial<Lead> & { name: string }) {
  return insert("leads", l, LEAD_COLS);
}
export function updateLead(id: number, l: Partial<Lead>) {
  update("leads", id, l, LEAD_COLS, true);
}
export function deleteLead(id: number) {
  db().prepare("DELETE FROM leads WHERE id = ?").run(id);
}
export function followUpsDue(): Lead[] {
  return db()
    .prepare(
      "SELECT * FROM leads WHERE next_follow_up IS NOT NULL AND next_follow_up <= date('now', '+2 days') AND status NOT IN ('won','lost') ORDER BY next_follow_up",
    )
    .all() as Lead[];
}

export function listActivities(leadId: number): Activity[] {
  return db().prepare("SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC").all(leadId) as Activity[];
}
export function addActivity(a: { lead_id: number; kind?: string; note: string }) {
  const id = insert("activities", a, ["lead_id", "kind", "note"]);
  db().prepare("UPDATE leads SET updated_at = datetime('now') WHERE id = ?").run(a.lead_id);
  return id;
}

// ---------- sales ----------

const SALE_COLS = ["lead_id", "product_id", "description", "quantity", "amount", "currency", "channel", "status", "sold_at"] as const;
export function listSales(filter: { from?: string; to?: string } = {}): Sale[] {
  const where: string[] = [];
  const params: Row = {};
  if (filter.from) { where.push("s.sold_at >= @from"); params.from = filter.from; }
  if (filter.to) { where.push("s.sold_at <= @to"); params.to = filter.to; }
  return db()
    .prepare(
      `SELECT s.*, l.name AS lead_name, p.name AS product_name FROM sales s
       LEFT JOIN leads l ON l.id = s.lead_id LEFT JOIN products p ON p.id = s.product_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY s.sold_at DESC, s.id DESC`,
    )
    .all(params) as Sale[];
}
export function addSale(s: Partial<Sale>) {
  const id = insert("sales", s, SALE_COLS);
  if (s.product_id && s.status !== "quote" && s.status !== "refunded") {
    db().prepare("UPDATE products SET stock = MAX(stock - ?, 0) WHERE id = ?").run(s.quantity ?? 1, s.product_id);
  }
  return id;
}
export function updateSale(id: number, s: Partial<Sale>) {
  update("sales", id, s, SALE_COLS);
}
export function deleteSale(id: number) {
  db().prepare("DELETE FROM sales WHERE id = ?").run(id);
}

export type SalesSummary = {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueYear: number;
  unitsThisMonth: number;
  openQuotes: number;
  byChannel: { channel: string; revenue: number }[];
  byProduct: { product: string; units: number; revenue: number }[];
  monthly: { month: string; revenue: number }[];
};

export function salesSummary(): SalesSummary {
  const d = db();
  const counted = "status IN ('ordered','paid','shipped')";
  const one = (sql: string) => (d.prepare(sql).get() as { v: number | null }).v ?? 0;
  return {
    revenueThisMonth: one(`SELECT SUM(amount) v FROM sales WHERE ${counted} AND sold_at >= date('now','start of month')`),
    revenueLastMonth: one(
      `SELECT SUM(amount) v FROM sales WHERE ${counted} AND sold_at >= date('now','start of month','-1 month') AND sold_at < date('now','start of month')`,
    ),
    revenueYear: one(`SELECT SUM(amount) v FROM sales WHERE ${counted} AND sold_at >= date('now','start of year')`),
    unitsThisMonth: one(`SELECT SUM(quantity) v FROM sales WHERE ${counted} AND sold_at >= date('now','start of month')`),
    openQuotes: one(`SELECT SUM(amount) v FROM sales WHERE status = 'quote'`),
    byChannel: d
      .prepare(`SELECT channel, SUM(amount) revenue FROM sales WHERE ${counted} GROUP BY channel ORDER BY revenue DESC`)
      .all() as SalesSummary["byChannel"],
    byProduct: d
      .prepare(
        `SELECT COALESCE(p.name, s.description, 'Other') product, SUM(s.quantity) units, SUM(s.amount) revenue
         FROM sales s LEFT JOIN products p ON p.id = s.product_id WHERE s.${counted.replace("status", "status")}
         GROUP BY product ORDER BY revenue DESC LIMIT 10`,
      )
      .all() as SalesSummary["byProduct"],
    monthly: d
      .prepare(
        `SELECT strftime('%Y-%m', sold_at) month, SUM(amount) revenue FROM sales WHERE ${counted}
         AND sold_at >= date('now','start of month','-11 months') GROUP BY month ORDER BY month`,
      )
      .all() as SalesSummary["monthly"],
  };
}

export function pipelineSummary() {
  return db()
    .prepare("SELECT status, COUNT(*) n, SUM(est_value) value FROM leads GROUP BY status")
    .all() as { status: string; n: number; value: number | null }[];
}

// ---------- tasks ----------

export function listTasks(filter: { status?: string; area?: string } = {}): Task[] {
  const where: string[] = [];
  const params: Row = {};
  if (filter.status) { where.push("status = @status"); params.status = filter.status; }
  if (filter.area) { where.push("area = @area"); params.area = filter.area; }
  return db()
    .prepare(
      `SELECT * FROM tasks ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, due_date IS NULL, due_date`,
    )
    .all(params) as Task[];
}
export function addTask(t: Partial<Task> & { title: string }) {
  return insert("tasks", t, ["title", "area", "status", "due_date", "notes"]);
}
export function updateTask(id: number, t: Partial<Task>) {
  update("tasks", id, t, ["title", "area", "status", "due_date", "notes"]);
}
export function deleteTask(id: number) {
  db().prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

// ---------- content ----------

export function listContent(filter: { status?: string; channel?: string } = {}): Content[] {
  const where: string[] = [];
  const params: Row = {};
  if (filter.status) { where.push("status = @status"); params.status = filter.status; }
  if (filter.channel) { where.push("channel = @channel"); params.channel = filter.channel; }
  return db()
    .prepare(
      `SELECT * FROM content ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY scheduled_for IS NULL, scheduled_for, created_at DESC`,
    )
    .all(params) as Content[];
}
export function getContent(id: number): Content | undefined {
  return db().prepare("SELECT * FROM content WHERE id = ?").get(id) as Content | undefined;
}
export function addContent(c: Partial<Content> & { title: string }) {
  return insert("content", c, ["channel", "title", "body", "status", "scheduled_for", "product_id"]);
}
export function updateContent(id: number, c: Partial<Content>) {
  update("content", id, c, ["channel", "title", "body", "status", "scheduled_for", "product_id"]);
}
export function deleteContent(id: number) {
  db().prepare("DELETE FROM content WHERE id = ?").run(id);
}

// ---------- documents (sales briefs, outreach drafts, reports) ----------

export function listDocuments(filter: { lead_id?: number; kind?: string } = {}): Doc[] {
  const where: string[] = [];
  const params: Row = {};
  if (filter.lead_id) { where.push("lead_id = @lead_id"); params.lead_id = filter.lead_id; }
  if (filter.kind) { where.push("kind = @kind"); params.kind = filter.kind; }
  return db()
    .prepare(`SELECT * FROM documents ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`)
    .all(params) as Doc[];
}
export function addDocument(d: { kind: string; title: string; content: string; lead_id?: number | null }) {
  return insert("documents", d, ["kind", "title", "content", "lead_id"]);
}
export function deleteDocument(id: number) {
  db().prepare("DELETE FROM documents WHERE id = ?").run(id);
}

// ---------- website pages ----------

export function listPages(): Page[] {
  return db().prepare("SELECT id, slug, title, published, updated_at, '' AS html FROM pages ORDER BY slug").all() as Page[];
}
export function getPage(id: number): Page | undefined {
  return db().prepare("SELECT * FROM pages WHERE id = ?").get(id) as Page | undefined;
}
export function getPageBySlug(slug: string): Page | undefined {
  return db().prepare("SELECT * FROM pages WHERE slug = ?").get(slug) as Page | undefined;
}
export function savePage(p: { slug: string; title: string; html: string }): number {
  const existing = getPageBySlug(p.slug);
  if (existing) {
    db()
      .prepare("UPDATE pages SET title = ?, html = ?, updated_at = datetime('now') WHERE id = ?")
      .run(p.title, p.html, existing.id);
    return existing.id;
  }
  return insert("pages", p, ["slug", "title", "html"]);
}
export function updatePage(id: number, p: Partial<Page>) {
  update("pages", id, p, ["slug", "title", "html", "published"]);
  db().prepare("UPDATE pages SET updated_at = datetime('now') WHERE id = ?").run(id);
}
export function deletePage(id: number) {
  db().prepare("DELETE FROM pages WHERE id = ?").run(id);
}

// ---------- conversations ----------

export function getConversation(id: string): unknown[] {
  const row = db().prepare("SELECT messages FROM conversations WHERE id = ?").get(id) as { messages: string } | undefined;
  return row ? (JSON.parse(row.messages) as unknown[]) : [];
}
export function saveConversation(id: string, messages: unknown[], channel = "web") {
  db()
    .prepare(
      `INSERT INTO conversations (id, channel, messages, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at`,
    )
    .run(id, channel, JSON.stringify(messages));
}
