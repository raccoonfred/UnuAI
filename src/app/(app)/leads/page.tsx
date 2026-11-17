import Link from "next/link";
import * as repo from "@/lib/repo";
import { Badge, eur } from "@/lib/format";
import { addLeadAction } from "../actions";
import LeadFields from "@/components/LeadFields";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string }> }) {
  const filter = await searchParams;
  const leads = repo.listLeads(filter);
  const pipeline = repo.pipelineSummary();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Leads</h1>
        <Link href="/leads/find" className="btn-primary">Find new leads with AI</Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {repo.LEAD_STATUSES.map((s) => {
          const p = pipeline.find((x) => x.status === s);
          return (
            <Link key={s} href={filter.status === s ? "/leads" : `/leads?status=${s}`} className={`card p-3 text-center ${filter.status === s ? "ring-2 ring-accent" : ""}`}>
              <div className="text-xs capitalize text-muted">{s}</div>
              <div className="text-lg font-semibold">{p?.n ?? 0}</div>
              <div className="text-xs text-muted">{eur(p?.value)}</div>
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={filter.q} placeholder="Search name, company, city..." className="input max-w-xs" />
        <select name="kind" defaultValue={filter.kind ?? ""} className="input w-auto">
          <option value="">All types</option>
          {repo.LEAD_KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        <button className="btn">Filter</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Location</th><th>Value</th><th>Follow-up</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td><Link className="font-medium hover:underline" href={`/leads/${l.id}`}>{l.name}</Link>{l.company && <div className="text-xs text-muted">{l.company}</div>}</td>
                <td>{l.kind}</td>
                <td><Badge value={l.status} /></td>
                <td>{[l.city, l.country].filter(Boolean).join(", ")}</td>
                <td>{l.est_value ? eur(l.est_value) : ""}</td>
                <td>{l.next_follow_up}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">No leads yet. Add one below or let the AI find some.</td></tr>}
          </tbody>
        </table>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-medium">Add a lead</summary>
        <form action={addLeadAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <LeadFields />
          <div className="sm:col-span-3"><button className="btn-primary">Add lead</button></div>
        </form>
      </details>
    </div>
  );
}
