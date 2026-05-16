interface UnsupportedSectionProps {
  type: string
}

export function UnsupportedSection({ type }: UnsupportedSectionProps) {
  return (
    <div
      role="region"
      aria-label={`Unsupported section type: ${type}`}
      className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-6 my-4 text-center"
    >
      <p className="text-sm text-muted-foreground">
        Unknown section type:{' '}
        <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
          {type}
        </code>
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        This section type is not supported and cannot be rendered.
      </p>
    </div>
  )
}
