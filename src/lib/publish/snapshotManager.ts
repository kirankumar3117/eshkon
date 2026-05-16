/**
 * Snapshot Manager — reads and writes immutable versioned releases via Contentful.
 *
 * Contentful content type "pageRelease":
 *   - slug        (Short text)
 *   - version     (Short text) — semver e.g. "1.0.0"
 *   - data        (JSON object) — full serialised Page
 *   - publishedAt (Short text) — ISO-8601 timestamp
 *
 * Snapshots are immutable: saveSnapshot throws if the version already exists.
 */
import semver from 'semver'
import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'
import { getManagementClient } from '@/lib/contentful/contentfulClient'

const RELEASE_CONTENT_TYPE = 'pageRelease'
const LOCALE = 'en-US'

export interface Snapshot {
  version: string
  page: Page
  publishedAt: string
}

function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(sortedStringify).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as object).sort()
    const pairs = keys.map(
      k => `${JSON.stringify(k)}:${sortedStringify((value as Record<string, unknown>)[k])}`
    )
    return `{${pairs.join(',')}}`
  }
  return JSON.stringify(value)
}

function isPageEqual(a: Page, b: Page): boolean {
  return sortedStringify(a) === sortedStringify(b)
}

async function getReleaseEntries(slug: string) {
  const { client, spaceId, environmentId } = getManagementClient()
  const result = await client.entry.getMany({
    spaceId,
    environmentId,
    query: { content_type: RELEASE_CONTENT_TYPE, 'fields.slug': slug, limit: 1000 },
  })
  return { client, spaceId, environmentId, items: result.items }
}

/** Saves an immutable snapshot. Throws if the version already exists. */
export async function saveSnapshot(slug: string, version: string, page: Page): Promise<void> {
  const { client, spaceId, environmentId, items } = await getReleaseEntries(slug)

  const alreadyExists = items.some(
    e => (e.fields.version as Record<string, string>)[LOCALE] === version
  )
  if (alreadyExists) {
    throw new Error(`Snapshot v${version} for "${slug}" already exists and cannot be overwritten.`)
  }

  await client.entry.create(
    { spaceId, environmentId, contentTypeId: RELEASE_CONTENT_TYPE },
    {
      fields: {
        slug: { [LOCALE]: slug },
        version: { [LOCALE]: version },
        data: { [LOCALE]: page },
        publishedAt: { [LOCALE]: new Date().toISOString() },
      },
    }
  )
}

/** Returns the highest-semver snapshot for a slug, or null if none exist. */
export async function getLatestSnapshot(slug: string): Promise<Snapshot | null> {
  const { items } = await getReleaseEntries(slug)
  if (items.length === 0) return null

  const versions = items
    .map(e => (e.fields.version as Record<string, string>)[LOCALE])
    .filter(v => semver.valid(v) !== null)

  if (versions.length === 0) return null

  const latest = semver.maxSatisfying(versions, '*')
  if (!latest) return null

  const entry = items.find(
    e => (e.fields.version as Record<string, string>)[LOCALE] === latest
  )!

  return {
    version: latest,
    page: validatePage((entry.fields.data as Record<string, unknown>)[LOCALE]),
    publishedAt: (entry.fields.publishedAt as Record<string, string>)[LOCALE],
  }
}

/**
 * Returns true when any existing snapshot for the slug has page content
 * identical to the provided page (key-order-stable deep comparison).
 */
export async function snapshotExists(slug: string, page: Page): Promise<boolean> {
  const { items } = await getReleaseEntries(slug)

  for (const entry of items) {
    try {
      const stored = validatePage((entry.fields.data as Record<string, unknown>)[LOCALE])
      if (isPageEqual(stored, page)) return true
    } catch {
      // skip corrupted entries
    }
  }

  return false
}
