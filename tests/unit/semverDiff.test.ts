import { describe, it, expect } from 'vitest'
import { calculateBump } from '@/lib/publish/semverDiff'
import type { Page } from '@/types/page'

// ── Fixtures ────────────────────────────────────────────────────────────────

const heroSection = {
  id: 'hero-1',
  type: 'hero' as const,
  props: {
    heading: 'Welcome',
    subheading: 'Great products',
    ctaLabel: 'Start',
    ctaUrl: '/start',
  },
}

const featureSection = {
  id: 'features-1',
  type: 'featureGrid' as const,
  props: {
    features: [{ title: 'Speed', description: 'Fast' }],
  },
}

const testimonialSection = {
  id: 'testimonial-1',
  type: 'testimonial' as const,
  props: { quote: 'Amazing', author: 'Jane' },
}

const ctaSection = {
  id: 'cta-1',
  type: 'cta' as const,
  props: { label: 'Sign Up', url: '/signup', variant: 'primary' as const },
}

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    pageId: 'page-1',
    slug: 'home',
    title: 'Home Page',
    sections: [heroSection, featureSection],
    ...overrides,
  }
}

// ── none ────────────────────────────────────────────────────────────────────

describe('none — identical pages', () => {
  it('returns "none" when pages are deeply equal', () => {
    const page = makePage()
    const { bump, changelog } = calculateBump(page, page)
    expect(bump).toBe('none')
    expect(changelog).toHaveLength(0)
  })

  it('returns "none" for structurally equal copies (different object references)', () => {
    const a = makePage()
    const b = makePage()
    expect(calculateBump(a, b).bump).toBe('none')
  })

  it('returns "none" when sections array is empty and equal', () => {
    const a = makePage({ sections: [] })
    const b = makePage({ sections: [] })
    expect(calculateBump(a, b).bump).toBe('none')
  })
})

// ── patch ───────────────────────────────────────────────────────────────────

describe('patch — value-only changes', () => {
  it('returns "patch" when hero heading text changes', () => {
    const prev = makePage()
    const curr = makePage({
      sections: [
        { ...heroSection, props: { ...heroSection.props, heading: 'New Heading' } },
        featureSection,
      ],
    })
    const { bump, changelog } = calculateBump(prev, curr)
    expect(bump).toBe('patch')
    expect(changelog.some(c => c.includes('heading'))).toBe(true)
  })

  it('returns "patch" when CTA url changes', () => {
    const prev = makePage({ sections: [ctaSection] })
    const curr = makePage({
      sections: [{ ...ctaSection, props: { ...ctaSection.props, url: '/new' } }],
    })
    expect(calculateBump(prev, curr).bump).toBe('patch')
  })

  it('returns "patch" when page title changes', () => {
    const prev = makePage({ title: 'Old Title' })
    const curr = makePage({ title: 'New Title' })
    expect(calculateBump(prev, curr).bump).toBe('patch')
  })

  it('returns "patch" when sections are reordered', () => {
    const prev = makePage({ sections: [heroSection, featureSection] })
    const curr = makePage({ sections: [featureSection, heroSection] })
    const { bump, changelog } = calculateBump(prev, curr)
    expect(bump).toBe('patch')
    expect(changelog.some(c => c.toLowerCase().includes('order'))).toBe(true)
  })

  it('returns "patch" when an optional prop value changes', () => {
    const prev = makePage({ sections: [testimonialSection] })
    const curr = makePage({
      sections: [
        { ...testimonialSection, props: { ...testimonialSection.props, role: 'CTO' } },
      ],
    })
    // Adding 'role' (optional) is minor; but if it already exists and changes → patch
    const withRole = {
      ...testimonialSection,
      props: { ...testimonialSection.props, role: 'CEO' },
    }
    const prev2 = makePage({ sections: [withRole] })
    const curr2 = makePage({
      sections: [{ ...withRole, props: { ...withRole.props, role: 'CTO' } }],
    })
    expect(calculateBump(prev2, curr2).bump).toBe('patch')
  })

  it('returns "patch" when an optional prop is removed', () => {
    const withOptional = {
      ...testimonialSection,
      props: { ...testimonialSection.props, role: 'CEO' },
    }
    const prev = makePage({ sections: [withOptional] })
    const curr = makePage({ sections: [testimonialSection] })
    expect(calculateBump(prev, curr).bump).toBe('patch')
  })

  it('records a changelog entry for each changed prop', () => {
    const prev = makePage()
    const curr = makePage({
      sections: [
        {
          ...heroSection,
          props: {
            ...heroSection.props,
            heading: 'X',
            subheading: 'Y',
          },
        },
        featureSection,
      ],
    })
    const { changelog } = calculateBump(prev, curr)
    expect(changelog.length).toBeGreaterThanOrEqual(2)
  })
})

// ── minor ───────────────────────────────────────────────────────────────────

