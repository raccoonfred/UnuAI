import Link from "next/link";
import * as repo from "@/lib/repo";
import { eur } from "@/lib/format";
import ProductFields from "@/components/ProductFields";
import { addProductAction } from "../actions";
import { getDict } from "@/lib/i18n";

export default function ProductsPage() {
  const products = repo.listProducts();
  const t = getDict().products;
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.title}</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>{t.cols.name}</th><th>{t.cols.sku}</th><th>{t.cols.category}</th><th className="text-right">{t.cols.price}</th><th className="text-right">{t.cols.margin}</th><th className="text-right">{t.cols.stock}</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{!p.description && <span className="ml-2 badge">{t.noDesc}</span>}</td>
                <td>{p.sku}</td>
                <td>{p.category}</td>
                <td className="text-right">{eur(p.price)}</td>
                <td className="text-right">{p.price && p.cost ? `${Math.round(((p.price - p.cost) / p.price) * 100)}%` : ""}</td>
                <td className={`text-right ${p.stock <= 1 ? "font-semibold text-red-600" : ""}`}>{p.stock}</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">{t.empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <details className="card" open={products.length === 0}>
        <summary className="cursor-pointer font-medium">{t.add}</summary>
        <form action={addProductAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <ProductFields t={t.fields} />
          <div className="sm:col-span-3"><button className="btn-primary">{t.addBtn}</button></div>
        </form>
      </details>
    </div>
  );
}
