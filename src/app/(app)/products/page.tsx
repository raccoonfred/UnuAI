import Link from "next/link";
import * as repo from "@/lib/repo";
import { eur } from "@/lib/format";
import ProductFields from "@/components/ProductFields";
import { addProductAction } from "../actions";

export default function ProductsPage() {
  const products = repo.listProducts();
  return (
    <div className="space-y-6">
      <h1 className="h1">Products</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th className="text-right">Price</th><th className="text-right">Margin</th><th className="text-right">Stock</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{!p.description && <span className="ml-2 badge">no description</span>}</td>
                <td>{p.sku}</td>
                <td>{p.category}</td>
                <td className="text-right">{eur(p.price)}</td>
                <td className="text-right">{p.price && p.cost ? `${Math.round(((p.price - p.cost) / p.price) * 100)}%` : ""}</td>
                <td className={`text-right ${p.stock <= 1 ? "font-semibold text-red-600" : ""}`}>{p.stock}</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted">Add your guitar models so the assistant knows your catalog.</td></tr>}
          </tbody>
        </table>
      </div>
      <details className="card" open={products.length === 0}>
        <summary className="cursor-pointer font-medium">Add a product</summary>
        <form action={addProductAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <ProductFields />
          <div className="sm:col-span-3"><button className="btn-primary">Add product</button></div>
        </form>
      </details>
    </div>
  );
}
