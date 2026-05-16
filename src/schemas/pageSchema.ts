import { z } from 'zod'
import type { Page } from '@/types/page'

export const heroPropsSchema = z.object({
  heading: z.string().min(1, 'Heading is required'),
  subheading: z.string().min(1, 'Subheading is required'),
  ctaLabel: z.string().min(1, 'CTA label is required'),
  ctaUrl: z.string().min(1, 'CTA URL is required'),
})

export const featureItemSchema = z.object({
  title: z.string().min(1, 'Feature title is required'),
  description: z.string().min(1, 'Feature description is required'),
  icon: z.string().optional(),
})

export const featureGridPropsSchema = z.object({
  features: z.array(featureItemSchema).min(1, 'At least one feature is required'),
})

export const testimonialPropsSchema = z.object({
  quote: z.string().min(1, 'Quote is required'),
  author: z.string().min(1, 'Author is required'),
  role: z.string().optional(),
  avatarUrl: z.string().optional(),
})

export const ctaPropsSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'URL is required'),
  variant: z.enum(['primary', 'secondary']).optional(),
})

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1), type: z.literal('hero'), props: heroPropsSchema }),
  z.object({ id: z.string().min(1), type: z.literal('featureGrid'), props: featureGridPropsSchema }),
  z.object({ id: z.string().min(1), type: z.literal('testimonial'), props: testimonialPropsSchema }),
  z.object({ id: z.string().min(1), type: z.literal('cta'), props: ctaPropsSchema }),
])

export const pageSchema = z.object({
  pageId: z.string().min(1, 'pageId is required'),
  slug: z.string().min(1, 'slug is required'),
  title: z.string().min(1, 'title is required'),
  sections: z.array(sectionSchema),
})

export type PageSchemaType = z.infer<typeof pageSchema>
export type SectionSchemaType = z.infer<typeof sectionSchema>

export class PageValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message)
    this.name = 'PageValidationError'
  }
}

export function validatePage(data: unknown): Page {
  const result = pageSchema.safeParse(data)
  if (!result.success) {
    throw new PageValidationError(
      `Page validation failed: ${result.error.issues.map(i => i.message).join(', ')}`,
      result.error.issues
    )
  }
  // The zod schema shape matches the Page type exactly
  return result.data as Page
}
