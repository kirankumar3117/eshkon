import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Page Studio</h1>
      <p className="text-muted-foreground mb-8">
        A production-grade page studio powered by Contentful.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}
