import Link from "next/link";
import * as repo from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { phoneConfigured } from "@/lib/phone";
import SubmitButton from "@/components/SubmitButton";
import { addKnowledgeAction, deleteKnowledgeAction, learnFromUrl, saveBrandProfile, updateKnowledgeAction } from "../actions";

const CATEGORIES = ["brand", "product", "customers", "marketing", "sales", "operations", "preferences"];

export default function BrandPage() {
  const s = repo.getSettings();
  const knowledge = repo.listKnowledge();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Brand brain</h1>
        <p className="text-sm text-muted">Everything here is given to the assistant on every request, so its answers, posts and pages sound like UNU. It also adds to the knowledge base itself when you tell it things in chat.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Status ok={aiConfigured()} label="AI connected" hint="Set ANTHROPIC_API_KEY" />
        <Status ok={phoneConfigured()} label="Phone calls" hint="Set Twilio keys, PUBLIC_BASE_URL and your phone below" />
        <Status ok={Boolean(process.env.APP_PASSWORD)} label="Password protected" hint="Set APP_PASSWORD before putting it online" />
      </div>

      <form action={saveBrandProfile} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">Brand profile</h2>
        {repo.BRAND_FIELDS.map((f) => {
          const long = !["brand_name", "owner_name", "owner_phone", "language"].includes(f.key);
          return (
            <div key={f.key} className={long ? "sm:col-span-2" : ""}>
              <label className="label">{f.label}</label>
              {long ? (
                <textarea name={f.key} rows={3} defaultValue={s[f.key] ?? ""} placeholder={f.placeholder} className="input" />
              ) : (
                <input name={f.key} defaultValue={s[f.key] ?? ""} placeholder={f.placeholder} className="input" />
              )}
            </div>
          );
        })}
        <div className="sm:col-span-2"><button className="btn-primary">Save profile</button></div>
      </form>

      <div className="card space-y-3">
        <h2 className="h2">Teach it</h2>
        <form action={learnFromUrl} className="flex flex-wrap gap-2">
          <input name="url" type="url" required className="input flex-1" placeholder="Paste a link: your website, a product page, an article or interview about UNU" />
          <SubmitButton pendingText="Reading...">Learn from link</SubmitButton>
        </form>
        <p className="text-sm text-muted">Or open the <Link href="/assistant" className="text-accent underline">assistant</Link> and say “interview me about the brand”.</p>
        <form action={addKnowledgeAction} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-4">
          <input name="title" required className="input sm:col-span-2" placeholder="Fact title, e.g. Warranty" />
          <select name="category" className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <button className="btn">Add fact</button>
          <textarea name="content" required rows={2} className="input sm:col-span-4" placeholder="The fact itself" />
        </form>
      </div>

      <div className="space-y-2">
        <h2 className="h2">Knowledge base ({knowledge.length})</h2>
        {knowledge.map((k) => (
          <details key={k.id} className="card p-4">
            <summary className="cursor-pointer"><span className="badge mr-2">{k.category}</span><span className="font-medium">{k.title}</span></summary>
            <form action={updateKnowledgeAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={k.id} />
              <div className="grid gap-2 sm:grid-cols-3">
                <input name="title" defaultValue={k.title} className="input sm:col-span-2" />
                <select name="category" defaultValue={k.category} className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </div>
              <textarea name="content" defaultValue={k.content} rows={4} className="input" />
              <button className="btn">Save</button>
            </form>
            <form action={deleteKnowledgeAction} className="mt-2"><input type="hidden" name="id" value={k.id} /><button className="text-xs text-red-600 hover:underline">Delete</button></form>
          </details>
        ))}
        {knowledge.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
      </div>
    </div>
  );
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className={`card p-3 text-sm ${ok ? "" : "border-amber-300"}`}>
      <div className="font-medium">{ok ? "✓" : "○"} {label}</div>
      {!ok && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
