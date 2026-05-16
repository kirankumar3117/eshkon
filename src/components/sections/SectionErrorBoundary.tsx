'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  sectionId?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 my-4"
        >
          <h3 className="text-sm font-semibold text-destructive mb-1">
            Section failed to render
          </h3>
          <p className="text-xs text-destructive/80">
            {this.props.sectionId
              ? `Section "${this.props.sectionId}" contains invalid data.`
              : 'A section contains invalid data.'}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
