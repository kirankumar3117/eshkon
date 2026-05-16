import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import semver from 'semver'
import { canPublish, parseRole } from '@/lib/auth/roles'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import { calculateBump } from '@/lib/publish/semverDiff'
import {
  saveSnapshot,
  getLatestSnapshot,
} from '@/lib/publish/snapshotManager'
import { fetchPage } from '@/lib/contentful/contentfulAdapter'
import { publishPageToContentful } from '@/lib/contentful/contentfulManagement'

interface PublishRequestBody {
  slug: string
  page?: unknown
}

export async function POST(request: NextRequest) {
  // ── Server-side role enforcement ────────────────────────────────────────
  // Middleware at the edge also rejects non-publishers, but we re-verify
  // here so the route is never callable even if middleware is bypassed.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!canPublish(parseRole(token?.role))) {
    return NextResponse.json(
      { error: 'Forbidden: publisher role required.' },
      { status: 403 }
    )
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let body: PublishRequestBody
  try {
    body = (await request.json()) as PublishRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { slug, page: rawPage } = body

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: slug.' },
      { status: 400 }
    )
  }

  // ── Resolve the page to publish ──────────────────────────────────────────
  // Prefer the draft from the request body (user's edited version).
  // Fall back to re-fetching from Contentful if no page is supplied.
  let currentPage
  if (rawPage !== undefined) {
    try {
      currentPage = validatePage(rawPage)
    } catch (err) {
      if (err instanceof PageValidationError) {
        return NextResponse.json(
          { error: `Page validation failed: ${err.message}` },
          { status: 422 }
        )
      }
      return NextResponse.json({ error: 'Invalid page data.' }, { status: 422 })
    }
  } else {
    try {
      currentPage = await fetchPage(slug)
    } catch {
      return NextResponse.json(
        { error: `Page "${slug}" could not be fetched from Contentful.` },
        { status: 404 }
      )
    }
  }

  // ── Load previous snapshot ───────────────────────────────────────────────
  let latest
  try {
    latest = await getLatestSnapshot(slug)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load snapshots: ${(err as Error).message}` },
      { status: 500 }
    )
  }

  // ── First publish: no previous snapshot ─────────────────────────────────
  if (!latest) {
    try {
      await saveSnapshot(slug, '1.0.0', currentPage)
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to save snapshot: ${(err as Error).message}` },
        { status: 500 }
      )
    }

    // Write back to Contentful (non-fatal — snapshot already saved)
    if (process.env.CONTENTFUL_MANAGEMENT_TOKEN) {
      try {
        await publishPageToContentful(currentPage)
      } catch (err) {
        console.error('[publish] Contentful write-back failed:', err)
      }
    }

    return NextResponse.json({
      version: '1.0.0',
      changelog: ['Initial release'],
      snapshot: currentPage,
      idempotent: false,
    })
  }

  // ── Subsequent publish: diff against latest snapshot ────────────────────
  const { bump, changelog } = calculateBump(latest.page, currentPage)

  // Idempotency: identical content → return the existing version
  if (bump === 'none') {
    return NextResponse.json({
      version: latest.version,
      changelog: [],
      snapshot: latest.page,
      idempotent: true,
    })
  }

  // Increment semver according to the diff result
  const nextVersion = semver.inc(latest.version, bump)
  if (!nextVersion) {
    return NextResponse.json(
      { error: `Could not increment version "${latest.version}" with bump "${bump}".` },
      { status: 500 }
    )
  }

  try {
    await saveSnapshot(slug, nextVersion, currentPage)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to save snapshot: ${(err as Error).message}` },
      { status: 500 }
    )
  }

  // Write back to Contentful (non-fatal — snapshot already saved)
  if (process.env.CONTENTFUL_MANAGEMENT_TOKEN) {
    try {
      await publishPageToContentful(currentPage)
    } catch (err) {
      console.error('[publish] Contentful write-back failed:', err)
    }
  }

  return NextResponse.json({
    version: nextVersion,
    changelog,
    snapshot: currentPage,
    idempotent: false,
  })
}
