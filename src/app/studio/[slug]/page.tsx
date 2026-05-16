import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchPage, PageNotFoundError } from '@/lib/contentful/contentfulAdapter'
import { ContentfulError } from '@/lib/contentful/contentfulClient'
import { PageValidationError } from '@/schemas/pageSchema'
import { getLatestSnapshot, saveSnapshot } from '@/lib/publish/snapshotManager'
import { parseRole } from '@/lib/auth/roles'
import { StudioClient } from './StudioClient'

interface StudioPageProps {
  params: Promise<{ slug: string }>
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params

  const headersList = await headers()
  const role = parseRole(headersList.get('x-user-role'))

  let page
  let source: 'snapshot' | 'contentful' | null = null

  // ── Step 1: latest published snapshot ──────────────────────────────────
  // Try this first so the studio always opens with what was last published,
  // regardless of whether Contentful write-back succeeded.
  try {
    const snapshot = await getLatestSnapshot(slug)
    if (snapshot) {
      page = snapshot.page
      source = 'snapshot'
    }
  } catch {
    // storage unavailable — fall through to Contentful
  }

  // ── Step 2: Contentful (no snapshot yet, or fresh page) ─────────────────
  if (!page) {
    const usePreview = process.env.CONTENTFUL_PREVIEW === 'true'
    try {
      page = await fetchPage(slug, usePreview)
      source = 'contentful'

      // First time this page opens — seed an initial snapshot so publish
      // has a baseline to diff against.
      try {
        await saveSnapshot(slug, '1.0.0', page)
      } catch {
        // snapshot already exists or storage unavailable — not critical
      }
    } catch (err) {
      if (err instanceof PageValidationError) {
        return (
          <main className="flex items-center justify-center min-h-screen p-8" role="main">
            <div role="alert" className="mx-auto max-w-lg rounded-md border border-destructive/50 bg-destructive/10 p-6">
              <h1 className="text-lg font-semibold text-destructive">Invalid page data</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The page &ldquo;{slug}&rdquo; has data that doesn&apos;t match the expected
                schema. Fix it in Contentful and refresh.
              </p>
            </div>
          </main>
        )
      }
      if (!(err instanceof PageNotFoundError) && !(err instanceof ContentfulError)) {
        notFound()
      }
    }
  }

  if (!page) {
    return (
      <main className="flex items-center justify-center min-h-screen p-8" role="main">
        <div role="alert" className="mx-auto max-w-lg rounded-md border border-blue-200 bg-blue-50 p-6">
          <h1 className="text-lg font-semibold text-blue-900">Page not found</h1>
          <p className="mt-2 text-sm text-blue-900">
            No page with slug{' '}
            <code className="font-mono bg-blue-100 px-1 rounded">{slug}</code> exists
            and no published snapshot is available.
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      {source === 'contentful' && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-800 text-center">
          No published version yet — studio loaded from Contentful.
        </div>
      )}
      <StudioClient initialPage={page} role={role} />
    </>
  )
}
