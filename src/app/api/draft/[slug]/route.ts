import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessStudio, parseRole } from '@/lib/auth/roles'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import { storage } from '@/lib/storage'

function draftKey(slug: string): string {
  return `drafts/${slug}.json`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!canAccessStudio(parseRole(token?.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  const content = await storage.read(draftKey(slug))
  if (!content) return NextResponse.json({ error: 'No draft found' }, { status: 404 })

  return NextResponse.json(JSON.parse(content) as unknown)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!canAccessStudio(parseRole(token?.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    validatePage(body)
  } catch (err) {
    if (err instanceof PageValidationError) {
      console.error('[draft POST] Validation failed:', err.message)
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    console.error('[draft POST] Unknown validation error:', err)
    return NextResponse.json({ error: 'Invalid page data' }, { status: 422 })
  }

  try {
    await storage.write(draftKey(slug), JSON.stringify(body, null, 2))
  } catch (err) {
    console.error('[draft POST] Storage write failed:', err)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}
