"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { setLanguage } from "@/app/(app)/actions";

export default function Nav({ t, lang }: { t: Dict["nav"]; lang: Lang }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const links = [
    { href: "/", label: t.dashboard },
    { href: "/assistant", label: t.assistant },
    { href: "/leads", label: t.leads },
    { href: "/sales", label: t.sales },
    { href: "/marketing", label: t.marketing },
    { href: "/products", label: t.products },
    { href: "/website", label: t.website },
    { href: "/brand", label: t.brand },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const switcher = (
    <div className="flex gap-1 p-2" role="group" aria-label={t.language}>
      {(["ro", "en"] as const).map((l) => (
        <button
          key={l}
          disabled={pending}
          onClick={() => startTransition(() => setLanguage(l))}
          className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium uppercase ${lang === l ? "bg-accent text-white" : "border border-border text-stone-600 hover:bg-stone-100"}`}
          aria-pressed={lang === l}
        >
          {l === "ro" ? "RO" : "EN"}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/" className="font-bold tracking-tight">UNU <span className="text-accent">AI</span></Link>
        <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t.menu}>☰</button>
      </div>
      <nav className={`${open ? "block" : "hidden"} border-b border-border bg-surface md:block md:w-56 md:shrink-0 md:border-b-0 md:border-r md:min-h-screen`}>
        <div className="hidden px-5 py-5 md:block">
          <Link href="/" className="text-xl font-bold tracking-tight">UNU <span className="text-accent">AI</span></Link>
          <p className="text-xs text-muted">{t.tagline}</p>
        </div>
        <ul className="space-y-0.5 p-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${active(l.href) ? "bg-accent-soft font-medium text-amber-900" : "text-stone-700 hover:bg-stone-100"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        {switcher}
      </nav>
    </>
  );
}
