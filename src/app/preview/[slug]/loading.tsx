export default function PreviewLoading() {
  return (
    <main id="main-content" role="main" aria-label="Loading page preview…" aria-busy="true">
      <div className="animate-pulse">
        {/* Hero skeleton */}
        <div className="h-72 bg-muted" />
        {/* Feature grid skeleton */}
        <div className="px-12 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        {/* Testimonial skeleton */}
        <div className="px-12 py-8 max-w-2xl mx-auto space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/4 mt-2" />
        </div>
      </div>
    </main>
  )
}
