import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import type { Result as AxeViolation } from 'axe-core'

const TEST_SLUG = process.env.TEST_SLUG ?? 'home'
const hasNextAuth = Boolean(process.env.NEXTAUTH_SECRET)

interface PageReport {
  url: string
  violations: AxeViolation[]
  passCount: number
}

// Module-level accumulator — tests in the same file share one Playwright worker.
const report: PageReport[] = []

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  })
}

async function runAxe(page: Page, url: string): Promise<PageReport> {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()

  return {
    url,
    violations: results.violations,
    passCount: results.passes.length,
  }
}

test.describe('Accessibility audit (axe-core)', () => {
  // Write an empty stub immediately so the file always exists even if the
  // process is killed before afterAll runs (prevents check-a11y.js ENOENT).
  test.beforeAll(() => {
    writeFileSync(
      'a11y-report.json',
      JSON.stringify({ timestamp: new Date().toISOString(), pages: [], summary: {} }, null, 2),
      'utf-8'
    )
  })

  // Save the accumulated report after ALL tests in this file complete.
  test.afterAll(async () => {
    const summary = report.reduce(
      (acc, p) => {
        for (const v of p.violations) {
          acc.total++
          if (v.impact === 'critical') acc.critical++
          else if (v.impact === 'serious') acc.serious++
          else if (v.impact === 'moderate') acc.moderate++
          else if (v.impact === 'minor') acc.minor++
        }
        return acc
      },
      { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }
    )

    const fullReport = {
      timestamp: new Date().toISOString(),
      testSlug: TEST_SLUG,
      pages: report,
      summary,
    }

    await writeFile(
      'a11y-report.json',
      JSON.stringify(fullReport, null, 2),
      'utf-8'
    )
  })

  // ── /login ──────────────────────────────────────────────────────────────
  test('/login page has no critical or serious violations', async ({ page }) => {
    const result = await runAxe(page, '/login')
    report.push(result)

    const blocking = result.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )
    if (blocking.length > 0) {
      const summary = blocking
        .map(v => `[${v.impact}] ${v.id}: ${v.help}`)
        .join('\n')
      expect.soft(blocking, `Blocking violations:\n${summary}`).toHaveLength(0)
    }
    expect(blocking).toHaveLength(0)
  })

  // ── /preview/[slug] ─────────────────────────────────────────────────────
  // Runs against whatever the page renders — error state or real content.
  // Both must be accessible.
  test('/preview/[slug] has no critical or serious violations', async ({ page }) => {
    const result = await runAxe(page, `/preview/${TEST_SLUG}`)
    report.push(result)

    const blocking = result.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )
    if (blocking.length > 0) {
      const summary = blocking
        .map(v => `[${v.impact}] ${v.id}: ${v.help}`)
        .join('\n')
      expect.soft(blocking, `Blocking violations:\n${summary}`).toHaveLength(0)
    }
    expect(blocking).toHaveLength(0)
  })

  // ── /studio/[slug] ──────────────────────────────────────────────────────
  // Tests the redirect-to-login state (no auth) AND the authenticated state.
  test('/studio/[slug] redirect (unauthenticated) has no critical violations', async ({
    page,
  }) => {
    // Without auth the middleware redirects to /login — audit that page
    await page.goto(`/studio/${TEST_SLUG}`)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    report.push({ url: `/studio/${TEST_SLUG}?redirect`, violations: results.violations, passCount: results.passes.length })

    const blocking = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )
    expect(blocking).toHaveLength(0)
  })

  test('/studio/[slug] authenticated has no critical or serious violations', async ({
    page,
  }) => {
    test.skip(!hasNextAuth, 'NEXTAUTH_SECRET not set — skip authenticated studio audit')

    await loginAs(page, 'editor@test.com', 'editor123')
    const result = await runAxe(page, `/studio/${TEST_SLUG}`)
    report.push(result)

    const blocking = result.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )
    if (blocking.length > 0) {
      const summary = blocking
        .map(v => `[${v.impact}] ${v.id}: ${v.help}`)
        .join('\n')
      expect.soft(blocking, `Blocking violations:\n${summary}`).toHaveLength(0)
    }
    expect(blocking).toHaveLength(0)
  })
})
