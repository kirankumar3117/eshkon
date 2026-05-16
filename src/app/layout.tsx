import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
