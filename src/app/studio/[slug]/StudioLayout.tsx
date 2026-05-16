'use client'

import { useState } from 'react'
import {
  GripVertical, Trash2, ChevronUp, ChevronDown,
  Monitor, Smartphone, Plus, Save, Check, AlertCircle,
  LayoutTemplate, Quote, MousePointerClick, Grid2X2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
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

// ── Section type metadata ──────────────────────────────────────────────────

const SECTION_META: Record<SectionType, {
  label: string
  description: string
  color: string
  dot: string
  Icon: LucideIcon
}> = {
  hero: {
    label: 'Hero',
    description: 'Full-width banner with headline, sub-text and a CTA button.',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    dot: 'bg-blue-500',
    Icon: LayoutTemplate,
  },
  featureGrid: {
    label: 'Feature Grid',
    description: 'Grid of feature cards with title and description.',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    dot: 'bg-purple-500',
    Icon: Grid2X2,
  },
  testimonial: {
    label: 'Testimonial',
    description: 'Pull-quote with author name, role, and avatar.',
    color: 'bg-green-50 border-green-200 hover:border-green-400',
    dot: 'bg-green-500',
    Icon: Quote,
  },
  cta: {
    label: 'Call to Action',
    description: 'Prominent button or link to drive conversions.',
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    dot: 'bg-orange-500',
    Icon: MousePointerClick,
  },
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
    variant: 'primary' as const,
  },
}

function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Section item in the left panel ────────────────────────────────────────

interface SectionItemProps {
  section: Section
  index: number
  total: number
}

function SectionItem({ section, index, total }: SectionItemProps) {
  const dispatch = useAppDispatch()
  const selectedSectionId = useAppSelector(s => s.ui.selectedSectionId)
  const isSelected = selectedSectionId === section.id
  const meta = SECTION_META[section.type]
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
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={[
        'group flex items-center gap-2 rounded-lg border px-2 py-2.5 text-sm transition-all',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-background hover:border-primary/40 hover:shadow-sm',
        dragOver ? 'border-primary bg-primary/10 scale-[1.01]' : '',
      ].join(' ')}
    >
      <span className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" aria-hidden="true">
        <GripVertical size={14} />
      </span>

      {/* Color dot */}
      {meta && (
        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
      )}

      <button
        onClick={handleSelect}
        className="flex-1 text-left font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${meta?.label ?? section.type} section`}
      >
        {meta?.label ?? section.type}
      </button>

      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        role="group"
        aria-label={`Reorder ${meta?.label ?? section.type}`}
      >
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleMoveUp} disabled={index === 0} aria-label="Move up">
          <ChevronUp size={12} />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleMoveDown} disabled={index === total - 1} aria-label="Move down">
          <ChevronDown size={12} />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemove} aria-label="Remove section">
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  )
}

// ── Add Section Dialog ─────────────────────────────────────────────────────

