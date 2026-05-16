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

  // Role is injected by middleware via x-user-role header.
  const headersList = await headers()
  const role = parseRole(headersList.get('x-user-role'))

  let page
  let snapshotVersion: string | null = null

  try {
    const fetched = await fetchPage(slug)
    // Only use Contentful data when it has renderable sections.
    // If all sections were unrecognised types the adapter returns [] —
    // fall through to the snapshot fallback in that case.
    if (fetched.sections.length > 0) {
      page = fetched
    }
  } catch (err) {
    if (err instanceof PageValidationError) {
      return (
        <main className="flex items-center justify-center min-h-screen p-8" role="main">
          <div role="alert" className="mx-auto max-w-lg rounded-md border border-destructive/50 bg-destructive/10 p-6">
            <h1 className="text-lg font-semibold text-destructive">Invalid page data</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page &ldquo;{slug}&rdquo; has data that doesn&apos;t match the expected schema. Fix it in Contentful and refresh.
            </p>
          </div>
        </main>
      )
    }

    if (!(err instanceof PageNotFoundError) && !(err instanceof ContentfulError)) {
      notFound()
    }
  }

  // Contentful returned no usable sections or was unreachable — try the latest published snapshot.
  if (!page) {
    try {
      const snapshot = await getLatestSnapshot(slug)
      if (snapshot) {
        page = snapshot.page
        snapshotVersion = snapshot.version
      }
    } catch {
      // ignore snapshot read errors
    }
  } else {
    // Page loaded from Contentful — auto-create an initial snapshot if none exists.
    try {
      const existing = await getLatestSnapshot(slug)
      if (!existing) {
        await saveSnapshot(slug, '1.0.0', page)
      }
    } catch {
      // non-critical — studio still opens without it
    }
  }

  if (!page) {
    return (
      <main className="flex items-center justify-center min-h-screen p-8" role="main">
        <div role="alert" className="mx-auto max-w-lg rounded-md border border-blue-200 bg-blue-50 p-6">
          <h1 className="text-lg font-semibold text-blue-900">Page not found</h1>
          <p className="mt-2 text-sm text-blue-900">
            No page with slug <code className="font-mono bg-blue-100 px-1 rounded">{slug}</code> exists and no published snapshot is available.
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      {snapshotVersion && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
          Contentful unreachable — studio loaded from published snapshot v{snapshotVersion}.
        </div>
      )}
      <StudioClient initialPage={page!} role={role} />
    </>
  )
}
