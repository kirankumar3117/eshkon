import fs from 'fs/promises'
import path from 'path'
import { fetchPage } from '@/lib/contentful/contentfulAdapter'
import { PageValidationError, validatePage } from '@/schemas/pageSchema'
import { getLatestSnapshot } from '@/lib/publish/snapshotManager'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { renderSection } from '@/lib/registry/sectionRegistry'
import type { Page, Section } from '@/types/page'

const DRAFTS_DIR = process.env.VERCEL ? '/tmp/drafts' : path.join(process.cwd(), 'drafts')

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
  let label: string | null = null

  // ── Step 1: draft (what's currently in the studio) ───────────────────────
  try {
    const raw = await fs.readFile(path.join(DRAFTS_DIR, `${slug}.json`), 'utf-8')
    const draft = validatePage(JSON.parse(raw))
    page = draft
    label = 'Draft'
  } catch {
    // no draft saved yet
  }

  // ── Step 2: latest published snapshot ────────────────────────────────────
  if (!page) {
    try {
      const snapshot = await getLatestSnapshot(slug)
      if (snapshot) {
        page = snapshot.page
        label = `Published v${snapshot.version}`
      }
    } catch {
      // unreadable
    }
  }

  // ── Step 3: Contentful ────────────────────────────────────────────────────
  if (!page) {
    try {
      const fetched = await fetchPage(slug)
      if (fetched.sections.length > 0) {
        page = fetched
        label = 'Contentful'
      }
    } catch (err) {
      if (err instanceof PageValidationError) {
        return (
          <ErrorCard title="Page data is invalid">
            The page loaded from Contentful failed schema validation.
          </ErrorCard>
        )
      }
    }
  }

  if (!page) {
    return (
      <ErrorCard title="Page not found">
        No draft, snapshot, or Contentful entry is available for{' '}
        <code className="font-mono bg-muted px-1 rounded">{slug}</code>.
      </ErrorCard>
    )
  }

  return (
    <main id="main-content" role="main">
      <h1 className="sr-only">{page.title}</h1>
      {label && (
        <div className="bg-muted border-b px-4 py-2 text-xs text-muted-foreground text-center font-medium tracking-wide">
          {label}
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
