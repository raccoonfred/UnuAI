import * as repo from "@/lib/repo";

export default function LeadFields({ lead }: { lead?: repo.Lead }) {
  const f = (k: keyof repo.Lead) => (lead?.[k] ?? "") as string | number;
  return (
    <>
      <div><label className="label">Name *</label><input name="name" required defaultValue={f("name")} className="input" /></div>
      <div><label className="label">Company / shop</label><input name="company" defaultValue={f("company")} className="input" /></div>
      <div><label className="label">Type</label>
        <select name="kind" defaultValue={f("kind") || "customer"} className="input">{repo.LEAD_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
      <div><label className="label">Status</label>
        <select name="status" defaultValue={f("status") || "new"} className="input">{repo.LEAD_STATUSES.map((k) => <option key={k}>{k}</option>)}</select></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={f("email")} className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={f("phone")} className="input" /></div>
      <div><label className="label">Website</label><input name="website" defaultValue={f("website")} className="input" /></div>
      <div><label className="label">Instagram</label><input name="instagram" defaultValue={f("instagram")} className="input" /></div>
      <div><label className="label">Source</label><input name="source" defaultValue={f("source")} className="input" placeholder="Instagram DM, fair, referral..." /></div>
      <div><label className="label">City</label><input name="city" defaultValue={f("city")} className="input" /></div>
      <div><label className="label">Country</label><input name="country" defaultValue={f("country")} className="input" /></div>
      <div><label className="label">Est. value (€)</label><input name="est_value" type="number" step="any" defaultValue={f("est_value") || ""} className="input" /></div>
      <div><label className="label">Next follow-up</label><input name="next_follow_up" type="date" defaultValue={f("next_follow_up")} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Notes</label><textarea name="notes" rows={2} defaultValue={f("notes")} className="input" /></div>
    </>
  );
}
