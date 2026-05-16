/**
 * Storage abstraction with three tiers:
 *
 *  1. BLOB_READ_WRITE_TOKEN set  → Vercel Blob  (persistent, shared across instances)
 *  2. VERCEL env set, no token   → /tmp          (ephemeral fallback, never crashes)
 *  3. Neither                    → .storage/     (local dev filesystem)
 *
 * All keys are slash-separated paths, e.g. "releases/home/1.0.0.json"
 */

import fs from 'fs/promises'
import path from 'path'

const HAS_BLOB  = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const ON_VERCEL = Boolean(process.env.VERCEL)

// Local root: /tmp on Vercel (no Blob), .storage/ everywhere else
const LOCAL_ROOT = ON_VERCEL && !HAS_BLOB
  ? '/tmp/page-studio'
  : path.join(process.cwd(), '.storage')

// ── Filesystem backend ────────────────────────────────────────────────────

async function fsRead(key: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(LOCAL_ROOT, key), 'utf-8')
  } catch {
    return null
  }
}

async function fsWrite(key: string, data: string): Promise<void> {
  const fullPath = path.join(LOCAL_ROOT, key)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, data, 'utf-8')
}

async function fsList(prefix: string): Promise<string[]> {
  const dir = path.join(LOCAL_ROOT, prefix)
  try {
    const files = await fs.readdir(dir)
    return files.map(f => `${prefix}/${f}`)
  } catch {
    return []
  }
}

async function fsExists(key: string): Promise<boolean> {
  try {
    await fs.access(path.join(LOCAL_ROOT, key))
    return true
  } catch {
    return false
  }
}

// ── Vercel Blob backend ───────────────────────────────────────────────────

async function blobRead(key: string): Promise<string | null> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: key, limit: 1 })
  const match = blobs.find(b => b.pathname === key)
  if (!match) return null
  const res = await fetch(match.url)
  if (!res.ok) return null
  return res.text()
}

async function blobWrite(key: string, data: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(key, data, { access: 'public', addRandomSuffix: false })
}

async function blobList(prefix: string): Promise<string[]> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix })
  return blobs.map(b => b.pathname)
}

async function blobExists(key: string): Promise<boolean> {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: key, limit: 1 })
  return blobs.some(b => b.pathname === key)
}

// ── Public API ────────────────────────────────────────────────────────────

export const storage = {
  read:   (key: string)               => HAS_BLOB ? blobRead(key)        : fsRead(key),
  write:  (key: string, data: string) => HAS_BLOB ? blobWrite(key, data) : fsWrite(key, data),
  list:   (prefix: string)            => HAS_BLOB ? blobList(prefix)     : fsList(prefix),
  exists: (key: string)               => HAS_BLOB ? blobExists(key)      : fsExists(key),
}

// Log which backend is active (server-side only, visible in Vercel function logs)
if (typeof window === 'undefined') {
  const backend = HAS_BLOB ? 'Vercel Blob' : ON_VERCEL ? `/tmp (ephemeral)` : LOCAL_ROOT
  console.log(`[storage] backend: ${backend}`)
}
