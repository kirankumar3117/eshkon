/**
 * Maps raw Contentful API responses to our domain Page type.
 * Only imports from contentfulClient — never from 'contentful' directly.
 */
import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'
import { getClient, ContentfulError } from './contentfulClient'

// Shape of a resolved Contentful section entry's fields.
// Matches the "section" content type in Contentful.
interface RawSectionFields {
  id: unknown
  type: unknown
  props: unknown
}

// A resolved Contentful entry always has a `fields` property.
// Unresolved links (sys.type === 'Link') lack `fields` entirely.
interface ResolvedEntry {
  fields: Record<string, unknown>
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

  // Explicitly map each field — no spreading of raw data.
  return {
    id: raw.fields['id'],
    type: raw.fields['type'],
    props: raw.fields['props'] ?? {},
  }
}

/**
 * Fetches a page by slug from Contentful, maps the raw entry to the Page
 * domain type, and validates it through Zod before returning.
 *
 * Throws ContentfulError for network/API failures and PageValidationError
 * (from validatePage) if the Contentful data does not match the schema.
 */
export async function fetchPage(slug: string, preview = false): Promise<Page> {
  const client = getClient(preview)

  let response: Awaited<ReturnType<typeof client.getEntries>>
  try {
    response = await client.getEntries({
      content_type: 'page',
      'fields.slug': slug,
      include: 2, // depth 2 ensures sections are fully resolved
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
    throw new ContentfulError(`No page found for slug: "${slug}"`)
  }

  const entry = response.items[0]
  // Cast to a plain field map — Zod validates the shape below.
  const fields = entry.fields as Record<string, unknown>

  const rawSections = Array.isArray(fields['sections'])
    ? (fields['sections'] as unknown[])
    : []

  // Each field is mapped explicitly; no spreading of raw entry data.
  const mappedPage = {
    pageId: fields['pageId'],
    slug: fields['slug'],
    title: fields['title'],
    sections: rawSections.map(mapSection),
  }

  // validatePage throws PageValidationError on invalid data.
  return validatePage(mappedPage)
}
