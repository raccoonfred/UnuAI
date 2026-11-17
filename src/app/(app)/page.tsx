import Link from "next/link";
import * as repo from "@/lib/repo";
import { eur, Badge } from "@/lib/format";
import { phoneConfigured } from "@/lib/phone";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { dailyBriefing, callMeWithBriefing, setTaskStatus } from "./actions";

export default function Dashboard() {
  const s = repo.salesSummary();
  const pipeline = repo.pipelineSummary();
  const openValue = pipeline.filter((p) => !["won", "lost"].includes(p.status)).reduce((a, p) => a + (p.value ?? 0), 0);
  const openLeads = pipeline.filter((p) => !["won", "lost"].includes(p.status)).reduce((a, p) => a + p.n, 0);
  const followUps = repo.followUpsDue();
  const tasks = repo.listTasks().filter((t) => t.status !== "done").slice(0, 8);
  const content = repo.listContent().filter((c) => c.status !== "published").slice(0, 6);
  const briefing = repo.listDocuments({ kind: "report" })[0];
  const max = Math.max(1, ...s.monthly.map((m) => m.revenue));
  const brand = repo.getSettings().brand_name || "UNU";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{brand} dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <form action={dailyBriefing}><SubmitButton pendingText="Writing briefing...">Daily briefing</SubmitButton></form>
          {phoneConfigured() && (
            <form action={callMeWithBriefing}><SubmitButton className="btn" pendingText="Calling...">Call me with it</SubmitButton></form>
          )}
          <Link href="/assistant" className="btn">Ask the assistant</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue this month" value={eur(s.revenueThisMonth)} sub={`Last month ${eur(s.revenueLastMonth)}`} />
        <Stat label="Revenue this year" value={eur(s.revenueYear)} sub={`${s.unitsThisMonth} units this month`} />
        <Stat label="Open pipeline" value={eur(openValue)} sub={`${openLeads} open leads`} />
        <Stat label="Open quotes" value={eur(s.openQuotes)} sub={`${followUps.length} follow-ups due`} />
      </div>

      {briefing && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h2">{briefing.title}</h2>
            <span className="text-xs text-muted">{briefing.created_at}</span>
          </div>
          <Markdown text={briefing.content} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 mb-3">Follow-ups due</h2>
          {followUps.length === 0 ? <p className="text-sm text-muted">Nothing due. Nice.</p> : (
            <ul className="divide-y divide-border">
              {followUps.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">{l.name}{l.company ? ` · ${l.company}` : ""}</Link>
                  <span className="flex items-center gap-2"><Badge value={l.status} /><span className="text-muted">{l.next_follow_up}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="h2 mb-3">Open tasks</h2>
          {tasks.length === 0 ? <p className="text-sm text-muted">No open tasks. Plan some in <Link className="text-accent underline" href="/marketing">Marketing</Link>.</p> : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{t.title} <span className="text-xs text-muted">· {t.area}{t.due_date ? ` · ${t.due_date}` : ""}</span></span>
                  <form action={setTaskStatus}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="status" value="done" />
                    <button className="btn px-2 py-1 text-xs">Done</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="h2 mb-3">Revenue, last 12 months</h2>
          {s.monthly.length === 0 ? <p className="text-sm text-muted">No sales recorded yet.</p> : (
            <div className="flex h-40 items-end gap-2">
              {s.monthly.map((m) => (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1" title={`${m.month}: ${eur(m.revenue)}`}>
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t bg-accent" style={{ height: `${(m.revenue / max) * 100}%`, minHeight: 2 }} />
                  </div>
                  <span className="text-[10px] text-muted">{m.month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="h2 mb-3">Coming up in content</h2>
          {content.length === 0 ? <p className="text-sm text-muted">The content plan is empty.</p> : (
            <ul className="divide-y divide-border">
              {content.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/marketing/${c.id}`} className="hover:underline">{c.title}</Link>
                  <span className="flex items-center gap-2 text-xs text-muted">{c.channel} {c.scheduled_for} <Badge value={c.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
