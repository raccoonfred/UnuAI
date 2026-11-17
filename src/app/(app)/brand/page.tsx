import Link from "next/link";
import * as repo from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { phoneConfigured } from "@/lib/phone";
import SubmitButton from "@/components/SubmitButton";
import { getDict } from "@/lib/i18n";
import { listVoices, ttsConfigured, voiceFor } from "@/lib/tts";
import VoiceTest from "@/components/VoiceTest";
import { saveVoices, addKnowledgeAction, deleteKnowledgeAction, learnFromUrl, saveBrandProfile, updateKnowledgeAction } from "../actions";


export default async function BrandPage() {
  const s = repo.getSettings();
  const knowledge = repo.listKnowledge();
  const t = getDict().brand;
  const CATEGORIES = Object.keys(t.categories);
  const voices = await listVoices();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">{t.title}</h1>
        <p className="text-sm text-muted">{t.intro}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Status ok={aiConfigured()} label={t.aiOk} hint={t.aiHint} />
        <Status ok={phoneConfigured()} label={t.phoneOk} hint={t.phoneHint} />
        <Status ok={Boolean(process.env.APP_PASSWORD)} label={t.pwOk} hint={t.pwHint} />
        <Status ok={ttsConfigured()} label={t.voices.status} hint={t.voices.statusHint} />
      </div>

      <form action={saveBrandProfile} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">{t.profile}</h2>
        {repo.BRAND_FIELDS.map((f) => {
          const long = !["brand_name", "owner_name", "owner_phone"].includes(f.key);
          const [label, placeholder] = t.fields[f.key] ?? [f.label, f.placeholder];
          return (
            <div key={f.key} className={long ? "sm:col-span-2" : ""}>
              <label className="label">{label}</label>
              {long ? (
                <textarea name={f.key} rows={3} defaultValue={s[f.key] ?? ""} placeholder={placeholder} className="input" />
              ) : (
                <input name={f.key} defaultValue={s[f.key] ?? ""} placeholder={placeholder} className="input" />
              )}
            </div>
          );
        })}
        <div className="sm:col-span-2"><button className="btn-primary">{t.saveProfile}</button></div>
      </form>

      <div className="card space-y-3">
        <h2 className="h2">{t.voices.title}</h2>
        {!ttsConfigured() ? (
          <p className="text-sm text-muted">{t.voices.off}</p>
        ) : (
          <>
            <p className="text-sm text-muted">{t.voices.intro}</p>
            <form action={saveVoices} className="grid gap-3 sm:grid-cols-2">
              {(["ro", "en"] as const).map((l) => (
                <div key={l}>
                  <label className="label">{l === "ro" ? t.voices.ro : t.voices.en}</label>
                  <div className="flex flex-wrap gap-2">
                    <select name={`voice_${l}`} defaultValue={voiceFor(l)} className="input flex-1">
                      {voices.length === 0 && <option value={voiceFor(l)}>{voiceFor(l)}</option>}
                      {voices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}{v.labels ? ` (${Object.values(v.labels).filter(Boolean).slice(0, 3).join(", ")})` : ""}
                        </option>
                      ))}
                    </select>
                    <VoiceTest lang={l} text={l === "ro" ? t.voices.sampleRo : t.voices.sampleEn} label={t.voices.test} />
                  </div>
                </div>
              ))}
              <div className="sm:col-span-2"><button className="btn-primary">{t.voices.save}</button></div>
            </form>
          </>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="h2">{t.teach}</h2>
        <form action={learnFromUrl} className="flex flex-wrap gap-2">
          <input name="url" type="url" required className="input flex-1" placeholder={t.urlPh} />
          <SubmitButton pendingText={t.reading}>{t.learn}</SubmitButton>
        </form>
        <p className="text-sm text-muted">{t.orChat} <Link href="/assistant" className="text-accent underline">{t.openAssistant}</Link></p>
        <form action={addKnowledgeAction} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-4">
          <input name="title" required className="input sm:col-span-2" placeholder={t.factTitlePh} />
          <select name="category" className="input">{CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}</select>
          <button className="btn">{t.addFact}</button>
          <textarea name="content" required rows={2} className="input sm:col-span-4" placeholder={t.factPh} />
        </form>
      </div>

      <div className="space-y-2">
        <h2 className="h2">{t.kb(knowledge.length)}</h2>
        {knowledge.map((k) => (
          <details key={k.id} className="card p-4">
            <summary className="cursor-pointer"><span className="badge mr-2">{t.categories[k.category] ?? k.category}</span><span className="font-medium">{k.title}</span></summary>
            <form action={updateKnowledgeAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={k.id} />
              <div className="grid gap-2 sm:grid-cols-3">
                <input name="title" defaultValue={k.title} className="input sm:col-span-2" />
                <select name="category" defaultValue={k.category} className="input">{CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}</select>
              </div>
              <textarea name="content" defaultValue={k.content} rows={4} className="input" />
              <button className="btn">{getDict().common.save}</button>
            </form>
            <form action={deleteKnowledgeAction} className="mt-2"><input type="hidden" name="id" value={k.id} /><button className="text-xs text-red-600 hover:underline">{getDict().common.delete}</button></form>
          </details>
        ))}
        {knowledge.length === 0 && <p className="text-sm text-muted">{t.nothing}</p>}
      </div>
    </div>
  );
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className={`card p-3 text-sm ${ok ? "" : "border-amber-300"}`}>
      <div className="font-medium">{ok ? "✓" : "○"} {label}</div>
      {!ok && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
