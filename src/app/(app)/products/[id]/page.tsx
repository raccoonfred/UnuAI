import Link from "next/link";
import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import ProductFields from "@/components/ProductFields";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { deleteProductAction, describeProduct, updateProductAction } from "../../actions";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = repo.getProduct(Number(id));
  if (!p) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/products" className="text-sm text-muted hover:underline">← Products</Link>
        <h1 className="h1 mt-1">{p.name}</h1>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="h2">Description</h2>
          <form action={describeProduct} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={p.id} />
            <select name="style" className="input w-auto">
              <option value="website product page">Website</option>
              <option value="marketplace listing (Reverb / eMAG / Olx)">Marketplace listing</option>
              <option value="dealer catalog">Dealer catalog</option>
              <option value="short Instagram caption">Instagram</option>
            </select>
            <select name="language" className="input w-auto">
              <option>English</option>
              <option>Romanian</option>
              <option>German</option>
            </select>
            <SubmitButton pendingText="Writing...">{p.description ? "Rewrite with AI" : "Write with AI"}</SubmitButton>
          </form>
        </div>
        {p.description ? <Markdown text={p.description} /> : <p className="text-sm text-muted">No description yet.</p>}
      </div>

      <form action={updateProductAction} className="card grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="id" value={p.id} />
        <ProductFields p={p} />
        <div className="sm:col-span-3"><label className="label">Description (Markdown)</label><textarea name="description" rows={8} defaultValue={p.description ?? ""} className="input font-mono text-xs" /></div>
        <div className="sm:col-span-3"><button className="btn-primary">Save</button></div>
      </form>
      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={p.id} />
        <button className="text-sm text-red-600 hover:underline">Delete product</button>
      </form>
    </div>
  );
}
