'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppDispatch, useAppSelector } from '@/store'
import { updateSectionProps } from '@/store/slices/draftPageSlice'
import { selectSection } from '@/store/slices/uiSlice'
import type { Section, HeroProps, TestimonialProps, CtaProps } from '@/types/page'

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  featureGrid: 'Feature Grid',
  testimonial: 'Testimonial',
  cta: 'Call to Action',
}

function HeroEditor({ section }: { section: Extract<Section, { type: 'hero' }> }) {
  const dispatch = useAppDispatch()
  const { heading, subheading, ctaLabel, ctaUrl } = section.props

  function update(field: keyof HeroProps, value: string) {
    dispatch(
      updateSectionProps({
        sectionId: section.id,
        props: { ...section.props, [field]: value },
      })
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-heading`}>Heading</Label>
        <Input
          id={`${section.id}-heading`}
          value={heading}
          onChange={e => update('heading', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-subheading`}>Subheading</Label>
        <Input
          id={`${section.id}-subheading`}
          value={subheading}
          onChange={e => update('subheading', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-ctaLabel`}>CTA Label</Label>
        <Input
          id={`${section.id}-ctaLabel`}
          value={ctaLabel}
          onChange={e => update('ctaLabel', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-ctaUrl`}>CTA URL</Label>
        <Input
          id={`${section.id}-ctaUrl`}
          value={ctaUrl}
          onChange={e => update('ctaUrl', e.target.value)}
          aria-required="true"
        />
      </div>
    </div>
  )
}

function TestimonialEditor({
  section,
}: {
  section: Extract<Section, { type: 'testimonial' }>
}) {
  const dispatch = useAppDispatch()
  const { quote, author, role, avatarUrl } = section.props

  function update(field: keyof TestimonialProps, value: string) {
    dispatch(
      updateSectionProps({
        sectionId: section.id,
        props: { ...section.props, [field]: value },
      })
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-quote`}>Quote</Label>
        <Input
          id={`${section.id}-quote`}
          value={quote}
          onChange={e => update('quote', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-author`}>Author</Label>
        <Input
          id={`${section.id}-author`}
          value={author}
          onChange={e => update('author', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-role`}>Role (optional)</Label>
        <Input
          id={`${section.id}-role`}
          value={role ?? ''}
          onChange={e => update('role', e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-avatarUrl`}>Avatar URL (optional)</Label>
        <Input
          id={`${section.id}-avatarUrl`}
          value={avatarUrl ?? ''}
          onChange={e => update('avatarUrl', e.target.value)}
        />
      </div>
    </div>
  )
}

function CtaEditor({
  section,
}: {
  section: Extract<Section, { type: 'cta' }>
}) {
  const dispatch = useAppDispatch()
  const { label, url } = section.props

  function update(field: keyof CtaProps, value: string) {
    dispatch(
      updateSectionProps({
        sectionId: section.id,
        props: { ...section.props, [field]: value },
      })
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-label`}>Label</Label>
        <Input
          id={`${section.id}-label`}
          value={label}
          onChange={e => update('label', e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${section.id}-url`}>URL</Label>
        <Input
          id={`${section.id}-url`}
          value={url}
          onChange={e => update('url', e.target.value)}
          aria-required="true"
        />
      </div>
    </div>
  )
}

function FeatureGridEditor() {
  return (
    <p className="text-sm text-muted-foreground">
      Feature Grid content is managed in Contentful. Re-fetch to see changes.
    </p>
  )
}

export function StudioPanel() {
  const dispatch = useAppDispatch()
  const selectedSectionId = useAppSelector(s => s.ui.selectedSectionId)
  const section = useAppSelector(s =>
    s.draftPage.page?.sections.find(sec => sec.id === selectedSectionId)
  )
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  // Move focus to first input when a new section is selected
  useEffect(() => {
    if (section) {
      firstInputRef.current?.focus()
    }
  }, [section?.id])

  function handleClose() {
    dispatch(selectSection(null))
  }

  if (!section) return null

  return (
    <aside
      aria-label="Section properties"
      className="w-80 shrink-0 border-l bg-background overflow-y-auto flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-semibold">
          {SECTION_LABELS[section.type] ?? section.type}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          aria-label="Close properties panel"
        >
          ✕
        </Button>
      </div>

      <div className="p-4 flex-1">
        {section.type === 'hero' && (
          <HeroEditor section={section} />
        )}
        {section.type === 'testimonial' && (
          <TestimonialEditor section={section} />
        )}
        {section.type === 'cta' && (
          <CtaEditor section={section} />
        )}
        {section.type === 'featureGrid' && (
          <FeatureGridEditor />
        )}
      </div>

      <Separator />
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          Section ID: <code className="font-mono">{section.id}</code>
        </p>
      </div>
    </aside>
  )
}


