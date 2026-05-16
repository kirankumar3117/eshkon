import { createClient } from 'contentful-management'
import type { Page } from '@/types/page'

function buildClient() {
  const accessToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN
  if (!accessToken) throw new Error('Missing CONTENTFUL_MANAGEMENT_TOKEN env var')
  return createClient({ accessToken }, { type: 'plain', defaults: {
    spaceId: process.env.CONTENTFUL_SPACE_ID!,
    environmentId: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
  }})
}

let _client: ReturnType<typeof buildClient> | null = null

function getClient() {
  if (!_client) _client = buildClient()
  return _client
}

/**
 * Writes the published page back to Contentful and publishes it live.
 *
 * Requires the page content type to have a JSON field called `sections`
 * where each item is { id, type, props }.
 */
export async function publishPageToContentful(page: Page): Promise<void> {
  const client = getClient()
  const locale = 'en-US'

  // Fetch the current entry so we can patch fields without losing others
  const entry = await client.entry.get({ entryId: page.pageId })

  entry.fields.title = { [locale]: page.title }
  entry.fields.sections = {
    [locale]: page.sections.map(s => ({
      id: s.id,
      type: s.type,
      props: s.props,
    })),
  }

  const updated = await client.entry.update(
    { entryId: page.pageId },
    entry
  )

  await client.entry.publish(
    { entryId: page.pageId },
    updated
  )
}
