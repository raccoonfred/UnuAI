import Link from "next/link";
import * as repo from "@/lib/repo";
import { Badge } from "@/lib/format";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { getDict } from "@/lib/i18n";
import { addTaskAction, deleteTaskAction, generatePost, planMarketing, setTaskStatus } from "../actions";

export default function MarketingPage() {
  const tasks = repo.listTasks();
  const content = repo.listContent();
  const products = repo.listProducts();
  const plan = repo.listDocuments({ kind: "plan" })[0];
  const T = getDict();
  const t = T.marketing;

  return (
    <div className="space-y-6">
      <h1 className="h1">{t.title}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={planMarketing} className="card space-y-3">
          <h2 className="h2">{t.planTitle}</h2>
          <p className="text-sm text-muted">{t.planIntro}</p>
          <input name="goal" className="input" placeholder={t.goalPh} required />
          <div className="flex flex-wrap gap-3 text-sm">
            {repo.CONTENT_CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-1 capitalize">
                <input type="checkbox" name="channels" value={c} defaultChecked={["instagram", "tiktok", "email"].includes(c)} /> {c}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">{t.weeks}</label><input name="weeks" type="number" min={1} max={12} defaultValue={4} className="input" /></div>
            <div><label className="label">{t.perWeek}</label><input name="per_week" type="number" min={1} max={14} defaultValue={3} className="input" /></div>
          </div>
          <SubmitButton pendingText={t.planPending}>{t.planBtn}</SubmitButton>
        </form>

        <form action={generatePost} className="card space-y-3">
          <h2 className="h2">{t.postTitle}</h2>
          <div className="grid grid-cols-2 gap-2">
            <select name="channel" className="input">{repo.CONTENT_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
            <select name="product_id" className="input"><option value="">{t.noProduct}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <textarea name="topic" rows={2} required className="input" placeholder={t.topicPh} />
          <div><label className="label">{t.scheduleFor}</label><input name="scheduled_for" type="date" className="input" /></div>
          <SubmitButton className="btn" pendingText={T.common.writing}>{t.postBtn}</SubmitButton>
        </form>
      </div>

      {plan && <details className="card"><summary className="cursor-pointer font-medium">{plan.title}</summary><Markdown text={plan.content} className="mt-2" /></details>}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <h2 className="h2 mb-3">{t.tasks}</h2>
          <form action={addTaskAction} className="mb-3 flex gap-2">
            <input name="title" required className="input" placeholder={t.newTask} />
            <input name="due_date" type="date" className="input w-36" />
            <select name="area" className="input w-28">{repo.TASK_AREAS.map((a) => <option key={a} value={a}>{T.area[a]}</option>)}</select>
            <button className="btn">{T.common.add}</button>
          </form>
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className={`flex items-start gap-2 py-2 text-sm ${task.status === "done" ? "text-muted line-through" : ""}`}>
                <form action={setTaskStatus}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="status" value={task.status === "done" ? "todo" : "done"} />
                  <button className="mt-0.5 h-4 w-4 rounded border border-stone-400" aria-label={t.toggle}>{task.status === "done" ? "✓" : ""}</button>
                </form>
                <div className="flex-1">
                  {task.title}
                  <div className="text-xs text-muted">{T.area[task.area] ?? task.area}{task.due_date ? ` · ${t.due(task.due_date)}` : ""}</div>
                  {task.notes && <div className="text-xs text-muted no-underline">{task.notes}</div>}
                </div>
                <form action={deleteTaskAction}><input type="hidden" name="id" value={task.id} /><button className="text-xs text-muted hover:text-red-600">✕</button></form>
              </li>
            ))}
            {tasks.length === 0 && <li className="text-sm text-muted">{t.noTasks}</li>}
          </ul>
        </div>

        <div className="card lg:col-span-3">
          <h2 className="h2 mb-3">{t.calendar}</h2>
          <ul className="divide-y divide-border">
            {content.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={`/marketing/${c.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                  <span><span className="text-muted">{c.scheduled_for ?? t.unscheduled}</span> · {c.title}</span>
                  <span className="flex shrink-0 items-center gap-2"><span className="badge capitalize">{c.channel}</span><Badge value={c.status} label={T.status[c.status]} /></span>
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{c.body}</p>
              </li>
            ))}
            {content.length === 0 && <li className="text-sm text-muted">{t.nothing}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
