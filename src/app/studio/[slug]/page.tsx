import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchPage, PageNotFoundError } from '@/lib/contentful/contentfulAdapter'
import { ContentfulError } from '@/lib/contentful/contentfulClient'
import { PageValidationError } from '@/schemas/pageSchema'
import { getLatestSnapshot } from '@/lib/publish/snapshotManager'
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
    page = await fetchPage(slug)
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

    // Contentful unreachable or page missing — try the latest published snapshot.
    if (err instanceof PageNotFoundError || err instanceof ContentfulError) {
      const snapshot = await getLatestSnapshot(slug)
      if (snapshot) {
        page = snapshot.page
        snapshotVersion = snapshot.version
      } else {
        const isNotFound = err instanceof PageNotFoundError
        return (
          <main className="flex items-center justify-center min-h-screen p-8" role="main">
            <div role="alert" className={`mx-auto max-w-lg rounded-md border p-6 ${isNotFound ? 'border-blue-200 bg-blue-50' : 'border-amber-300 bg-amber-50'}`}>
              <h1 className={`text-lg font-semibold ${isNotFound ? 'text-blue-900' : 'text-amber-900'}`}>
                {isNotFound ? 'Page not found in Contentful' : 'Contentful API error'}
              </h1>
              <p className={`mt-2 text-sm ${isNotFound ? 'text-blue-900' : 'text-amber-900'}`}>
                {isNotFound
                  ? <>No page with slug <code className="font-mono bg-blue-100 px-1 rounded">{slug}</code> exists and no published snapshot is available.</>
                  : (err as ContentfulError).message}
              </p>
            </div>
          </main>
        )
      }
    } else {
      notFound()
    }
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
