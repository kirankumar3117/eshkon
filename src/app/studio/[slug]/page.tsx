import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchPage, PageNotFoundError } from '@/lib/contentful/contentfulAdapter'
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

    if (err instanceof PageNotFoundError) {
      return (
        <main className="flex items-center justify-center min-h-screen p-8" role="main">
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-md border border-blue-200 bg-blue-50 p-6"
          >
            <h1 className="text-lg font-semibold text-blue-900">
              Page not found in Contentful
            </h1>
            <p className="mt-2 text-sm text-blue-900">
              No page with slug <code className="font-mono bg-blue-100 px-1 rounded">{slug}</code> exists in your Contentful space.
            </p>
            <p className="mt-2 text-xs text-blue-900">
              Create a <strong>page</strong> entry in Contentful with <code className="font-mono">slug = &ldquo;{slug}&rdquo;</code> and then return here.
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
            <h1 className="text-lg font-semibold text-amber-900">
              Contentful API error
            </h1>
            <p className="mt-2 text-sm text-amber-900">
              {(err as ContentfulError).message}
            </p>
            <p className="mt-2 text-xs text-amber-900">
              Check your <code className="font-mono bg-amber-100 px-1 rounded">CONTENTFUL_*</code> environment variables.
            </p>
          </div>
        </main>
      )
    }

    notFound()
  }

  return <StudioClient initialPage={page} role={role} />
}
