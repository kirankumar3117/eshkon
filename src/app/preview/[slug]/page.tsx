import { fetchPage, PageNotFoundError } from '@/lib/contentful/contentfulAdapter'
import { PageValidationError } from '@/schemas/pageSchema'
import { getLatestSnapshot } from '@/lib/publish/snapshotManager'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { UnsupportedSection } from '@/components/sections/UnsupportedSection'
import { renderSection } from '@/lib/registry/sectionRegistry'
import type { Page, Section } from '@/types/page'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

const KNOWN_TYPES = new Set<string>(['hero', 'featureGrid', 'testimonial', 'cta'])

function ErrorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen p-8" role="main">
      <div role="alert" className="mx-auto max-w-2xl rounded-md border border-destructive/50 bg-destructive/10 p-6">
        <h1 className="text-lg font-semibold text-destructive">{title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </main>
  )
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params

  let page: Page | undefined
  let label: string | null = null

  // ── Step 1: latest published snapshot (source of truth for /preview) ──────
  try {
    const snapshot = await getLatestSnapshot(slug)
    if (snapshot) {
      page = snapshot.page
      label = `v${snapshot.version}`
    }
  } catch {
    // unreadable — fall through
  }

  // ── Step 2: Contentful (fallback when nothing has been published yet) ──────
  if (!page) {
    try {
      page = await fetchPage(slug)
      label = 'Contentful'
    } catch (err) {
      if (err instanceof PageNotFoundError) {
        return (
          <ErrorCard title="Page not found">
            No page with slug <code className="font-mono bg-muted px-1 rounded">{slug}</code>{' '}
            has been published yet. Publish it from the studio first.
          </ErrorCard>
        )
      }
      if (err instanceof PageValidationError) {
        return (
          <ErrorCard title="Page data is invalid">
            The page loaded from Contentful failed schema validation. Fix the content in
            Contentful and re-publish.
          </ErrorCard>
        )
      }
      return (
        <ErrorCard title="Could not load page">
          Contentful is unreachable and no published snapshot exists for this page.
        </ErrorCard>
      )
    }
  }

  return (
    <main id="main-content" role="main">
      <h1 className="sr-only">{page!.title}</h1>
      {label && (
        <div className="bg-muted border-b px-4 py-2 text-xs text-muted-foreground text-center font-medium tracking-wide">
          {label}
        </div>
      )}
      {page!.sections.map((section) => (
        <SectionErrorBoundary key={section.id} sectionId={section.id}>
          {KNOWN_TYPES.has(section.type)
            ? renderSection(section as Section)
            : <UnsupportedSection type={section.type} />}
        </SectionErrorBoundary>
      ))}
    </main>
  )
}
