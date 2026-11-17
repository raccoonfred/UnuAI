import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import SubmitButton from "@/components/SubmitButton";
import CopyButton from "@/components/CopyButton";
import { deleteContentAction, rewriteContent, updateContentAction } from "../../actions";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = repo.getContent(Number(id));
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/marketing" className="text-sm text-muted hover:underline">← Marketing</Link>
        <h1 className="h1 mt-1">{c.title}</h1>
      </div>
      <form action={updateContentAction} className="card space-y-3">
        <input type="hidden" name="id" value={c.id} />
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="sm:col-span-2"><label className="label">Title</label><input name="title" defaultValue={c.title} className="input" /></div>
          <div><label className="label">Channel</label><select name="channel" defaultValue={c.channel} className="input">{repo.CONTENT_CHANNELS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className="label">Status</label><select name="status" defaultValue={c.status} className="input">{repo.CONTENT_STATUSES.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label className="label">Date</label><input name="scheduled_for" type="date" defaultValue={c.scheduled_for ?? ""} className="input" /></div>
        </div>
        <textarea name="body" rows={16} defaultValue={c.body} className="input font-mono text-sm" />
        <div className="flex gap-2"><button className="btn-primary">Save</button><CopyButton text={c.body} /></div>
      </form>
      <form action={rewriteContent} className="card flex flex-wrap gap-2">
        <input type="hidden" name="id" value={c.id} />
        <input name="instruction" required className="input flex-1" placeholder="Ask AI to change it: shorter, in Romanian, funnier, add a CTA..." />
        <SubmitButton pendingText="Rewriting...">Rewrite</SubmitButton>
      </form>
      <form action={deleteContentAction}><input type="hidden" name="id" value={c.id} /><button className="text-sm text-red-600 hover:underline">Delete</button></form>
    </div>
  );
}
