import type { HeroProps } from '@/types/page'

export function HeroSection({ heading, subheading, ctaLabel, ctaUrl }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative bg-primary text-primary-foreground py-24 px-6 text-center"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="hero-heading"
          className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
        >
          {heading}
        </h2>
        <p className="mt-6 text-lg leading-8 text-primary-foreground/80">
          {subheading}
        </p>
        <div className="mt-10">
          <a
            href={ctaUrl}
            className="inline-block rounded-md bg-background px-8 py-3 text-sm font-semibold text-foreground shadow hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
