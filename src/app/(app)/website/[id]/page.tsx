import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import SubmitButton from "@/components/SubmitButton";
import CopyButton from "@/components/CopyButton";
import { getDict } from "@/lib/i18n";
import { deletePageAction, editPageAction, savePageHtml, togglePublish } from "../../actions";

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = repo.getPage(Number(id));
  if (!page) notFound();
  const T = getDict();
  const t = T.website;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/website" className="text-sm text-muted hover:underline">{t.back}</Link>
          <h1 className="h1 mt-1">{page.title} <span className="text-base font-normal text-muted">/site/{page.slug}</span></h1>
        </div>
        <div className="flex gap-2">
          {page.published ? <a className="btn" href={`/site/${page.slug}`} target="_blank" rel="noreferrer">{t.openLive}</a> : null}
          <form action={togglePublish}><input type="hidden" name="id" value={page.id} /><button className={page.published ? "btn" : "btn-primary"}>{page.published ? t.unpublish : t.publish}</button></form>
        </div>
      </div>

      <form action={editPageAction} className="card flex flex-wrap gap-2 p-3">
        <input type="hidden" name="id" value={page.id} />
        <input name="instruction" required className="input flex-1" placeholder={t.editPh} />
        <SubmitButton pendingText={t.applyPending}>{t.apply}</SubmitButton>
      </form>

      <div className="card overflow-hidden p-0">
        <iframe title="Preview" srcDoc={page.html} sandbox="" className="h-[70vh] w-full bg-white" />
      </div>

      <details className="card">
        <summary className="cursor-pointer font-medium">{t.editHtml}</summary>
        <form action={savePageHtml} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={page.id} />
          <input name="title" defaultValue={page.title} className="input" />
          <textarea name="html" rows={20} defaultValue={page.html} className="input font-mono text-xs" />
          <div className="flex gap-2"><button className="btn-primary">{t.saveHtml}</button><CopyButton text={page.html} label={t.copyHtml} doneLabel={T.common.copied} /></div>
        </form>
      </details>
      <form action={deletePageAction}><input type="hidden" name="id" value={page.id} /><button className="text-sm text-red-600 hover:underline">{t.deleteBtn}</button></form>
    </div>
  );
}
