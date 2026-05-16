import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { parseRole } from '@/lib/auth/roles'
import { fetchAllPages } from '@/lib/contentful/contentfulAdapter'
import type { Role } from '@/types/page'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ROLE_COLOUR: Record<Role, string> = {
  viewer: 'bg-muted text-muted-foreground',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  publisher: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const role = parseRole((session?.user as { role?: string } | undefined)?.role)
  const pages = await fetchAllPages()

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-muted/50 to-muted/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/70 shadow-inner rounded-xl flex items-center justify-center ring-1 ring-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Page Studio</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">CMS Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {session ? (
            <div className="flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-full border border-muted">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold tracking-tight">{session.user?.email}</span>
                {role && (
                  <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider py-0 px-2 h-4 border-none ${ROLE_COLOUR[role]}`}>
                    {role}
                  </Badge>
                )}
              </div>
              <div className="h-8 w-px bg-border/50" />
              <Button variant="ghost" size="sm" className="h-8 rounded-full px-4 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm" asChild>
                <Link href="/api/auth/signout">Sign out</Link>
              </Button>
            </div>
          ) : (
            <Button className="rounded-full shadow-md shadow-primary/20 transition-transform active:scale-95" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Dashboard body */}
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight mb-3">Welcome to Page Studio</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your Contentful-powered landing pages. Preview changes in real-time and publish versioned releases with confidence.
          </p>
        </div>

        <PageLinks role={role} pages={pages} />
      </div>
    </main>
  )
}

function PageLinks({ role, pages }: { role: Role | null; pages: { slug: string; title: string }[] }) {
  const items = pages.length > 0
    ? pages
    : ['home', 'about-us', 'pricing', 'black-card', 'accessibility'].map(s => ({ slug: s, title: s }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(({ slug, title }) => (
          <Card key={slug} className="group hover:shadow-md transition-all duration-300 border-muted/60 hover:border-primary/50 overflow-hidden flex flex-col">
            <CardHeader className="pb-4 bg-muted/30">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">/{slug}</CardDescription>
                </div>
                <Badge variant="outline" className="bg-background">Page</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Edit the structure and content of your page, preview changes, and publish when ready.
              </p>
            </CardContent>
            <CardFooter className="flex gap-3 pt-4 border-t bg-muted/10">
              <Button variant="outline" className="flex-1 transition-colors hover:bg-primary hover:text-primary-foreground" asChild>
                <Link href={`/preview/${slug}`}>Preview</Link>
              </Button>
              {(role === 'editor' || role === 'publisher') && (
                <Button className="flex-1 shadow-sm transition-transform active:scale-95" asChild>
                  <Link href={`/studio/${slug}`}>Open Studio</Link>

                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {!role && (
        <Card className="max-w-2xl mx-auto border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-6">
              You must be signed in as an editor or publisher to modify pages in the studio.
            </p>
            <Button size="lg" asChild>
              <Link href="/login">Sign in to continue</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {role === 'viewer' && (
        <Card className="max-w-2xl mx-auto border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-4 p-6 text-blue-800 dark:text-blue-200">
            <span className="text-2xl">👁️</span>
            <div>
              <h3 className="font-semibold">Viewer Access Only</h3>
              <p className="text-sm opacity-90 mt-1">
                You are signed in as a viewer. You can preview pages, but you do not have permission to open the studio or make edits.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
