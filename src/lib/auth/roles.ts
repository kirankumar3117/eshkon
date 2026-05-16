import type { Role } from '@/types/page'

export const ROLES = {
  viewer: 'viewer',
  editor: 'editor',
  publisher: 'publisher',
} as const

/** Returns true when the role can access /studio (read + edit draft). */
export function canAccessStudio(role: Role | null): boolean {
  return role === 'editor' || role === 'publisher'
}

/** Returns true when the role can call /api/publish. */
export function canPublish(role: Role | null): boolean {
  return role === 'publisher'
}

/** Parse a string to a Role, returning null if unrecognised. */
export function parseRole(value: unknown): Role | null {
  if (value === 'viewer' || value === 'editor' || value === 'publisher') {
    return value
  }
  return null
}
