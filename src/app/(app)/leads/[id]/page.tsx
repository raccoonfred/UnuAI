import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import { Badge } from "@/lib/format";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import LeadFields from "@/components/LeadFields";
import {
  addActivityAction, deleteDocumentAction, deleteLeadAction, generateOutreach, generateSalesBrief, setLeadStatus, updateLeadAction,
} from "../../actions";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = repo.getLead(Number(id));
  if (!lead) notFound();
  const activities = repo.listActivities(lead.id);
  const docs = repo.listDocuments({ lead_id: lead.id });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-muted hover:underline">← Leads</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="h1">{lead.name}</h1>
          {lead.company && <span className="text-muted">{lead.company}</span>}
          <Badge value={lead.status} />
          <span className="badge">{lead.kind}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {repo.LEAD_STATUSES.map((s) => (
            <form key={s} action={setLeadStatus}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="status" value={s} />
              <button className={`btn px-2 py-1 text-xs capitalize ${lead.status === s ? "border-accent text-accent" : ""}`}>{s}</button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="h2">Sales prep</h2>
          <form action={generateSalesBrief} className="space-y-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            <input name="goal" className="input" placeholder="Goal for the next talk, e.g. get them to stock 2 guitars" />
            <SubmitButton pendingText="Researching and writing...">Prepare sales brief</SubmitButton>
          </form>
          <form action={generateOutreach} className="space-y-2 border-t border-border pt-4">
            <input type="hidden" name="lead_id" value={lead.id} />
            <div className="grid grid-cols-2 gap-2">
              <select name="channel" className="input">
                <option value="email">Email</option>
                <option value="Instagram DM">Instagram DM</option>
                <option value="WhatsApp message">WhatsApp</option>
                <option value="phone call script">Call script</option>
              </select>
              <select name="language" className="input">
                <option value="">Auto language</option>
                <option>Romanian</option>
                <option>English</option>
                <option>German</option>
              </select>
            </div>
            <input name="goal" className="input" placeholder="What should the message achieve?" />
            <SubmitButton className="btn" pendingText="Writing...">Draft outreach</SubmitButton>
          </form>
        </div>

        <div className="card space-y-3">
          <h2 className="h2">Log an interaction</h2>
          <form action={addActivityAction} className="space-y-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className="input">
                {["call", "email", "meeting", "message", "note"].map((k) => <option key={k}>{k}</option>)}
              </select>
              <input type="date" name="next_follow_up" className="input" title="Next follow-up" />
            </div>
            <textarea name="note" rows={2} required className="input" placeholder="What happened?" />
            <button className="btn">Save</button>
          </form>
          <ul className="space-y-2 border-t border-border pt-3 text-sm">
            {activities.map((a) => (
              <li key={a.id}><span className="badge mr-2">{a.kind}</span><span className="text-xs text-muted">{a.created_at.slice(0, 16)}</span><p className="mt-1">{a.note}</p></li>
            ))}
            {activities.length === 0 && <li className="text-muted">No interactions logged yet.</li>}
          </ul>
        </div>
      </div>

      {docs.map((d) => (
        <div key={d.id} className="card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="h2">{d.title}</h2>
            <form action={deleteDocumentAction}><input type="hidden" name="id" value={d.id} /><button className="text-xs text-muted hover:text-red-600">Delete</button></form>
          </div>
          <p className="mb-2 text-xs text-muted">{d.created_at}</p>
          <Markdown text={d.content} />
        </div>
      ))}

      <details className="card">
        <summary className="cursor-pointer font-medium">Edit details</summary>
        <form action={updateLeadAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={lead.id} />
          <LeadFields lead={lead} />
          <div className="sm:col-span-3"><button className="btn-primary">Save changes</button></div>
        </form>
        <form action={deleteLeadAction} className="mt-4 border-t border-border pt-4">
          <input type="hidden" name="id" value={lead.id} />
          <button className="text-sm text-red-600 hover:underline">Delete this lead</button>
        </form>
      </details>
    </div>
  );
}
