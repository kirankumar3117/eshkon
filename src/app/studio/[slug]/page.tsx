import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchPage } from '@/lib/contentful/contentfulAdapter'
import { ContentfulError } from '@/lib/contentful/contentfulClient'
import { PageValidationError } from '@/schemas/pageSchema'
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
  try {
    page = await fetchPage(slug)
  } catch (err) {
    if (err instanceof PageValidationError) {
      return (
        <main className="flex items-center justify-center min-h-screen p-8" role="main">
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-md border border-destructive/50 bg-destructive/10 p-6"
          >
            <h1 className="text-lg font-semibold text-destructive">
              Invalid page data
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page &ldquo;{slug}&rdquo; has data that doesn&apos;t match the expected
              schema. Fix it in Contentful and refresh.
            </p>
          </div>
        </main>
      )
    }

    if (err instanceof ContentfulError) {
      return (
        <main className="flex items-center justify-center min-h-screen p-8" role="main">
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-md border border-amber-300 bg-amber-50 p-6"
          >
            <h1 className="text-lg font-semibold text-amber-800">
              Contentful not reachable
            </h1>
            <p className="mt-2 text-sm text-amber-700">
              {(err as ContentfulError).message}
            </p>
            <p className="mt-2 text-xs text-amber-600">
              Check your <code className="font-mono">CONTENTFUL_*</code> environment
              variables and that the &ldquo;{slug}&rdquo; page exists in Contentful.
            </p>
          </div>
        </main>
      )
    }

    notFound()
  }

  return <StudioClient initialPage={page} role={role} />
}
