import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { getDict } from "@/lib/i18n";

async function login(formData: FormData) {
  "use server";
  const next = String(formData.get("next") || "/");
  if (formData.get("password") !== process.env.APP_PASSWORD) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  const token = await sessionToken();
  if (token) {
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const t = getDict().login;
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <form action={login} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <input type="hidden" name="next" value={next ?? "/"} />
        <input name="password" type="password" placeholder={t.password} className="input" autoFocus required />
        {error && <p className="text-sm text-red-600">{t.wrong}</p>}
        <button className="btn-primary w-full">{t.signIn}</button>
      </form>
    </div>
  );
}
