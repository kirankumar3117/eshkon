import { promises as fs } from 'fs'
import path from 'path'
import semver from 'semver'
import type { Page } from '@/types/page'
import { validatePage } from '@/schemas/pageSchema'

const RELEASES_DIR = process.env.VERCEL
  ? '/tmp/releases'
  : path.join(process.cwd(), 'releases')

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
  await fs.mkdir(slugDir(slug), { recursive: true })

  // Each version is written once and never overwritten — immutable releases.
  const dest = snapshotPath(slug, version)
  try {
    await fs.access(dest)
    throw new Error(`Snapshot ${version} already exists for slug "${slug}"`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  const snapshot: Snapshot = { version, page, publishedAt: new Date().toISOString() }
  await fs.writeFile(dest, JSON.stringify(snapshot, null, 2), 'utf-8')
}

export async function getLatestSnapshot(slug: string): Promise<Snapshot | null> {
  let files: string[]
  try {
    files = await fs.readdir(slugDir(slug))
  } catch {
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
  return { version: data.version, page: validatePage(data.page), publishedAt: data.publishedAt }
}

export async function snapshotExists(slug: string, page: Page): Promise<boolean> {
  let files: string[]
  try {
    files = await fs.readdir(slugDir(slug))
  } catch {
    return false
  }

  for (const file of files.filter(f => f.endsWith('.json'))) {
    try {
      const raw = await fs.readFile(path.join(slugDir(slug), file), 'utf-8')
      const data = JSON.parse(raw) as Snapshot
      if (isPageEqual(data.page, page)) return true
    } catch {
      // skip corrupted files
    }
  }

  return false
}
