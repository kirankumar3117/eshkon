import { cn } from '@/lib/utils'
import type { CtaProps } from '@/types/page'

export function CtaSection({ label, url, variant = 'primary' }: CtaProps) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-20 px-6 bg-background"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 id="cta-heading" className="sr-only">
          Call to action
        </h2>
        <a
          href={url}
          className={cn(
            'inline-block rounded-md px-8 py-4 text-base font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            variant === 'primary'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input'
          )}
        >
          {label}
        </a>
      </div>
    </section>
  )
}
