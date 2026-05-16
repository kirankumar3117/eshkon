import { fetchPage } from '@/lib/contentful/contentfulAdapter'
import { PageValidationError } from '@/schemas/pageSchema'
import { getLatestSnapshot } from '@/lib/publish/snapshotManager'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { renderSection } from '@/lib/registry/sectionRegistry'
import type { Page, Section } from '@/types/page'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

function ErrorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen p-8" role="main">
      <div role="alert" className="mx-auto max-w-2xl rounded-md border border-red-300 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">{title}</h1>
        <div className="mt-2 text-sm text-red-900">{children}</div>
      </div>
    </main>
  )
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params

  let page: Page | undefined
  let snapshotVersion: string | null = null

  // ── Step 1: try Contentful ────────────────────────────────────────────────
  try {
    const fetched = await fetchPage(slug)
    // Only accept the Contentful result when it has renderable sections.
    // If all sections were unrecognised types the adapter returns [] which
    // would produce a blank page — fall through to the snapshot in that case.
    if (fetched.sections.length > 0) {
      page = fetched
    }
  } catch (err) {
    // Schema error from Contentful data — show immediately, no fallback makes sense.
    if (err instanceof PageValidationError) {
      return (
        <ErrorCard title="Page data is invalid">
          The page loaded from Contentful failed schema validation. Fix the content model and refresh.
        </ErrorCard>
      )
    }
    // PageNotFoundError, ContentfulError (missing env vars), network errors —
    // all fall through to the snapshot below.
  }

  // ── Step 2: fall back to latest published snapshot ────────────────────────
  if (!page) {
    try {
      const snapshot = await getLatestSnapshot(slug)
      if (snapshot) {
        page = snapshot.page
        snapshotVersion = snapshot.version
      }
    } catch {
      // Snapshot unreadable — leave page undefined and show error below.
    }
  }

  // ── Step 3: nothing available ─────────────────────────────────────────────
  if (!page) {
    return (
      <ErrorCard title="Page not found">
        No published snapshot or Contentful entry is available for{' '}
        <code className="font-mono bg-muted px-1 rounded">{slug}</code>.
      </ErrorCard>
    )
  }

  return (
    <main id="main-content" role="main">
      <h1 className="sr-only">{page.title}</h1>
      {snapshotVersion && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
          Showing published snapshot v{snapshotVersion} — Contentful is not reachable.
        </div>
      )}
      {page.sections.map((section) => (
        <SectionErrorBoundary key={section.id} sectionId={section.id}>
          {renderSection(section as Section)}
        </SectionErrorBoundary>
      ))}
    </main>
  )
}
