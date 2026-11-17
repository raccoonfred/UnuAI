import * as repo from "@/lib/repo";
import type { Dict } from "@/lib/i18n";

export default function LeadFields({ lead, t, T }: { lead?: repo.Lead; t: Dict["leads"]["fields"]; T: Dict }) {
  const f = (k: keyof repo.Lead) => (lead?.[k] ?? "") as string | number;
  return (
    <>
      <div><label className="label">{t.name}</label><input name="name" required defaultValue={f("name")} className="input" /></div>
      <div><label className="label">{t.company}</label><input name="company" defaultValue={f("company")} className="input" /></div>
      <div><label className="label">{t.type}</label>
        <select name="kind" defaultValue={f("kind") || "customer"} className="input">{repo.LEAD_KINDS.map((k) => <option key={k} value={k}>{T.kind[k]}</option>)}</select></div>
      <div><label className="label">{t.status}</label>
        <select name="status" defaultValue={f("status") || "new"} className="input">{repo.LEAD_STATUSES.map((k) => <option key={k} value={k}>{T.status[k]}</option>)}</select></div>
      <div><label className="label">{t.email}</label><input name="email" type="email" defaultValue={f("email")} className="input" /></div>
      <div><label className="label">{t.phone}</label><input name="phone" defaultValue={f("phone")} className="input" /></div>
      <div><label className="label">{t.website}</label><input name="website" defaultValue={f("website")} className="input" /></div>
      <div><label className="label">{t.instagram}</label><input name="instagram" defaultValue={f("instagram")} className="input" /></div>
      <div><label className="label">{t.source}</label><input name="source" defaultValue={f("source")} className="input" placeholder={t.sourcePh} /></div>
      <div><label className="label">{t.city}</label><input name="city" defaultValue={f("city")} className="input" /></div>
      <div><label className="label">{t.country}</label><input name="country" defaultValue={f("country")} className="input" /></div>
      <div><label className="label">{t.value}</label><input name="est_value" type="number" step="any" defaultValue={f("est_value") || ""} className="input" /></div>
      <div><label className="label">{t.followUp}</label><input name="next_follow_up" type="date" defaultValue={f("next_follow_up")} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">{t.notes}</label><textarea name="notes" rows={2} defaultValue={f("notes")} className="input" /></div>
    </>
  );
}