describe('minor — additions', () => {
  it('returns "minor" when a section is added', () => {
    const prev = makePage({ sections: [heroSection] })
    const curr = makePage({ sections: [heroSection, featureSection] })
    const { bump, changelog } = calculateBump(prev, curr)
    expect(bump).toBe('minor')
    expect(changelog.some(c => c.toLowerCase().includes('added'))).toBe(true)
  })

  it('returns "minor" when an optional prop is added to a section', () => {
    const prev = makePage({ sections: [testimonialSection] })
    const curr = makePage({
      sections: [
        {
          ...testimonialSection,
          props: { ...testimonialSection.props, role: 'VP Engineering' },
        },
      ],
    })
    expect(calculateBump(prev, curr).bump).toBe('minor')
  })

  it('returns "minor" when a second section is appended', () => {
    const prev = makePage({ sections: [] })
    const curr = makePage({ sections: [heroSection] })
    expect(calculateBump(prev, curr).bump).toBe('minor')
  })

  it('includes the new section type in the changelog', () => {
    const prev = makePage({ sections: [] })
    const curr = makePage({ sections: [heroSection] })
    const { changelog } = calculateBump(prev, curr)
    expect(changelog.some(c => c.includes('hero'))).toBe(true)
  })
})

// ── major ───────────────────────────────────────────────────────────────────

describe('major — breaking changes', () => {
  it('returns "major" when a section is removed', () => {
    const prev = makePage({ sections: [heroSection, featureSection] })
    const curr = makePage({ sections: [heroSection] })
    const { bump, changelog } = calculateBump(prev, curr)
    expect(bump).toBe('major')
    expect(changelog.some(c => c.toLowerCase().includes('removed'))).toBe(true)
  })

  it('returns "major" when a section type is changed', () => {
    const prev = makePage({ sections: [heroSection] })
    const curr = makePage({
      sections: [{ ...heroSection, type: 'cta', props: ctaSection.props }],
    })
    expect(calculateBump(prev, curr).bump).toBe('major')
  })

  it('returns "major" when a required prop is removed', () => {
    const prev = makePage({ sections: [heroSection] })
    const { heading: _dropped, ...propsWithoutHeading } = heroSection.props
    const curr = makePage({
      sections: [
        {
          ...heroSection,
          props: propsWithoutHeading as typeof heroSection.props,
        },
      ],
    })
    const { bump, changelog } = calculateBump(prev, curr)
    expect(bump).toBe('major')
    expect(changelog.some(c => c.includes('heading') && c.includes('Required'))).toBe(true)
  })

  it('returns "major" when the slug changes', () => {
    const prev = makePage({ slug: 'home' })
    const curr = makePage({ slug: 'landing' })
    expect(calculateBump(prev, curr).bump).toBe('major')
  })

  it('records a changelog entry when type changes', () => {
    const prev = makePage({ sections: [heroSection] })
    const curr = makePage({
      sections: [{ ...heroSection, type: 'cta', props: ctaSection.props }],
    })
    const { changelog } = calculateBump(prev, curr)
    expect(changelog.some(c => c.includes('type changed'))).toBe(true)
  })
})

// ── highest bump wins ────────────────────────────────────────────────────────

describe('highest bump wins — multiple simultaneous changes', () => {
  it('major wins over minor when section removed AND section added', () => {
    const prev = makePage({ sections: [heroSection, featureSection] })
    // Remove featureSection (major), add testimonialSection (minor)
    const curr = makePage({ sections: [heroSection, testimonialSection] })
    expect(calculateBump(prev, curr).bump).toBe('major')
  })

  it('major wins over patch when section removed AND text changed', () => {
    const prev = makePage({ sections: [heroSection, featureSection] })
    const curr = makePage({
      sections: [
        { ...heroSection, props: { ...heroSection.props, heading: 'Changed' } },
      ],
    })
    expect(calculateBump(prev, curr).bump).toBe('major')
  })

  it('minor wins over patch when section added AND text changed', () => {
    const prev = makePage({ sections: [heroSection] })
    const curr = makePage({
      sections: [
        { ...heroSection, props: { ...heroSection.props, heading: 'Updated' } },
        featureSection,
      ],
    })
    expect(calculateBump(prev, curr).bump).toBe('minor')
  })

  it('collects changelog entries for all changes that occurred', () => {
    const prev = makePage({ sections: [heroSection, featureSection] })
    const curr = makePage({
      sections: [
        { ...heroSection, props: { ...heroSection.props, heading: 'New' } },
        testimonialSection,
      ],
    })
    const { changelog } = calculateBump(prev, curr)
    // Removed featureSection (major), added testimonialSection (minor), heading changed (patch)
    expect(changelog.length).toBeGreaterThanOrEqual(3)
  })

  it('major wins when required prop removed AND optional prop added simultaneously', () => {
    const prev = makePage({ sections: [heroSection] })
    // Remove required 'heading', add optional metadata
    const { heading: _h, ...rest } = heroSection.props
    const curr = makePage({
      sections: [
        {
          ...heroSection,
          props: { ...rest, metadata: 'extra' } as unknown as typeof heroSection.props,
        },
      ],
    })
    expect(calculateBump(prev, curr).bump).toBe('major')
  })
})

// ── edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles pages with no sections', () => {
    const prev = makePage({ sections: [] })
    const curr = makePage({ sections: [], title: 'Updated' })
    expect(calculateBump(prev, curr).bump).toBe('patch')
  })

  it('handles nested prop changes (featureGrid features array)', () => {
    const prev = makePage({ sections: [featureSection] })
    const curr = makePage({
      sections: [
        {
          ...featureSection,
          props: {
            features: [{ title: 'Speed', description: 'Even faster' }],
          },
        },
      ],
    })
    expect(calculateBump(prev, curr).bump).toBe('patch')
  })

  it('returns "none" for a round-trip serialize/deserialize', () => {
    const page = makePage()
    const roundTripped = JSON.parse(JSON.stringify(page)) as Page
    expect(calculateBump(page, roundTripped).bump).toBe('none')
  })
})
