import Link from "next/link";
import * as repo from "@/lib/repo";
import SubmitButton from "@/components/SubmitButton";
import { buildPageAction } from "../actions";
import { getDict } from "@/lib/i18n";

export default function WebsitePage() {
  const pages = repo.listPages();
  const t = getDict().website;
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.title}</h1>
      <p className="text-sm text-muted">{t.intro}</p>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>{t.cols.page}</th><th>{t.cols.address}</th><th>{t.cols.state}</th><th>{t.cols.updated}</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td><Link className="font-medium hover:underline" href={`/website/${p.id}`}>{p.title}</Link></td>
                <td><code>/site/{p.slug}</code></td>
                <td>{p.published ? <span className="badge bg-emerald-100 text-emerald-800">{t.live}</span> : <span className="badge">{t.draft}</span>}</td>
                <td>{p.updated_at}</td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted">{t.empty}</td></tr>}
          </tbody>
        </table>
      </div>

      <form action={buildPageAction} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">{t.create}</h2>
        <div><label className="label">{t.cols.page}</label><input name="title" required className="input" placeholder={t.titlePh} /></div>
        <div><label className="label">{t.slug}</label><input name="slug" required pattern="[a-z0-9-]+" className="input" placeholder="home" /></div>
        <div className="sm:col-span-2"><label className="label">{t.brief}</label><textarea name="brief" rows={4} required className="input" /></div>
        <div className="sm:col-span-2"><SubmitButton pendingText={t.buildPending}>{t.build}</SubmitButton></div>
      </form>

      <div>
        <h2 className="h2 mb-2">{t.quick}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.templates.map((tpl) => (
            <form key={tpl.slug} action={buildPageAction} className="card space-y-2 p-4">
              <input type="hidden" name="slug" value={tpl.slug} />
              <input type="hidden" name="title" value={tpl.title} />
              <input type="hidden" name="brief" value={tpl.brief} />
              <div className="font-medium">{tpl.title}</div>
              <p className="text-xs text-muted">{tpl.brief}</p>
              <SubmitButton className="btn w-full" pendingText={t.designing}>{t.buildShort}</SubmitButton>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
