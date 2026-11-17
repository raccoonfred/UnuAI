"use client";
import { useActionState, useState } from "react";
import { findLeads, importCandidate, type Candidate } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

export default function LeadFinder() {
  const [state, action] = useActionState(findLeads, { candidates: [] as Candidate[] });
  const [added, setAdded] = useState<Record<string, number>>({});

  return (
    <div className="space-y-4">
      <form action={action} className="card grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Who</label>
          <input name="what" className="input" defaultValue="independent guitar shops" placeholder="guitar shops, luthier-friendly stores, session guitarists, music schools..." />
        </div>
        <div>
          <label className="label">Where</label>
          <input name="where" className="input" defaultValue="Romania" />
        </div>
        <div>
          <label className="label">How many</label>
          <input name="count" type="number" min={1} max={25} defaultValue={10} className="input" />
        </div>
        <div className="sm:col-span-4"><SubmitButton pendingText="Searching the web (about a minute)...">Find leads</SubmitButton></div>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {state.candidates.map((c, i) => {
          const key = `${c.name}-${i}`;
          return (
            <div key={key} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.company || c.name}</div>
                  <div className="text-xs text-muted">{[c.kind, c.city, c.country].filter(Boolean).join(" · ")}</div>
                </div>
                {added[key] ? (
                  <a href={`/leads/${added[key]}`} className="btn px-2 py-1 text-xs">Added ✓</a>
                ) : (
                  <button className="btn-primary px-2 py-1 text-xs" onClick={async () => {
                    const id = await importCandidate(c);
                    setAdded((a) => ({ ...a, [key]: id }));
                  }}>Add</button>
                )}
              </div>
              <p className="text-sm">{c.why}</p>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                {c.website && <a className="underline" href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">website</a>}
                {c.instagram && <span>{c.instagram}</span>}
                {c.email && <span>{c.email}</span>}
                {c.phone && <span>{c.phone}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
