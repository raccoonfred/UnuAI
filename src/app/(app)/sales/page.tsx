import * as repo from "@/lib/repo";
import { Badge, eur } from "@/lib/format";
import Markdown from "@/components/Markdown";
import SubmitButton from "@/components/SubmitButton";
import { getDict } from "@/lib/i18n";
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
  const T = getDict();
  const t = T.sales;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t.title}</h1>
        <form action={salesInsights}><SubmitButton className="btn" pendingText={t.insightPending}>{t.insight}</SubmitButton></form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4"><div className="label">{t.thisMonth}</div><div className="text-2xl font-semibold">{eur(s.revenueThisMonth)}</div></div>
        <div className="card p-4"><div className="label">{t.lastMonth}</div><div className="text-2xl font-semibold">{eur(s.revenueLastMonth)}</div></div>
        <div className="card p-4"><div className="label">{t.thisYear}</div><div className="text-2xl font-semibold">{eur(s.revenueYear)}</div></div>
        <div className="card p-4"><div className="label">{t.openQuotes}</div><div className="text-2xl font-semibold">{eur(s.openQuotes)}</div></div>
      </div>

      {insight && <div className="card"><h2 className="h2 mb-1">{insight.title}</h2><Markdown text={insight.content} /></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 mb-2">{t.byProduct}</h2>
          <table className="table"><tbody>
            {s.byProduct.map((p) => <tr key={p.product}><td>{p.product}</td><td>{p.units} {t.pcs}</td><td className="text-right">{eur(p.revenue)}</td></tr>)}
            {s.byProduct.length === 0 && <tr><td className="text-muted">{t.noSales}</td></tr>}
          </tbody></table>
        </div>
        <div className="card">
          <h2 className="h2 mb-2">{t.byChannel}</h2>
          <table className="table"><tbody>
            {s.byChannel.map((c) => <tr key={c.channel}><td className="capitalize">{T.saleChannel[c.channel] ?? c.channel}</td><td className="text-right">{eur(c.revenue)}</td></tr>)}
            {s.byChannel.length === 0 && <tr><td className="text-muted">{t.noSales}</td></tr>}
          </tbody></table>
        </div>
      </div>

      <details className="card" open={sales.length === 0}>
        <summary className="cursor-pointer font-medium">{t.record}</summary>
        <form action={addSaleAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><label className="label">{t.product}</label>
            <select name="product_id" className="input"><option value="">{T.common.none}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="label">{t.customer}</label>
            <select name="lead_id" className="input"><option value="">{T.common.none}</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company}` : ""}</option>)}</select></div>
          <div><label className="label">{t.amount}</label><input name="amount" type="number" step="any" required className="input" /></div>
          <div><label className="label">{t.quantity}</label><input name="quantity" type="number" defaultValue={1} min={1} className="input" /></div>
          <div><label className="label">{T.common.channel}</label><select name="channel" className="input">{repo.SALE_CHANNELS.map((c) => <option key={c} value={c}>{T.saleChannel[c]}</option>)}</select></div>
          <div><label className="label">{T.common.status}</label><select name="status" defaultValue="paid" className="input">{repo.SALE_STATUSES.map((c) => <option key={c} value={c}>{T.status[c]}</option>)}</select></div>
          <div><label className="label">{T.common.date}</label><input name="sold_at" type="date" defaultValue={today} className="input" /></div>
          <div><label className="label">{t.description}</label><input name="description" className="input" placeholder={t.optional} /></div>
          <div className="sm:col-span-4"><button className="btn-primary">{t.saveSale}</button></div>
        </form>
      </details>

      <div className="card overflow-x-auto p-0">
        <form className="flex flex-wrap items-end gap-2 p-4">
          <div><label className="label">{T.common.from}</label><input type="date" name="from" defaultValue={filter.from} className="input" /></div>
          <div><label className="label">{T.common.to}</label><input type="date" name="to" defaultValue={filter.to} className="input" /></div>
          <button className="btn">{T.common.filter}</button>
          <span className="ml-auto text-sm text-muted">{t.total} <b className="text-foreground">{eur(total)}</b></span>
        </form>
        <table className="table">
          <thead><tr><th>{t.cols.date}</th><th>{t.cols.what}</th><th>{t.cols.customer}</th><th>{t.cols.channel}</th><th>{t.cols.status}</th><th className="text-right">{t.cols.amount}</th><th></th></tr></thead>
          <tbody>
            {sales.map((x) => (
              <tr key={x.id}>
                <td>{x.sold_at}</td>
                <td>{x.product_name ?? x.description ?? "—"}{x.quantity > 1 ? ` ×${x.quantity}` : ""}</td>
                <td>{x.lead_name ?? ""}</td>
                <td className="capitalize">{T.saleChannel[x.channel] ?? x.channel}</td>
                <td>
                  <form action={setSaleStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={x.id} />
                    <Badge value={x.status} label={T.status[x.status]} />
                    <select name="status" defaultValue={x.status} className="rounded border border-border text-xs">
                      {repo.SALE_STATUSES.map((st) => <option key={st} value={st}>{T.status[st]}</option>)}
                    </select>
                    <button className="text-xs text-accent">{t.set}</button>
                  </form>
                </td>
                <td className="text-right">{eur(x.amount)}</td>
                <td><form action={deleteSaleAction}><input type="hidden" name="id" value={x.id} /><button className="text-xs text-muted hover:text-red-600">✕</button></form></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">{t.empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
