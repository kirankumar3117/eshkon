import React from 'react'
import type { ComponentType } from 'react'
import type { Section } from '@/types/page'
import { HeroSection } from '@/components/sections/HeroSection'
import { FeatureGridSection } from '@/components/sections/FeatureGridSection'
import { TestimonialSection } from '@/components/sections/TestimonialSection'
import { CtaSection } from '@/components/sections/CtaSection'

// Removing any key from this object is a TypeScript error because the mapped
// type requires an entry for every member of the Section discriminated union.
type SectionRegistry = {
  [K in Section['type']]: ComponentType<Extract<Section, { type: K }>['props']>
}

export const sectionRegistry: SectionRegistry = {
  hero: HeroSection,
  featureGrid: FeatureGridSection,
  testimonial: TestimonialSection,
  cta: CtaSection,
}

// Type-safe render helper. A switch on section.type narrows props correctly
// so no cast is needed anywhere in the call-sites.
export function renderSection(section: Section): React.ReactElement {
  switch (section.type) {
    case 'hero': {
      const C = sectionRegistry.hero
      return <C {...section.props} />
    }
    case 'featureGrid': {
      const C = sectionRegistry.featureGrid
      return <C {...section.props} />
    }
    case 'testimonial': {
      const C = sectionRegistry.testimonial
      return <C {...section.props} />
    }
    case 'cta': {
      const C = sectionRegistry.cta
      return <C {...section.props} />
    }
  }
}
