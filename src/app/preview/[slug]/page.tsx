import { notFound } from 'next/navigation'
import { fetchPage } from '@/lib/contentful/contentfulAdapter'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { UnsupportedSection } from '@/components/sections/UnsupportedSection'
import { renderSection } from '@/lib/registry/sectionRegistry'
import type { Section } from '@/types/page'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params

  let rawPage: unknown
  try {
    rawPage = await fetchPage(slug)
  } catch {
    notFound()
  }

  let page
  try {
    page = validatePage(rawPage)
  } catch (err) {
    if (err instanceof PageValidationError) {
      return (
        <main className="min-h-screen p-8" role="main">
          <div
            role="alert"
            className="mx-auto max-w-2xl rounded-md border border-destructive/50 bg-destructive/10 p-6"
          >
            <h1 className="text-lg font-semibold text-destructive">
              Page data is invalid
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page could not be rendered because its data failed validation.
            </p>
          </div>
        </main>
      )
    }
    notFound()
  }

  const knownTypes = new Set(['hero', 'featureGrid', 'testimonial', 'cta'])

  return (
    <main id="main-content" role="main">
      <h1 className="sr-only">{page.title}</h1>
      {page.sections.map((section) => {
        if (!knownTypes.has(section.type)) {
          return (
            <SectionErrorBoundary key={section.id} sectionId={section.id}>
              <UnsupportedSection type={section.type} />
            </SectionErrorBoundary>
          )
        }
        return (
          <SectionErrorBoundary key={section.id} sectionId={section.id}>
            {renderSection(section as Section)}
          </SectionErrorBoundary>
        )
      })}
    </main>
  )
}
