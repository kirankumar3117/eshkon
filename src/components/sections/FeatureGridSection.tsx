import type { FeatureGridProps } from '@/types/page'

export function FeatureGridSection({ features }: FeatureGridProps) {
  return (
    <section
      aria-labelledby="features-heading"
      className="py-20 px-6 bg-background"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="features-heading"
          className="sr-only"
        >
          Features
        </h2>
        <ul
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Feature list"
        >
          {features.map((feature, index) => (
            <li
              key={`${feature.title}-${index}`}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              {feature.icon && (
                <span
                  className="text-3xl mb-3 block"
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              )}
              <h3 className="text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
