import path from 'path'
import semver from 'semver'
import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'
import { storage } from '@/lib/storage'

export interface Snapshot {
  version: string
  page: Page
  publishedAt: string
}

function snapshotKey(slug: string, version: string): string {
  return `releases/${slug}/${version}.json`
}

function snapshotPrefix(slug: string): string {
  return `releases/${slug}`
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

export async function saveSnapshot(slug: string, version: string, page: Page): Promise<void> {
  const key = snapshotKey(slug, version)

  // Each version is written once — immutable releases
  if (await storage.exists(key)) {
    throw new Error(`Snapshot ${version} already exists for slug "${slug}"`)
  }

  const snapshot: Snapshot = { version, page, publishedAt: new Date().toISOString() }
  await storage.write(key, JSON.stringify(snapshot, null, 2))
}

export async function getLatestSnapshot(slug: string): Promise<Snapshot | null> {
  const keys = await storage.list(snapshotPrefix(slug))

  const validVersions = keys
    .map(k => path.basename(k).replace(/\.json$/, ''))
    .filter(v => semver.valid(v) !== null)

  if (validVersions.length === 0) return null

  const latest = semver.maxSatisfying(validVersions, '*')
  if (!latest) return null

  const raw = await storage.read(snapshotKey(slug, latest))
  if (!raw) return null

  try {
    const data = JSON.parse(raw) as Snapshot
    return { version: data.version, page: validatePage(data.page), publishedAt: data.publishedAt }
  } catch {
    return null
  }
}

export async function snapshotExists(slug: string, page: Page): Promise<boolean> {
  const keys = await storage.list(snapshotPrefix(slug))

  for (const key of keys) {
    try {
      const raw = await storage.read(key)
      if (!raw) continue
      const data = JSON.parse(raw) as Snapshot
      if (isPageEqual(data.page, page)) return true
    } catch {
      // skip corrupted entries
    }
  }

  return false
}

