import * as repo from "@/lib/repo";
import { Badge, eur } from "@/lib/format";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { addSaleAction, deleteSaleAction, salesInsights, setSaleStatus } from "../actions";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const filter = await searchParams;
  const sales = repo.listSales(filter);
  const s = repo.salesSummary();
  const products = repo.listProducts();
  const leads = repo.listLeads();
  const insight = repo.listDocuments({ kind: "sales_insight" })[0];
  const total = sales.filter((x) => ["ordered", "paid", "shipped"].includes(x.status)).reduce((a, x) => a + x.amount, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Sales</h1>
        <form action={salesInsights}><SubmitButton className="btn" pendingText="Analysing...">Get AI read on sales</SubmitButton></form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4"><div className="label">This month</div><div className="text-2xl font-semibold">{eur(s.revenueThisMonth)}</div></div>
        <div className="card p-4"><div className="label">Last month</div><div className="text-2xl font-semibold">{eur(s.revenueLastMonth)}</div></div>
        <div className="card p-4"><div className="label">This year</div><div className="text-2xl font-semibold">{eur(s.revenueYear)}</div></div>
        <div className="card p-4"><div className="label">Open quotes</div><div className="text-2xl font-semibold">{eur(s.openQuotes)}</div></div>
      </div>

      {insight && <div className="card"><h2 className="h2 mb-1">{insight.title}</h2><Markdown text={insight.content} /></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 mb-2">By product</h2>
          <table className="table"><tbody>
            {s.byProduct.map((p) => <tr key={p.product}><td>{p.product}</td><td>{p.units} pcs</td><td className="text-right">{eur(p.revenue)}</td></tr>)}
            {s.byProduct.length === 0 && <tr><td className="text-muted">No sales yet.</td></tr>}
          </tbody></table>
        </div>
        <div className="card">
          <h2 className="h2 mb-2">By channel</h2>
          <table className="table"><tbody>
            {s.byChannel.map((c) => <tr key={c.channel}><td className="capitalize">{c.channel}</td><td className="text-right">{eur(c.revenue)}</td></tr>)}
            {s.byChannel.length === 0 && <tr><td className="text-muted">No sales yet.</td></tr>}
          </tbody></table>
        </div>
      </div>

      <details className="card" open={sales.length === 0}>
        <summary className="cursor-pointer font-medium">Record a sale</summary>
        <form action={addSaleAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><label className="label">Product</label>
            <select name="product_id" className="input"><option value="">(none)</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="label">Customer</label>
            <select name="lead_id" className="input"><option value="">(none)</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company}` : ""}</option>)}</select></div>
          <div><label className="label">Amount (€) *</label><input name="amount" type="number" step="any" required className="input" /></div>
          <div><label className="label">Quantity</label><input name="quantity" type="number" defaultValue={1} min={1} className="input" /></div>
          <div><label className="label">Channel</label><select name="channel" className="input">{repo.SALE_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Status</label><select name="status" defaultValue="paid" className="input">{repo.SALE_STATUSES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Date</label><input name="sold_at" type="date" defaultValue={today} className="input" /></div>
          <div><label className="label">Description</label><input name="description" className="input" placeholder="Optional" /></div>
          <div className="sm:col-span-4"><button className="btn-primary">Save sale</button></div>
        </form>
      </details>

      <div className="card overflow-x-auto p-0">
        <form className="flex flex-wrap items-end gap-2 p-4">
          <div><label className="label">From</label><input type="date" name="from" defaultValue={filter.from} className="input" /></div>
          <div><label className="label">To</label><input type="date" name="to" defaultValue={filter.to} className="input" /></div>
          <button className="btn">Filter</button>
          <span className="ml-auto text-sm text-muted">Total counted: <b className="text-foreground">{eur(total)}</b></span>
        </form>
        <table className="table">
          <thead><tr><th>Date</th><th>What</th><th>Customer</th><th>Channel</th><th>Status</th><th className="text-right">Amount</th><th></th></tr></thead>
          <tbody>
            {sales.map((x) => (
              <tr key={x.id}>
                <td>{x.sold_at}</td>
                <td>{x.product_name ?? x.description ?? "—"}{x.quantity > 1 ? ` ×${x.quantity}` : ""}</td>
                <td>{x.lead_name ?? ""}</td>
                <td className="capitalize">{x.channel}</td>
                <td>
                  <form action={setSaleStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={x.id} />
                    <Badge value={x.status} />
                    <select name="status" defaultValue={x.status} className="rounded border border-border text-xs">
                      {repo.SALE_STATUSES.map((st) => <option key={st}>{st}</option>)}
                    </select>
                    <button className="text-xs text-accent">Set</button>
                  </form>
                </td>
                <td className="text-right">{eur(x.amount)}</td>
                <td><form action={deleteSaleAction}><input type="hidden" name="id" value={x.id} /><button className="text-xs text-muted hover:text-red-600">✕</button></form></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">No sales recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
