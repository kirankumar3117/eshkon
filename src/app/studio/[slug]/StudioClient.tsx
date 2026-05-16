'use client'

import { useEffect } from 'react'
import { StoreProvider } from '@/store/StoreProvider'
import { StudioLayout } from './StudioLayout'
import { useAppDispatch } from '@/store'
import { loadPage } from '@/store/slices/draftPageSlice'
import { validatePage } from '@/schemas/pageSchema'
import type { Page, Role } from '@/types/page'

interface Props {
  initialPage: Page
  role: Role | null
}

export function StudioClient({ initialPage, role }: Props) {
  return (
    <StoreProvider>
      <StudioInitializer initialPage={initialPage} role={role} />
    </StoreProvider>
  )
}

function StudioInitializer({ initialPage, role }: Props) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    async function init() {
      // Try to load the server-side draft so editors and publishers share the same state.
      try {
        const res = await fetch(`/api/draft/${initialPage.slug}`)
        if (res.ok) {
          const raw = await res.json()
          const draft = validatePage(raw) // reject corrupt drafts before they reach Redux
          dispatch(loadPage(draft))
          return
        }
      } catch {
        // Draft missing, invalid, or network error — fall through to Contentful page
      }
      // No server draft yet: load the Contentful source as the starting point
      dispatch(loadPage(initialPage))
    }
    init()
  // Re-run only if the slug changes (navigating between studio pages)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage.slug])

  return <StudioLayout role={role} />
}
