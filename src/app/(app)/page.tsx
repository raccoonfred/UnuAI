import Link from "next/link";
import * as repo from "@/lib/repo";
import { eur, Badge } from "@/lib/format";
import { phoneConfigured } from "@/lib/phone";
import Markdown from "@/components/Markdown";
import { getDict } from "@/lib/i18n";
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
  const T = getDict();
  const t = T.dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t.title(brand)}</h1>
        <div className="flex flex-wrap gap-2">
          <form action={dailyBriefing}><SubmitButton pendingText={t.briefingPending}>{t.briefing}</SubmitButton></form>
          {phoneConfigured() && (
            <form action={callMeWithBriefing}><SubmitButton className="btn" pendingText={t.calling}>{t.callMe}</SubmitButton></form>
          )}
          <Link href="/assistant" className="btn">{t.ask}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.revenueMonth} value={eur(s.revenueThisMonth)} sub={t.lastMonth(eur(s.revenueLastMonth))} />
        <Stat label={t.revenueYear} value={eur(s.revenueYear)} sub={t.unitsMonth(s.unitsThisMonth)} />
        <Stat label={t.openPipeline} value={eur(openValue)} sub={t.openLeads(openLeads)} />
        <Stat label={t.openQuotes} value={eur(s.openQuotes)} sub={t.followUpsCount(followUps.length)} />
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
          <h2 className="h2 mb-3">{t.followUps}</h2>
          {followUps.length === 0 ? <p className="text-sm text-muted">{t.nothingDue}</p> : (
            <ul className="divide-y divide-border">
              {followUps.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:underline">{l.name}{l.company ? ` · ${l.company}` : ""}</Link>
                  <span className="flex items-center gap-2"><Badge value={l.status} label={T.status[l.status]} /><span className="text-muted">{l.next_follow_up}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="h2 mb-3">{t.openTasks}</h2>
          {tasks.length === 0 ? <p className="text-sm text-muted">{t.noTasks} <Link className="text-accent underline" href="/marketing">{T.nav.marketing}</Link>.</p> : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{task.title} <span className="text-xs text-muted">· {T.area[task.area]}{task.due_date ? ` · ${task.due_date}` : ""}</span></span>
                  <form action={setTaskStatus}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="status" value="done" />
                    <button className="btn px-2 py-1 text-xs">{t.done}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="h2 mb-3">{t.revenue12}</h2>
          {s.monthly.length === 0 ? <p className="text-sm text-muted">{t.noSales}</p> : (
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
          <h2 className="h2 mb-3">{t.upcoming}</h2>
          {content.length === 0 ? <p className="text-sm text-muted">{t.emptyPlan}</p> : (
            <ul className="divide-y divide-border">
              {content.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/marketing/${c.id}`} className="hover:underline">{c.title}</Link>
                  <span className="flex items-center gap-2 text-xs text-muted">{c.channel} {c.scheduled_for} <Badge value={c.status} label={T.status[c.status]} /></span>
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
