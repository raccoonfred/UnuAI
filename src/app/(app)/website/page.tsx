import Link from "next/link";
import * as repo from "@/lib/repo";
import SubmitButton from "@/components/SubmitButton";
import { buildPageAction } from "../actions";

const TEMPLATES = [
  { slug: "home", title: "Home", brief: "Home page: hero with the brand promise, featured models, the craft/story, artist quotes, dealer CTA, newsletter signup, footer with socials." },
  { slug: "about", title: "Our story", brief: "The story of the brand and the people, how the guitars are made, materials and values." },
  { slug: "dealers", title: "Become a dealer", brief: "Page for music shops: why stock the brand, margins/terms overview, support, how to apply (contact form placeholder)." },
  { slug: "artists", title: "Artists", brief: "Artist roster page and how to apply for an endorsement." },
];

export default function WebsitePage() {
  const pages = repo.listPages();
  return (
    <div className="space-y-6">
      <h1 className="h1">Website</h1>
      <p className="text-sm text-muted">Build and edit pages with AI. Published pages are live at <code>/site/&lt;slug&gt;</code>; you can also copy the HTML into your current website.</p>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Page</th><th>Address</th><th>State</th><th>Updated</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td><Link className="font-medium hover:underline" href={`/website/${p.id}`}>{p.title}</Link></td>
                <td><code>/site/{p.slug}</code></td>
                <td>{p.published ? <span className="badge bg-emerald-100 text-emerald-800">live</span> : <span className="badge">draft</span>}</td>
                <td>{p.updated_at}</td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted">No pages yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form action={buildPageAction} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">Create a page</h2>
        <div><label className="label">Title</label><input name="title" required className="input" placeholder="Home" /></div>
        <div><label className="label">Address (slug)</label><input name="slug" required pattern="[a-z0-9-]+" className="input" placeholder="home" /></div>
        <div className="sm:col-span-2"><label className="label">What should be on it?</label><textarea name="brief" rows={4} required className="input" /></div>
        <div className="sm:col-span-2"><SubmitButton pendingText="Designing (1-2 minutes)...">Build page</SubmitButton></div>
      </form>

      <div>
        <h2 className="h2 mb-2">Quick starts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <form key={t.slug} action={buildPageAction} className="card space-y-2 p-4">
              <input type="hidden" name="slug" value={t.slug} />
              <input type="hidden" name="title" value={t.title} />
              <input type="hidden" name="brief" value={t.brief} />
              <div className="font-medium">{t.title}</div>
              <p className="text-xs text-muted">{t.brief}</p>
              <SubmitButton className="btn w-full" pendingText="Designing...">Build</SubmitButton>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
