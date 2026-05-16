'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email,
          password,
          csrfToken,
          callbackUrl,
          json: 'true',
        }),
      })

      const data = (await res.json()) as { url?: string }

      if (!data.url || data.url.includes('/api/auth/')) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Could not reach the authentication server. Is the app running?')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-describedby={error ? 'login-error' : undefined}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            aria-required="true"
            aria-describedby={error ? 'login-error' : undefined}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 bg-muted/30"
      id="main-content"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
          <CardDescription>
            Enter your credentials to access Page Studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="grid gap-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            viewer@test.com · editor@test.com · publisher@test.com
            <br />
            Passwords: viewer123 · editor123 · publisher123
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
