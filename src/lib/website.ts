import { generate } from "./ai";
import { getPage, savePage, updatePage } from "./repo";

const DESIGNER_ROLE = `You are a senior web designer and copywriter building pages for a guitar brand's website. You output one complete, self-contained HTML5 document: semantic HTML, all CSS inline in a <style> tag (no external CSS frameworks, no JavaScript unless asked), responsive down to 360px, accessible (alt text, contrast, landmarks), fast. The design should feel premium and crafted, fitting a boutique guitar maker, using the brand voice from the context. Use real product names, prices and facts from the context only; where you need an image, use a tasteful placeholder <div> with a descriptive label or an <img> with src="https://placehold.co/1200x800?text=..." and good alt text. Output ONLY the HTML document, starting with <!doctype html>, with no explanation and no code fences.`;

function extractHtml(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/<!doctype html|<html/i);
  return start >= 0 ? body.slice(start) : body;
}

export async function buildPage(input: { slug: string; title: string; brief: string }): Promise<number> {
  const text = await generate(
    `Build the "${input.title}" page (URL path /site/${input.slug}).\n\nBrief:\n${input.brief}`,
    { role: DESIGNER_ROLE, effort: "high", maxTokens: 32000 },
  );
  return savePage({ slug: input.slug, title: input.title, html: extractHtml(text) });
}

export async function editPage(id: number, instruction: string): Promise<void> {
  const page = getPage(id);
  if (!page) throw new Error(`No page #${id}`);
  const text = await generate(
    `Here is the current HTML of the "${page.title}" page:\n\n<current_page>\n${page.html}\n</current_page>\n\nApply this change and return the full updated document:\n${instruction}`,
    { role: DESIGNER_ROLE, effort: "high", maxTokens: 32000 },
  );
  updatePage(id, { html: extractHtml(text) });
}
