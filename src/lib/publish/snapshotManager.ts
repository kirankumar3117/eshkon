/**
 * Snapshot Manager — reads and writes immutable versioned releases.
 *
 * File layout:  releases/<slug>/<version>.json
 * Each file:    { version: string, page: Page, publishedAt: string }
 *
 * Snapshots are immutable: saveSnapshot throws if the target file already exists.
 */
import { promises as fs } from 'fs'
import path from 'path'
import semver from 'semver'
import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'

const RELEASES_DIR = path.join(process.cwd(), 'releases')

export interface Snapshot {
  version: string
  page: Page
  publishedAt: string
}

function slugDir(slug: string): string {
  return path.join(RELEASES_DIR, slug)
}

function snapshotPath(slug: string, version: string): string {
  return path.join(slugDir(slug), `${version}.json`)
}

// Stable comparison that normalises key ordering in plain objects.
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

/** Saves an immutable snapshot. Throws if the version file already exists. */
export async function saveSnapshot(
  slug: string,
  version: string,
  page: Page
): Promise<void> {
  await fs.mkdir(slugDir(slug), { recursive: true })

  const filePath = snapshotPath(slug, version)

  // Guard against overwrites — snapshots are immutable once written.
  try {
    await fs.access(filePath)
    throw new Error(
      `Snapshot v${version} for "${slug}" already exists and cannot be overwritten.`
    )
  } catch (err) {
    // ENOENT means the file doesn't exist yet — that's what we want.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  const snapshot: Snapshot = {
    version,
    page,
    publishedAt: new Date().toISOString(),
  }

  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8')
}

/** Returns the highest-semver snapshot for a slug, or null if none exist. */
export async function getLatestSnapshot(slug: string): Promise<Snapshot | null> {
  let files: string[]
  try {
    files = await fs.readdir(slugDir(slug))
  } catch {
    // Directory doesn't exist yet — no snapshots published.
    return null
  }

  const validVersions = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .filter(v => semver.valid(v) !== null)

  if (validVersions.length === 0) return null

  const latest = semver.maxSatisfying(validVersions, '*')
  if (!latest) return null

  const raw = await fs.readFile(snapshotPath(slug, latest), 'utf-8')
  const data = JSON.parse(raw) as Snapshot

  // Re-validate to catch any on-disk corruption.
  return { version: data.version, page: validatePage(data.page), publishedAt: data.publishedAt }
}

/**
 * Returns true when any existing snapshot for the slug has page content
 * identical to the provided page (key-order-stable deep comparison).
 * Used as an idempotency guard before publishing.
 */
export async function snapshotExists(slug: string, page: Page): Promise<boolean> {
  let files: string[]
  try {
    files = await fs.readdir(slugDir(slug))
  } catch {
    return false
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'))

  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(slugDir(slug), file), 'utf-8')
      const data = JSON.parse(raw) as Snapshot
      if (isPageEqual(data.page, page)) return true
    } catch {
      // Skip corrupted files.
    }
  }

  return false
}