function AddSectionDialog() {
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
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 border-dashed"
        onClick={() => setOpen(true)}
        aria-label="Add a new section"
      >
        <Plus size={14} />
        Add Section
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Section</DialogTitle>
            <DialogDescription>
              Choose a section type to insert at the end of the page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {SECTION_TYPES.map(type => {
              const meta = SECTION_META[type]
              const Icon = meta.Icon
              return (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className={[
                    'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    meta.color,
                  ].join(' ')}
                >
                  <Icon size={20} className="text-foreground/70" />
                  <div>
                    <p className="font-semibold text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {meta.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Save Draft button ──────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveDraftButton({ slug }: { slug: string }) {
  const draftPage = useAppSelector(s => s.draftPage.page)
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function handleSave() {
    if (!draftPage || status === 'saving') return
    setStatus('saving')
    try {
      const res = await fetch(`/api/draft/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPage),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    }
    // Reset to idle after 3s so the button is ready again
    setTimeout(() => setStatus('idle'), 3000)
  }

  const icons = {
    idle: <Save size={14} />,
    saving: <Save size={14} className="animate-pulse" />,
    saved: <Check size={14} className="text-green-600" />,
    error: <AlertCircle size={14} className="text-destructive" />,
  }

  const labels = {
    idle: 'Save Draft',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Failed',
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={status === 'saving'}
      className={[
        'gap-1.5 min-w-[100px]',
        status === 'saved' ? 'border-green-400 text-green-700' : '',
        status === 'error' ? 'border-destructive text-destructive' : '',
      ].join(' ')}
      aria-label={labels[status]}
    >
      {icons[status]}
      {labels[status]}
    </Button>
  )
}

// ── Main studio layout ─────────────────────────────────────────────────────

interface StudioLayoutProps {
  role: Role | null
}

export function StudioLayout({ role }: StudioLayoutProps) {
  const dispatch = useAppDispatch()
  const page = useAppSelector(s => s.draftPage.page)
  const isDirty = useAppSelector(s => s.draftPage.isDirty)
  const previewMode = useAppSelector(s => s.ui.previewMode)
  const sectionCount = useAppSelector(s => s.draftPage.page?.sections.length ?? 0)

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm gap-2">
        <Save size={16} className="animate-pulse" />
        Loading studio…
      </div>
    )
  }

  const knownTypes = new Set<string>(['hero', 'featureGrid', 'testimonial', 'cta'])

  return (
    <div className="flex flex-col h-screen bg-muted/10">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-2.5 shrink-0 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold truncate">{page.title}</h1>
          {isDirty && (
            <Badge variant="secondary" className="text-xs shrink-0">Unsaved</Badge>
          )}
          {role && (
            <Badge variant="outline" className="text-xs capitalize shrink-0">
              {role}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Preview toggle */}
          <div
            role="group"
            aria-label="Preview mode"
            className="flex items-center border rounded-md overflow-hidden"
          >
            {(['desktop', 'mobile'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => dispatch(setPreviewMode(mode))}
                aria-pressed={previewMode === mode}
                aria-label={`${mode} preview`}
                className={[
                  'px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  previewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                ].join(' ')}
              >
                {mode === 'desktop' ? <Monitor size={15} aria-hidden="true" /> : <Smartphone size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          <SaveDraftButton slug={page.slug} />
          <PublishButton slug={page.slug} role={role} />
        </div>
      </header>

      {/* ── 3-panel body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Screen-reader live region for section list changes */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {sectionCount === 0 ? 'No sections' : `${sectionCount} section${sectionCount === 1 ? '' : 's'}`}
        </div>

        {/* Left — sections list */}
        <aside
          aria-label="Page sections"
          className="w-60 shrink-0 border-r flex flex-col bg-background overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sections
            </p>
          </div>

          <ul role="list" className="flex-1 p-2.5 grid gap-1.5 overflow-y-auto content-start">
            {page.sections.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                <Plus size={24} className="mx-auto mb-2 opacity-30" />
                No sections yet.
              </li>
            )}
            {page.sections.map((section, index) => (
              <li key={section.id}>
                <SectionItem section={section} index={index} total={page.sections.length} />
              </li>
            ))}
          </ul>

          <div className="p-2.5 border-t bg-muted/20">
            <AddSectionDialog />
          </div>
        </aside>

        {/* Center — live preview */}
        <main
          id="main-content"
          role="region"
          aria-label="Page preview"
          className="flex-1 overflow-y-auto bg-white"
        >
          <div
            className={[
              'transition-all duration-200 mx-auto',
              previewMode === 'mobile' ? 'max-w-[390px] border-x shadow-md' : 'max-w-none',
            ].join(' ')}
          >
            {page.sections.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
                <Grid2X2 size={32} className="opacity-20" />
                <span>Add sections from the left panel to build your page.</span>
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

        {/* Right — prop editor */}
        <StudioPanel />
      </div>
    </div>
  )
}
