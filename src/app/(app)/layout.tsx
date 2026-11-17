import { connection } from "next/server";
import Nav from "@/components/Nav";
import { aiConfigured } from "@/lib/ai";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render with fresh data from the database
  return (
    <div className="md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        {!aiConfigured() && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-accent-soft px-4 py-3 text-sm text-amber-900">
            The AI features need an Anthropic API key. Add <code>ANTHROPIC_API_KEY</code> to <code>.env.local</code> and restart.
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
