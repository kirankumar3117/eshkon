'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppDispatch, useAppSelector } from '@/store'
import { startPublish, publishSuccess, publishFailure } from '@/store/slices/publishSlice'
import type { Role } from '@/types/page'

interface PublishButtonProps {
  slug: string
  role: Role | null
}

export function PublishButton({ slug, role }: PublishButtonProps) {
  const dispatch = useAppDispatch()
  const status = useAppSelector(s => s.publish.status)
  const lastVersion = useAppSelector(s => s.publish.lastVersion)
  const changelog = useAppSelector(s => s.publish.changelog)
  const publishError = useAppSelector(s => s.publish.error)
  // Send the current draft page so the API publishes exactly what the user edited.
  const draftPage = useAppSelector(s => s.draftPage.page)

  const canPublish = role === 'publisher'
  const isPublishing = status === 'publishing'

  async function handlePublish() {
    if (!canPublish) return
    dispatch(startPublish())

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, page: draftPage }),
      })

      const data = (await res.json()) as {
        version?: string
        changelog?: string[]
        error?: string
        idempotent?: boolean
      }

      if (!res.ok) {
        dispatch(publishFailure(data.error ?? 'Publish failed'))
        return
      }

      dispatch(
        publishSuccess({
          version: data.version ?? '1.0.0',
          changelog: data.idempotent
            ? 'Already up to date — no changes to publish.'
            : (data.changelog ?? []).join('\n'),
        })
      )
    } catch {
      dispatch(publishFailure('Network error — please try again.'))
    }
  }

  const button = (
    <Button
      onClick={handlePublish}
      disabled={!canPublish || isPublishing}
      aria-disabled={!canPublish || isPublishing}
      aria-label={
        isPublishing
          ? 'Publishing…'
          : canPublish
            ? 'Publish this page'
            : 'Publishing requires publisher role'
      }
      className="min-w-[100px]"
    >
      {isPublishing ? 'Publishing…' : 'Publish'}
    </Button>
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <TooltipProvider>
        {canPublish ? (
          button
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>Only publishers can deploy releases.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>

      {status === 'success' && lastVersion && (
        <p
          role="status"
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          Published v{lastVersion}
          {changelog ? ` — ${changelog}` : ''}
        </p>
      )}

      {status === 'error' && (
        <p
          role="alert"
          className="text-xs text-destructive"
          aria-live="assertive"
        >
          {publishError}
        </p>
      )}
    </div>
  )
}
