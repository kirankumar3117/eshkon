/**
 * Automated auth + RBAC flow test.
 * Does NOT require Contentful — tests only auth, redirects, and role enforcement.
 */
import { test, expect, type Page } from '@playwright/test'

async function fillAndSubmit(page: Page, email: string, password: string) {
  await page.goto('/login')
  await expect(page.locator('h1')).toContainText('Sign In')
  await page.fill('#email', email)
  await page.fill('#password', password)
  // Wait for navigation triggered by the async fetch inside the form handler
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/login', { timeout: 10_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
}

// ── Unauthenticated behaviour ────────────────────────────────────────────────

test.describe('Unauthenticated', () => {
  test('GET /login renders sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('Sign In')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
  })

  test('wrong credentials shows error, stays on /login', async ({ page }) => {
    await fillAndSubmit(page, 'nobody@example.com', 'wrongpass')
    // Must NOT redirect away
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('#login-error')).toContainText('Invalid email or password')
  })

  test('empty form shows browser validation, does not submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    // Still on /login (HTML required fields block submission)
    await expect(page).toHaveURL(/\/login/)
  })

  test('accessing /studio/* redirects to /login', async ({ page }) => {
    await page.goto('/studio/home')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── Viewer role ──────────────────────────────────────────────────────────────

test.describe('Viewer role', () => {
  test('viewer can log in and land on home', async ({ page }) => {
    await fillAndSubmit(page, 'viewer@test.com', 'viewer123')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('viewer is redirected away from /studio', async ({ page }) => {
    await fillAndSubmit(page, 'viewer@test.com', 'viewer123')
    await page.goto('/studio/home')
    // Middleware redirects viewer back to home (/) since they are authenticated but lack permissions
    await expect(page).toHaveURL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/')
  })
})

// ── Editor role ──────────────────────────────────────────────────────────────

test.describe('Editor role', () => {
  test('editor can log in', async ({ page }) => {
    await fillAndSubmit(page, 'editor@test.com', 'editor123')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('editor can reach /studio (gets Contentful error, not auth error)', async ({ page }) => {
    await fillAndSubmit(page, 'editor@test.com', 'editor123')
    await page.goto('/studio/home')
    // Should NOT redirect to /login — editor is authorised
    await expect(page).not.toHaveURL(/\/login/)
    // Will show a Contentful error (expected without real credentials),
    // but the page must render something (not a blank screen or auth wall)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('POST /api/publish returns 403 for editor', async ({ page }) => {
    await fillAndSubmit(page, 'editor@test.com', 'editor123')

    const response = await page.request.post('/api/publish', {
      data: { slug: 'home' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(response.status()).toBe(403)
    const body = await response.json() as { error: string }
    expect(body.error).toMatch(/publisher role required/i)
  })
})

// ── Publisher role ───────────────────────────────────────────────────────────

test.describe('Publisher role', () => {
  test('publisher can log in', async ({ page }) => {
    await fillAndSubmit(page, 'publisher@test.com', 'publisher123')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('publisher can reach /studio', async ({ page }) => {
    await fillAndSubmit(page, 'publisher@test.com', 'publisher123')
    await page.goto('/studio/home')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('POST /api/publish returns non-403 for publisher (reaches business logic)', async ({ page }) => {
    await fillAndSubmit(page, 'publisher@test.com', 'publisher123')

    // No Contentful configured, so it will 400/404/422 — but NOT 403
    const response = await page.request.post('/api/publish', {
      data: { slug: 'home' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(response.status()).not.toBe(403)
  })
})

// ── callbackUrl redirect ─────────────────────────────────────────────────────

test.describe('callbackUrl', () => {
  test('middleware injects callbackUrl and login redirects back after auth', async ({ page }) => {
    // Go directly to a protected page — middleware redirects to /login?callbackUrl=...
    await page.goto('/studio/test-page')
    await expect(page).toHaveURL(/\/login\?callbackUrl/)

    // Log in as editor
    await page.fill('#email', 'editor@test.com')
    await page.fill('#password', 'editor123')
    await page.click('button[type="submit"]')

    // Should now be at /studio/test-page (not /)
    await expect(page).toHaveURL(/\/studio\/test-page/)
  })
})

// ── Session persistence ──────────────────────────────────────────────────────

test.describe('Session persistence', () => {
  test('session cookie keeps user logged in across page navigations', async ({ page }) => {
    await fillAndSubmit(page, 'editor@test.com', 'editor123')

    // Navigate to several pages
    await page.goto('/')
    await page.goto('/login')

    // Visiting /studio should NOT go to /login (session is still active)
    await page.goto('/studio/home')
    await expect(page).not.toHaveURL(/\/login/)
  })
})
