'use client'

import { useEffect } from 'react'
import { StoreProvider } from '@/store/StoreProvider'
import { StudioLayout } from './StudioLayout'
import { useAppDispatch, useAppSelector } from '@/store'
import { loadPage } from '@/store/slices/draftPageSlice'
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

// Separate from StudioClient so it renders inside the StoreProvider and can
// access the Redux store while still being a 'use client' component.
function StudioInitializer({ initialPage, role }: Props) {
  const dispatch = useAppDispatch()
  const currentSlug = useAppSelector(s => s.draftPage.page?.slug)

  useEffect(() => {
    // Only overwrite if the persisted draft is for a different page.
    // If slug matches, preserve the user's in-progress edits.
    if (currentSlug !== initialPage.slug) {
      dispatch(loadPage(initialPage))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage.slug])

  return <StudioLayout role={role} />
}
