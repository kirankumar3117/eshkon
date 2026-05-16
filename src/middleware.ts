import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessStudio, canPublish, parseRole } from '@/lib/auth/roles'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const role = parseRole(token?.role)
  const { pathname } = request.nextUrl

  // ── /studio/* — requires editor or publisher ────────────────────────────
  if (pathname.startsWith('/studio')) {
    if (!canAccessStudio(role)) {
      // Authenticated but insufficient role (e.g. viewer) → send home, not to
      // login, so they don't get caught in a redirect loop.
      if (role !== null) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Pass role to server components via a read-only header
    const response = NextResponse.next()
    response.headers.set('x-user-role', role ?? '')
    return response
  }

  // ── /api/publish — requires publisher ───────────────────────────────────
  if (pathname.startsWith('/api/publish')) {
    if (!canPublish(role)) {
      return NextResponse.json(
        { error: 'Forbidden: publisher role required.' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/studio/:path*', '/api/publish'],
}
