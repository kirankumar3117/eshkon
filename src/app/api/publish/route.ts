import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canPublish, parseRole } from '@/lib/auth/roles'

export async function POST(request: NextRequest) {
  // ── Server-side role enforcement ────────────────────────────────────────
  // The middleware already rejects non-publishers at the edge, but we re-check
  // here to ensure the API is never callable even if middleware is bypassed.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const role = parseRole(token?.role)

  if (!canPublish(role)) {
    return NextResponse.json(
      { error: 'Forbidden: publisher role required.' },
      { status: 403 }
    )
  }

  // ── Publish logic (implemented in Step 9) ───────────────────────────────
  let body: { slug?: string }
  try {
    body = (await request.json()) as { slug?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { slug } = body
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: slug.' },
      { status: 400 }
    )
  }

  // Placeholder — full semver + snapshot logic added in Step 9.
  return NextResponse.json(
    { message: 'Publish endpoint ready. Full logic implemented in Step 9.', slug },
    { status: 200 }
  )
}
