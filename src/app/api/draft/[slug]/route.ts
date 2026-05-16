import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessStudio, parseRole } from '@/lib/auth/roles'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import { getManagementClient } from '@/lib/contentful/contentfulClient'

const DRAFT_CONTENT_TYPE = 'pageDraft'
const LOCALE = 'en-US'

async function findDraftEntry(slug: string) {
  const { client, spaceId, environmentId } = getManagementClient()
  const result = await client.entry.getMany({
    spaceId,
    environmentId,
    query: { content_type: DRAFT_CONTENT_TYPE, 'fields.slug': slug, limit: 1 },
  })
  return result.items[0] ?? null
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
  const entry = await findDraftEntry(slug)
  if (!entry) {
    return NextResponse.json({ error: 'No draft found' }, { status: 404 })
  }

  return NextResponse.json(entry.fields.data[LOCALE] as unknown)
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

  const { client, spaceId, environmentId } = getManagementClient()
  const existing = await findDraftEntry(slug)

  if (existing) {
    await client.entry.update(
      { spaceId, environmentId, entryId: existing.sys.id },
      {
        sys: existing.sys,
        fields: {
          slug: { [LOCALE]: slug },
          data: { [LOCALE]: body },
        },
      }
    )
  } else {
    await client.entry.create(
      { spaceId, environmentId, contentTypeId: DRAFT_CONTENT_TYPE },
      { fields: { slug: { [LOCALE]: slug }, data: { [LOCALE]: body } } }
    )
  }

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}
