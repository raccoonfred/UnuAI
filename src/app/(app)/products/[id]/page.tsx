import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import ProductFields from "@/components/ProductFields";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { getDict, getLang } from "@/lib/i18n";
import { deleteProductAction, describeProduct, updateProductAction } from "../../actions";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = repo.getProduct(Number(id));
  if (!p) notFound();
  const T = getDict();
  const t = T.products;
  const lang = getLang();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/products" className="text-sm text-muted hover:underline">{t.back}</Link>
        <h1 className="h1 mt-1">{p.name}</h1>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="h2">{t.description}</h2>
          <form action={describeProduct} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={p.id} />
            <select name="style" className="input w-auto">
              {Object.entries(t.styles).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="language" className="input w-auto" defaultValue={lang === "en" ? "English" : "Romanian"}>
              <option value="Romanian">Română</option>
              <option value="English">English</option>
              <option value="German">Deutsch</option>
            </select>
            <SubmitButton pendingText={T.common.writing}>{p.description ? t.rewrite : t.write}</SubmitButton>
          </form>
        </div>
        {p.description ? <Markdown text={p.description} /> : <p className="text-sm text-muted">{t.none}</p>}
      </div>

      <form action={updateProductAction} className="card grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="id" value={p.id} />
        <ProductFields p={p} t={t.fields} />
        <div className="sm:col-span-3"><label className="label">{t.fields.description}</label><textarea name="description" rows={8} defaultValue={p.description ?? ""} className="input font-mono text-xs" /></div>
        <div className="sm:col-span-3"><button className="btn-primary">{T.common.save}</button></div>
      </form>
      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={p.id} />
        <button className="text-sm text-red-600 hover:underline">{t.deleteBtn}</button>
      </form>
    </div>
  );
}
