import type { Page } from '@/types/page'

export type BumpType = 'major' | 'minor' | 'patch' | 'none'

export interface BumpResult {
  bump: BumpType
  changelog: string[]
}

// Required prop keys per section type — keep in sync with pageSchema.ts.
const REQUIRED_PROPS: Readonly<Record<string, ReadonlySet<string>>> = {
  hero: new Set(['heading', 'subheading', 'ctaLabel', 'ctaUrl']),
  featureGrid: new Set(['features']),
  testimonial: new Set(['quote', 'author']),
  cta: new Set(['label', 'url']),
}

const BUMP_ORDER: Record<BumpType, number> = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3,
}

function promoteBump(current: BumpType, candidate: BumpType): BumpType {
  return BUMP_ORDER[candidate] > BUMP_ORDER[current] ? candidate : current
}

// Recursive deep equality that handles arbitrary key ordering in plain objects.
// Safe for the Page type: no functions, Dates, Maps, circular references.
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]))
  }

  const aRec = a as Record<string, unknown>
  const bRec = b as Record<string, unknown>
  const aKeys = Object.keys(aRec).sort()
  const bKeys = Object.keys(bRec).sort()

  if (aKeys.length !== bKeys.length) return false
  if (!aKeys.every((k, i) => k === bKeys[i])) return false
  return aKeys.every(k => deepEqual(aRec[k], bRec[k]))
}

/**
 * Calculates the semver bump level between two page snapshots.
 *
 * Rules (highest-wins):
 *   major — section removed | section type changed | required prop removed | slug changed
 *   minor — section added   | optional/required prop added
 *   patch — prop value changed | sections reordered | title changed | optional prop removed
 *   none  — pages are deeply equal (idempotent publish guard)
 */
export function calculateBump(previous: Page, current: Page): BumpResult {
  // Rule 1: identical → no bump
  if (deepEqual(previous, current)) {
    return { bump: 'none', changelog: [] }
  }

  let bump: BumpType = 'none'
  const changelog: string[] = []

  function record(level: BumpType, message: string) {
    bump = promoteBump(bump, level)
    changelog.push(message)
  }

  // ── Page-level identity fields ──────────────────────────────────────────
  if (previous.slug !== current.slug) {
    record('major', `Slug changed from "${previous.slug}" to "${current.slug}"`)
  }
  if (previous.title !== current.title) {
    record('patch', `Title updated from "${previous.title}" to "${current.title}"`)
  }

  // ── Build section lookup maps ───────────────────────────────────────────
  const prevMap = new Map(previous.sections.map(s => [s.id, s]))
  const currMap = new Map(current.sections.map(s => [s.id, s]))

  // Rule 3: section removed → major
  for (const [id, section] of prevMap) {
    if (!currMap.has(id)) {
      record('major', `Removed "${section.type}" section (id: ${id})`)
    }
  }

  // Rule 4: section type changed → major
  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id)
    if (prev && prev.type !== curr.type) {
      record(
        'major',
        `Section ${id} type changed from "${prev.type}" to "${curr.type}"`
      )
    }
  }

  // Rule 5: section added → minor
  for (const [id, section] of currMap) {
    if (!prevMap.has(id)) {
      record('minor', `Added "${section.type}" section (id: ${id})`)
    }
  }

  // Ordering changed (same ids present, different sequence) → patch
  const prevOrder = previous.sections.map(s => s.id)
  const currOrder = current.sections.map(s => s.id)
  const sameIdSet =
    prevOrder.length === currOrder.length &&
    new Set([...prevOrder, ...currOrder]).size === prevOrder.length
  if (sameIdSet && prevOrder.join('\0') !== currOrder.join('\0')) {
    record('patch', 'Section order changed')
  }

  // Rule 6: prop-level diff (sections present in both with same type)
  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id)
    if (!prev || prev.type !== curr.type) continue

    const prevProps = prev.props as unknown as Record<string, unknown>
    const currProps = curr.props as unknown as Record<string, unknown>
    const required = REQUIRED_PROPS[curr.type] ?? (new Set<string>())

    // Props removed
    for (const key of Object.keys(prevProps)) {
      if (!(key in currProps)) {
        if (required.has(key)) {
          record('major', `Required prop "${key}" removed from section ${id}`)
        } else {
          record('patch', `Optional prop "${key}" removed from section ${id}`)
        }
      }
    }

    // Props added
    for (const key of Object.keys(currProps)) {
      if (!(key in prevProps)) {
        record(
          'minor',
          `${required.has(key) ? 'Required' : 'Optional'} prop "${key}" added to section ${id}`
        )
      }
    }

    // Prop values changed
    for (const key of Object.keys(currProps)) {
      if (key in prevProps && !deepEqual(prevProps[key], currProps[key])) {
        record('patch', `Prop "${key}" updated in section ${id}`)
      }
    }
  }

  return { bump, changelog }
}
