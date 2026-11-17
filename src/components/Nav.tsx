"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
  { href: "/leads", label: "Leads" },
  { href: "/sales", label: "Sales" },
  { href: "/marketing", label: "Marketing" },
  { href: "/products", label: "Products" },
  { href: "/website", label: "Website" },
  { href: "/brand", label: "Brand brain" },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/" className="font-bold tracking-tight">UNU <span className="text-accent">AI</span></Link>
        <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">☰</button>
      </div>
      <nav className={`${open ? "block" : "hidden"} border-b border-border bg-surface md:block md:w-56 md:shrink-0 md:border-b-0 md:border-r md:min-h-screen`}>
        <div className="hidden px-5 py-5 md:block">
          <Link href="/" className="text-xl font-bold tracking-tight">UNU <span className="text-accent">AI</span></Link>
          <p className="text-xs text-muted">Business assistant</p>
        </div>
        <ul className="space-y-0.5 p-2">
          {LINKS.map((l) => (
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
      </nav>
    </>
  );
}
