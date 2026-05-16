export default function StudioLoading() {
  return (
    <div className="flex flex-col h-screen bg-muted/10" aria-label="Loading studio…" aria-busy="true">
      {/* Toolbar skeleton */}
      <div className="h-12 border-b bg-background shrink-0 flex items-center px-4 gap-3 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-8 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex flex-1 overflow-hidden animate-pulse">
        {/* Left panel */}
        <div className="w-60 shrink-0 border-r bg-background flex flex-col gap-2 p-3">
          <div className="h-3 w-16 bg-muted rounded mb-1" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted rounded-lg" />
          ))}
        </div>
        {/* Center preview */}
        <div className="flex-1 bg-white" />
        {/* Right panel hidden on load */}
      </div>
    </div>
  )
}
