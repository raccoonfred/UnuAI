import Link from "next/link";
import LeadFinder from "./LeadFinder";

export default function FindLeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-muted hover:underline">← Leads</Link>
        <h1 className="h1 mt-1">Find new leads</h1>
        <p className="text-sm text-muted">The assistant searches the web for shops, dealers, artists and partners that fit UNU. Review them and add the good ones.</p>
      </div>
      <LeadFinder />
    </div>
  );
}
