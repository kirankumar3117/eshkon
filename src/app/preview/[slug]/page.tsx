import { notFound } from 'next/navigation'
import { fetchPage, PageNotFoundError } from '@/lib/contentful/contentfulAdapter'
import { PageValidationError } from '@/schemas/pageSchema'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { renderSection } from '@/lib/registry/sectionRegistry'
import type { Section } from '@/types/page'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

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

  let page
  try {
    page = await fetchPage(slug)
  } catch (err) {
    if (err instanceof PageNotFoundError) {
      return (
        <ErrorCard title="Page not found">
          No page with slug <code className="font-mono bg-muted px-1 rounded">{slug}</code> exists
          in Contentful. Create it there and come back.
        </ErrorCard>
      )
    }
    if (err instanceof PageValidationError) {
      return (
        <ErrorCard title="Page data is invalid">
          The page loaded from Contentful failed schema validation. Fix the content model and refresh.
        </ErrorCard>
      )
    }
    notFound()
  }

  // page is typed as Page here — all sections already passed Zod validation in fetchPage
  return (
    <main id="main-content" role="main">
      <h1 className="sr-only">{page!.title}</h1>
      {page!.sections.map((section) => (
        <SectionErrorBoundary key={section.id} sectionId={section.id}>
          {renderSection(section as Section)}
        </SectionErrorBoundary>
      ))}
    </main>
  )
}
