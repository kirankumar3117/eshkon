import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessStudio, parseRole } from '@/lib/auth/roles'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import fs from 'fs/promises'
import path from 'path'

const DRAFTS_DIR = path.join(process.cwd(), 'drafts')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!canAccessStudio(parseRole(token?.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  try {
    const content = await fs.readFile(path.join(DRAFTS_DIR, `${slug}.json`), 'utf-8')
    return NextResponse.json(JSON.parse(content) as unknown)
  } catch {
    return NextResponse.json({ error: 'No draft found' }, { status: 404 })
  }
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
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Invalid page data' }, { status: 422 })
  }

  await fs.mkdir(DRAFTS_DIR, { recursive: true })
  await fs.writeFile(
    path.join(DRAFTS_DIR, `${slug}.json`),
    JSON.stringify(body, null, 2),
    'utf-8'
  )
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}
