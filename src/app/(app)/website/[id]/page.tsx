import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import SubmitButton from "@/components/SubmitButton";
import CopyButton from "@/components/CopyButton";
import { deletePageAction, editPageAction, savePageHtml, togglePublish } from "../../actions";

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = repo.getPage(Number(id));
  if (!page) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/website" className="text-sm text-muted hover:underline">← Website</Link>
          <h1 className="h1 mt-1">{page.title} <span className="text-base font-normal text-muted">/site/{page.slug}</span></h1>
        </div>
        <div className="flex gap-2">
          {page.published ? <a className="btn" href={`/site/${page.slug}`} target="_blank" rel="noreferrer">Open live page ↗</a> : null}
          <form action={togglePublish}><input type="hidden" name="id" value={page.id} /><button className={page.published ? "btn" : "btn-primary"}>{page.published ? "Unpublish" : "Publish"}</button></form>
        </div>
      </div>

      <form action={editPageAction} className="card flex flex-wrap gap-2 p-3">
        <input type="hidden" name="id" value={page.id} />
        <input name="instruction" required className="input flex-1" placeholder="Tell the AI what to change: darker theme, add a section about the new model, translate to Romanian..." />
        <SubmitButton pendingText="Updating page...">Apply change</SubmitButton>
      </form>

      <div className="card overflow-hidden p-0">
        <iframe title="Preview" srcDoc={page.html} sandbox="" className="h-[70vh] w-full bg-white" />
      </div>

      <details className="card">
        <summary className="cursor-pointer font-medium">Edit HTML</summary>
        <form action={savePageHtml} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={page.id} />
          <input name="title" defaultValue={page.title} className="input" />
          <textarea name="html" rows={20} defaultValue={page.html} className="input font-mono text-xs" />
          <div className="flex gap-2"><button className="btn-primary">Save HTML</button><CopyButton text={page.html} label="Copy HTML" /></div>
        </form>
      </details>
      <form action={deletePageAction}><input type="hidden" name="id" value={page.id} /><button className="text-sm text-red-600 hover:underline">Delete page</button></form>
    </div>
  );
}
