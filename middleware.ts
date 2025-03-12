import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("admin_auth")

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!authCookie || authCookie.value !== "authenticated") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}

