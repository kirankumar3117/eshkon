export interface HeroProps {
  heading: string
  subheading: string
  ctaLabel: string
  ctaUrl: string
}

export interface FeatureItem {
  title: string
  description: string
  icon?: string
}

export interface FeatureGridProps {
  features: FeatureItem[]
}

export interface TestimonialProps {
  quote: string
  author: string
  role?: string
  avatarUrl?: string
}

export interface CtaProps {
  label: string
  url: string
  variant?: 'primary' | 'secondary'
}

export type SectionType = 'hero' | 'featureGrid' | 'testimonial' | 'cta'

export type Section =
  | { id: string; type: 'hero'; props: HeroProps }
  | { id: string; type: 'featureGrid'; props: FeatureGridProps }
  | { id: string; type: 'testimonial'; props: TestimonialProps }
  | { id: string; type: 'cta'; props: CtaProps }

export interface Page {
  pageId: string
  slug: string
  title: string
  sections: Section[]
}

export type Role = 'viewer' | 'editor' | 'publisher'
