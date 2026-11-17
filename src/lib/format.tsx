export const eur = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-indigo-100 text-indigo-800",
  interested: "bg-amber-100 text-amber-800",
  negotiating: "bg-orange-100 text-orange-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-stone-200 text-stone-600",
  quote: "bg-sky-100 text-sky-800",
  ordered: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipped: "bg-emerald-100 text-emerald-800",
  refunded: "bg-stone-200 text-stone-600",
  todo: "bg-stone-100 text-stone-700",
  doing: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
  idea: "bg-stone-100 text-stone-700",
  draft: "bg-sky-100 text-sky-800",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={`badge ${STATUS_COLORS[value] ?? ""}`}>{label ?? value}</span>;
}
