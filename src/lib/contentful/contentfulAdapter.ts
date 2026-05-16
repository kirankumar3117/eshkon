import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'
import { getClient, ContentfulError } from './contentfulClient'

interface RawSectionFields {
  id: unknown
  type: unknown
  props: unknown
}

interface ResolvedEntry {
  sys?: {
    id?: string
    contentType?: {
      sys?: {
        id?: string
      }
    }
  }
  fields: Record<string, unknown>
}

type RichTextNode = {
  nodeType?: string
  content?: { value?: string; content?: { value?: string }[] }[]
}

function isResolvedEntry(value: unknown): value is ResolvedEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fields' in value &&
    typeof (value as { fields: unknown }).fields === 'object' &&
    (value as { fields: unknown }).fields !== null
  )
}

function mapSection(raw: unknown, index: number): RawSectionFields {
  if (!isResolvedEntry(raw)) {
    throw new ContentfulError(
      `Section at index ${index} is an unresolved link. ` +
        'Ensure the "section" content type is included with include >= 1.'
    )
  }

  const fields = raw.fields
  const sys = raw.sys || {}
  const contentTypeId = sys.contentType?.sys?.id

  // If it's matching the strict sprint brief schema:
  if (fields['type']) {
    return {
      id: fields['id'] || sys.id,
      type: fields['type'],
      props: fields['props'] ?? {},
    }
  }

  // Otherwise, smartly adapt the user's Contentful template structure:
  let type = 'unknown'
  let props: Record<string, unknown> = {}

  if (contentTypeId === 'componentHeroBanner' || contentTypeId === 'componentDuplex') {
    type = 'hero'
    
    // Safely extract text from Contentful Rich Text
    const bodyTextNodes = (fields['bodyText'] as { content?: RichTextNode[] })?.content || []
    let subheading = 'Click to edit subtitle'
    for (const node of bodyTextNodes) {
      if (node.nodeType === 'paragraph' && node.content?.[0]?.value) {
        subheading = node.content[0].value
        break
      }
    }

    props = {
      heading: fields['headline'] || fields['internalName'] || 'Welcome',
      subheading: subheading,
      ctaLabel: 'Learn More',
      ctaUrl: '/login',
    }
  } else if (contentTypeId === 'componentQuote') {
    type = 'testimonial'
    
    const quoteNodes = (fields['quote'] as { content?: RichTextNode[] })?.content || []
    let quoteText = 'Great product!'
    let authorText = 'Happy Customer'
    
    if (quoteNodes.length > 0 && quoteNodes[0].content?.[0]?.content?.[0]?.value) {
      quoteText = quoteNodes[0].content[0].content[0].value
    }
    if (quoteNodes.length > 1 && quoteNodes[1].content?.[1]?.value) {
      authorText = quoteNodes[1].content[1].value
    }

    props = {
      quote: quoteText,
      author: authorText,
      role: 'Customer',
    }
  }

  return {
    id: (fields['internalName'] as string) || sys.id || `section-${index}`,
    type,
    props,
  }
}

export class PageNotFoundError extends Error {
  constructor(slug: string) {
    super(`No page found in Contentful for slug: "${slug}"`)
    this.name = 'PageNotFoundError'
  }
}

export async function fetchAllPages(preview = false): Promise<Array<{ slug: string; title: string }>> {
  try {
    const client = getClient(preview)
    const response = await client.getEntries({
      content_type: 'page',
      select: ['fields.slug', 'fields.title', 'fields.pageName', 'fields.internalName'],
      limit: 100,
    } as Parameters<typeof client.getEntries>[0])

    return response.items
      .map(entry => {
        const f = entry.fields as Record<string, unknown>
        const slug = f['slug'] as string | undefined
        const title = (f['title'] || f['pageName'] || f['internalName'] || 'Untitled') as string
        return slug ? { slug, title } : null
      })
      .filter((p): p is { slug: string; title: string } => p !== null)
  } catch {
    return []
  }
}

export async function fetchPage(slug: string, preview = false): Promise<Page> {
  const client = getClient(preview)

  let response: Awaited<ReturnType<typeof client.getEntries>>
  try {
    response = await client.getEntries({
      content_type: 'page',
      'fields.slug': slug,
      include: 2,
      limit: 1,
    } as Parameters<typeof client.getEntries>[0])
  } catch (err) {
    if (err instanceof ContentfulError) throw err
    throw new ContentfulError(
      `Contentful API request failed for slug "${slug}"`,
      err
    )
  }

  if (response.items.length === 0) {
    throw new PageNotFoundError(slug)
  }

  const entry = response.items[0]
  const fields = entry.fields as Record<string, unknown>

  // Dynamically adapt arrays if the user is using standard Contentful templates
  let rawSections: unknown[] = []
  if (Array.isArray(fields['sections'])) {
    rawSections = fields['sections']
  } else {
    if (Array.isArray(fields['topSection'])) rawSections.push(...fields['topSection'])
    if (Array.isArray(fields['extraSection'])) rawSections.push(...fields['extraSection'])
  }

  // Map sections, silently dropping any that resolve to 'unknown' type so
  // a page with unsupported Contentful components still loads and renders —
  // the preview uses <UnsupportedSection> for anything outside the registry.
  const mappedSections = rawSections
    .map(mapSection)
    .filter(s => s.type !== 'unknown')

  const mappedPage = {
    pageId: (fields['pageId'] || fields['internalName'] || (entry as { sys?: { id?: string } }).sys?.id) as string,
    slug: fields['slug'],
    title: (fields['title'] || fields['pageName'] || 'Untitled Page') as string,
    sections: mappedSections,
  }

  return validatePage(mappedPage)
}
