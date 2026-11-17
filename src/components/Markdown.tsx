import { Marked } from "marked";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Raw HTML in AI output is shown as text, never rendered.
const marked = new Marked({ gfm: true, breaks: true, renderer: { html: ({ text }) => escape(text) } });

export function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false }) as string;
}

export default function Markdown({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`prose-unu ${className}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}
