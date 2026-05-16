import { describe, it, expect } from 'vitest'
import { validatePage, PageValidationError } from '@/schemas/pageSchema'
import type { Page } from '@/types/page'

const validHeroPage: Page = {
  pageId: 'page-1',
  slug: 'home',
  title: 'Home Page',
  sections: [
    {
      id: 'section-1',
      type: 'hero',
      props: {
        heading: 'Welcome',
        subheading: 'We build great things',
        ctaLabel: 'Get Started',
        ctaUrl: '/start',
      },
    },
  ],
}

const validFullPage: Page = {
  pageId: 'page-2',
  slug: 'full',
  title: 'Full Page',
  sections: [
    {
      id: 's1',
      type: 'hero',
      props: { heading: 'H', subheading: 'S', ctaLabel: 'CTA', ctaUrl: '/go' },
    },
    {
      id: 's2',
      type: 'featureGrid',
      props: {
        features: [
          { title: 'Speed', description: 'Very fast', icon: '⚡' },
          { title: 'Scale', description: 'Grows with you' },
        ],
      },
    },
    {
      id: 's3',
      type: 'testimonial',
      props: {
        quote: 'Amazing product',
        author: 'Jane Doe',
        role: 'CEO',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    },
    {
      id: 's4',
      type: 'cta',
      props: { label: 'Sign Up', url: '/signup', variant: 'primary' },
    },
  ],
}

describe('validatePage', () => {
  describe('valid pages', () => {
    it('accepts a valid hero page', () => {
      expect(() => validatePage(validHeroPage)).not.toThrow()
      const result = validatePage(validHeroPage)
      expect(result.pageId).toBe('page-1')
      expect(result.slug).toBe('home')
    })

    it('accepts a page with all section types', () => {
      const result = validatePage(validFullPage)
      expect(result.sections).toHaveLength(4)
    })

    it('accepts optional props omitted (role, avatarUrl, icon, variant)', () => {
      const page = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'testimonial',
            props: { quote: 'Great', author: 'Bob' },
          },
          {
            id: 's2',
            type: 'cta',
            props: { label: 'Go', url: '/go' },
          },
        ],
      }
      expect(() => validatePage(page)).not.toThrow()
    })

    it('returns the validated page with correct shape', () => {
      const result = validatePage(validHeroPage)
      const heroSection = result.sections[0]
      expect(heroSection.type).toBe('hero')
      if (heroSection.type === 'hero') {
        expect(heroSection.props.heading).toBe('Welcome')
      }
    })
  })

  describe('missing required fields', () => {
    it('throws when pageId is missing', () => {
      const bad = { ...validHeroPage, pageId: undefined }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('throws when slug is missing', () => {
      const bad = { ...validHeroPage, slug: '' }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('throws when title is missing', () => {
      const bad = { ...validHeroPage, title: '' }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('throws when hero heading is missing', () => {
      const bad = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'hero',
            props: { subheading: 'Sub', ctaLabel: 'CTA', ctaUrl: '/go' },
          },
        ],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('throws when featureGrid has no features', () => {
      const bad = {
        ...validHeroPage,
        sections: [{ id: 's1', type: 'featureGrid', props: { features: [] } }],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('throws when testimonial quote is missing', () => {
      const bad = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'testimonial',
            props: { author: 'Bob' },
          },
        ],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })
  })

  describe('unknown section type', () => {
    it('throws for an unknown section type', () => {
      const bad = {
        ...validHeroPage,
        sections: [
          { id: 's1', type: 'banner', props: { text: 'Hello' } },
        ],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })
  })

  describe('nested props validation', () => {
    it('validates featureItem title and description are required', () => {
      const bad = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'featureGrid',
            props: {
              features: [{ icon: 'star' }],
            },
          },
        ],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('validates cta variant is one of the allowed values', () => {
      const bad = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'cta',
            props: { label: 'Go', url: '/go', variant: 'danger' },
          },
        ],
      }
      expect(() => validatePage(bad)).toThrow(PageValidationError)
    })

    it('accepts cta with valid variant', () => {
      const good = {
        ...validHeroPage,
        sections: [
          {
            id: 's1',
            type: 'cta',
            props: { label: 'Go', url: '/go', variant: 'secondary' },
          },
        ],
      }
      expect(() => validatePage(good)).not.toThrow()
    })
  })

  describe('error detail', () => {
    it('includes ZodIssue array on PageValidationError', () => {
      try {
        validatePage({ pageId: '', slug: '', title: '', sections: [] })
      } catch (err) {
        expect(err).toBeInstanceOf(PageValidationError)
        const e = err as PageValidationError
        expect(e.issues.length).toBeGreaterThan(0)
      }
    })

    it('throws on non-object input', () => {
      expect(() => validatePage(null)).toThrow(PageValidationError)
      expect(() => validatePage('string')).toThrow(PageValidationError)
      expect(() => validatePage(42)).toThrow(PageValidationError)
    })
  })
})
