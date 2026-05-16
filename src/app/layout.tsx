import type { Metadata } from 'next'
import { SessionProvider } from '@/components/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Page Studio',
  description: 'WYSIWYG page studio powered by Contentful',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* WCAG 2.2: Skip navigation — first focusable element on every page */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
