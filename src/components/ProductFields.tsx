import type { Product } from "@/lib/repo";

export default function ProductFields({ p }: { p?: Product }) {
  return (
    <>
      <div><label className="label">Name *</label><input name="name" required defaultValue={p?.name} className="input" placeholder="e.g. UNU Model One" /></div>
      <div><label className="label">SKU</label><input name="sku" defaultValue={p?.sku ?? ""} className="input" /></div>
      <div><label className="label">Category</label><input name="category" defaultValue={p?.category ?? ""} className="input" placeholder="Electric, acoustic, bass, accessory" /></div>
      <div><label className="label">Price (€)</label><input name="price" type="number" step="any" defaultValue={p?.price ?? ""} className="input" /></div>
      <div><label className="label">Cost (€)</label><input name="cost" type="number" step="any" defaultValue={p?.cost ?? ""} className="input" /></div>
      <div><label className="label">Stock</label><input name="stock" type="number" defaultValue={p?.stock ?? 0} className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Specs</label><textarea name="specs" rows={3} defaultValue={p?.specs ?? ""} className="input" placeholder="Body, neck, fretboard, pickups, hardware, finish, weight..." /></div>
    </>
  );
}
