import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

/** Password-protects the app when APP_PASSWORD is set. Public: /login, published pages, Twilio webhook. */
export async function proxy(request: NextRequest) {
  const expected = await sessionToken();
  if (!expected) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value === expected) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|site/|api/phone/voice|_next/static|_next/image|favicon.ico).*)"],
};
