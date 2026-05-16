import Image from 'next/image'
import type { TestimonialProps } from '@/types/page'

export function TestimonialSection({ quote, author, role, avatarUrl }: TestimonialProps) {
  return (
    <section
      aria-labelledby="testimonial-heading"
      className="py-20 px-6 bg-muted/40"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="testimonial-heading" className="sr-only">
          Testimonial
        </h2>
        <figure>
          <blockquote className="text-xl font-medium leading-8 text-foreground sm:text-2xl sm:leading-9">
            <p>&#8220;{quote}&#8221;</p>
          </blockquote>
          <figcaption className="mt-8 flex items-center justify-center gap-4">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt={`Portrait of ${author}`}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            )}
            <div className="text-left">
              <p className="font-semibold text-foreground">{author}</p>
              {role && (
                <p className="text-sm text-muted-foreground">{role}</p>
              )}
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
