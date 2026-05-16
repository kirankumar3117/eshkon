'use client'

import { useState } from 'react'
import { GripVertical, Trash2, ChevronUp, ChevronDown, Monitor, Smartphone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SectionErrorBoundary } from '@/components/sections/SectionErrorBoundary'
import { UnsupportedSection } from '@/components/sections/UnsupportedSection'
import { renderSection } from '@/lib/registry/sectionRegistry'
import { StudioPanel } from '@/components/StudioPanel'
import { PublishButton } from '@/components/PublishButton'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  addSection,
  removeSection,
  reorderSections,
} from '@/store/slices/draftPageSlice'
import { selectSection, setPreviewMode } from '@/store/slices/uiSlice'
import type { Section, SectionType, Role } from '@/types/page'

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  featureGrid: 'Feature Grid',
  testimonial: 'Testimonial',
  cta: 'Call to Action',
}

const SECTION_TYPES: SectionType[] = ['hero', 'featureGrid', 'testimonial', 'cta']

const DEFAULT_PROPS: Record<SectionType, Record<string, unknown>> = {
  hero: {
    heading: 'New Hero Section',
    subheading: 'Enter your subheading here',
    ctaLabel: 'Get Started',
    ctaUrl: '#',
  },
  featureGrid: {
    features: [{ title: 'Feature 1', description: 'Describe this feature' }],
  },
  testimonial: {
    quote: 'Enter testimonial quote here',
    author: 'Author Name',
  },
  cta: {
    label: 'Call to Action',
    url: '#',
    variant: 'primary',
  },
}

function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

interface SectionItemProps {
  section: Section
  index: number
  total: number
}

function SectionItem({ section, index, total }: SectionItemProps) {
  const dispatch = useAppDispatch()
  const selectedSectionId = useAppSelector(s => s.ui.selectedSectionId)
  const isSelected = selectedSectionId === section.id
  const label = SECTION_TYPE_LABELS[section.type] ?? section.type

  const [dragOver, setDragOver] = useState(false)

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!isNaN(fromIndex) && fromIndex !== index) {
      dispatch(reorderSections({ fromIndex, toIndex: index }))
    }
  }

  function handleSelect() {
    dispatch(selectSection(isSelected ? null : section.id))
  }

  function handleMoveUp() {
    if (index > 0) dispatch(reorderSections({ fromIndex: index, toIndex: index - 1 }))
  }

  function handleMoveDown() {
    if (index < total - 1)
      dispatch(reorderSections({ fromIndex: index, toIndex: index + 1 }))
  }

  function handleRemove() {
    dispatch(removeSection(section.id))
    if (isSelected) dispatch(selectSection(null))
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'flex items-center gap-2 rounded-md border px-2 py-2 text-sm',
        'transition-colors cursor-default',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50',
        dragOver ? 'border-primary/60 bg-primary/10' : '',
      ].join(' ')}
      aria-current={isSelected ? 'true' : undefined}
    >
      {/* Drag handle — decorative for mouse users */}
      <span
        className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        aria-hidden="true"
      >
        <GripVertical size={16} />
      </span>

      {/* Section label button */}
      <button
        onClick={handleSelect}
        className="flex-1 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${label} section`}
      >
        {label}
      </button>

      {/* Keyboard-accessible reorder controls (WCAG 2.2 keyboard alternative) */}
      <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`Reorder ${label}`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleMoveUp}
          disabled={index === 0}
          aria-label={`Move ${label} up`}
        >
          <ChevronUp size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${label} down`}
        >
          <ChevronDown size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={handleRemove}
          aria-label={`Remove ${label} section`}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}

function AddSectionMenu() {
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)

  function handleAdd(type: SectionType) {
    const newSection = {
      id: generateSectionId(),
      type,
      props: DEFAULT_PROPS[type],
    } as unknown as Section
    dispatch(addSection(newSection))
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="add-section-menu"
      >
        <Plus size={14} /> Add Section
      </Button>

      {open && (
        <div
          id="add-section-menu"
          role="menu"
          aria-label="Choose section type"
          className="absolute bottom-full mb-1 left-0 right-0 rounded-md border bg-popover shadow-md z-10"
        >
          {SECTION_TYPES.map(type => (
            <button
              key={type}
              role="menuitem"
              onClick={() => handleAdd(type)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
            >
              {SECTION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface StudioLayoutProps {
  role: Role | null
}

export function StudioLayout({ role }: StudioLayoutProps) {
  const dispatch = useAppDispatch()
  const page = useAppSelector(s => s.draftPage.page)
  const isDirty = useAppSelector(s => s.draftPage.isDirty)
  const previewMode = useAppSelector(s => s.ui.previewMode)

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading studio…
      </div>
    )
  }

  const knownTypes = new Set<string>(['hero', 'featureGrid', 'testimonial', 'cta'])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Header / Toolbar ─────────────────────────────── */}
      <header className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold truncate max-w-xs">
            Studio: {page.title}
          </h1>
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Preview mode toggle */}
          <div
            role="group"
            aria-label="Preview mode"
            className="flex items-center border rounded-md overflow-hidden"
          >
            <button
              onClick={() => dispatch(setPreviewMode('desktop'))}
              aria-pressed={previewMode === 'desktop'}
              aria-label="Desktop preview"
              className={[
                'px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                previewMode === 'desktop'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              ].join(' ')}
            >
              <Monitor size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => dispatch(setPreviewMode('mobile'))}
              aria-pressed={previewMode === 'mobile'}
              aria-label="Mobile preview"
              className={[
                'px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                previewMode === 'mobile'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              ].join(' ')}
            >
              <Smartphone size={16} aria-hidden="true" />
            </button>
          </div>

          <Separator orientation="vertical" className="h-6" />
          <PublishButton slug={page.slug} role={role} />
        </div>
      </header>

      {/* ── Main 3-panel layout ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Section list */}
        <aside
          aria-label="Page sections"
          className="w-64 shrink-0 border-r flex flex-col bg-muted/20 overflow-y-auto"
        >
          <div className="p-3 border-b">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sections
            </h2>
          </div>

          <ul
            role="list"
            aria-label="Section list"
            className="flex-1 p-2 grid gap-1"
          >
            {page.sections.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No sections yet.
              </li>
            )}
            {page.sections.map((section, index) => (
              <li key={section.id}>
                <SectionItem
                  section={section}
                  index={index}
                  total={page.sections.length}
                />
              </li>
            ))}
          </ul>

          <div className="p-2 border-t">
            <AddSectionMenu />
          </div>
        </aside>

        {/* Center — Live preview */}
        <main
          id="main-content"
          role="region"
          aria-label="Page preview"
          className="flex-1 overflow-y-auto bg-white"
        >
          <div
            className={[
              'transition-all mx-auto',
              previewMode === 'mobile' ? 'max-w-[390px] border-x shadow-sm' : 'max-w-none',
            ].join(' ')}
          >
            {page.sections.length === 0 && (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Add sections from the panel on the left.
              </div>
            )}
            {page.sections.map(section => (
              <SectionErrorBoundary key={section.id} sectionId={section.id}>
                {knownTypes.has(section.type)
                  ? renderSection(section as Section)
                  : <UnsupportedSection type={section.type} />
                }
              </SectionErrorBoundary>
            ))}
          </div>
        </main>

        {/* Right — Prop editor (visible when section selected) */}
        <StudioPanel />
      </div>
    </div>
  )
}
