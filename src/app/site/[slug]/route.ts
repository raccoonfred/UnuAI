import { getPageBySlug } from "@/lib/repo";

/** Serves published website pages as full HTML documents. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const page = getPageBySlug(slug);
  if (!page || !page.published) return new Response("Not found", { status: 404 });
  return new Response(page.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
