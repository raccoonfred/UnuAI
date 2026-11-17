import Link from "next/link";
import LeadFinder from "./LeadFinder";
import { getDict } from "@/lib/i18n";

export default function FindLeadsPage() {
  const T = getDict();
  const t = T.leads;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-muted hover:underline">{t.back}</Link>
        <h1 className="h1 mt-1">{t.findTitle}</h1>
        <p className="text-sm text-muted">{t.findIntro}</p>
      </div>
      <LeadFinder t={t} kinds={T.kind} />
    </div>
  );
}
