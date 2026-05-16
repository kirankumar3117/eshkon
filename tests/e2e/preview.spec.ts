import { test, expect } from '@playwright/test'

const TEST_SLUG = process.env.TEST_SLUG ?? 'home'
const hasContentful = Boolean(process.env.CONTENTFUL_SPACE_ID)

test.describe('Preview page /preview/[slug]', () => {
  test('navigates without crash', async ({ page }) => {
    // Even without Contentful the page must render a UI (error or content).
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const response = await page.goto(`/preview/${TEST_SLUG}`)

    // Must not return a hard 500 — Next.js should render an error boundary
    expect(response?.status()).not.toBe(500)

    // No uncaught JS exceptions
    expect(errors).toHaveLength(0)
  })

  test('page title is visible when Contentful is configured', async ({ page }) => {
    test.skip(!hasContentful, 'Contentful env vars not configured — skip content assertions')

    await page.goto(`/preview/${TEST_SLUG}`)

    // The SR-only h1 contains the page title — it is in the DOM even if hidden
    const h1 = page.locator('main h1, h1')
    await expect(h1.first()).toBeAttached()
  })

  test('renders at least one section when Contentful is configured', async ({ page }) => {
    test.skip(!hasContentful, 'Contentful env vars not configured — skip content assertions')

    await page.goto(`/preview/${TEST_SLUG}`)

    // Each section component renders a <section> element
    const sections = page.locator('section')
    const count = await sections.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('has no console errors when Contentful is configured', async ({ page }) => {
    test.skip(!hasContentful, 'Contentful env vars not configured — skip content assertions')

    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto(`/preview/${TEST_SLUG}`)
    await page.waitForLoadState('networkidle')

    expect(consoleErrors).toHaveLength(0)
  })
})
