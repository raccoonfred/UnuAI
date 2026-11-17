import type { Product } from "@/lib/repo";
import type { Dict } from "@/lib/i18n";

export default function ProductFields({ p, t }: { p?: Product; t: Dict["products"]["fields"] }) {
  return (
    <>
      <div><label className="label">{t.name}</label><input name="name" required defaultValue={p?.name} className="input" placeholder={t.namePh} /></div>
      <div><label className="label">{t.sku}</label><input name="sku" defaultValue={p?.sku ?? ""} className="input" /></div>
      <div><label className="label">{t.category}</label><input name="category" defaultValue={p?.category ?? ""} className="input" placeholder={t.categoryPh} /></div>
      <div><label className="label">{t.price}</label><input name="price" type="number" step="any" defaultValue={p?.price ?? ""} className="input" /></div>
      <div><label className="label">{t.cost}</label><input name="cost" type="number" step="any" defaultValue={p?.cost ?? ""} className="input" /></div>
      <div><label className="label">{t.stock}</label><input name="stock" type="number" defaultValue={p?.stock ?? 0} className="input" /></div>
      <div className="sm:col-span-3"><label className="label">{t.specs}</label><textarea name="specs" rows={3} defaultValue={p?.specs ?? ""} className="input" placeholder={t.specsPh} /></div>
    </>
  );
}
