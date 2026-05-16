import { test, expect, type Page } from '@playwright/test'

const TEST_SLUG = process.env.TEST_SLUG ?? 'home'
const hasContentful = Boolean(process.env.CONTENTFUL_SPACE_ID)
const hasNextAuth = Boolean(process.env.NEXTAUTH_SECRET)
const canRunStudio = hasContentful && hasNextAuth

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  // Wait for redirect away from /login
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  })
}

test.describe('Studio page /studio/[slug]', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto(`/studio/${TEST_SLUG}`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('editor can log in and access studio', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'editor@test.com', 'editor123')
    await page.goto(`/studio/${TEST_SLUG}`)

    // h1 should contain "Studio:"
    const h1 = page.locator('h1')
    await expect(h1).toContainText('Studio:')
  })

  test('editor sees role badge', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'editor@test.com', 'editor123')
    await page.goto(`/studio/${TEST_SLUG}`)

    // Role badge displays the current role
    await expect(page.getByText('editor')).toBeVisible()
  })

  test('publish button is disabled for editor role', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'editor@test.com', 'editor123')
    await page.goto(`/studio/${TEST_SLUG}`)

    const publishBtn = page.getByRole('button', { name: /publish/i })
    await expect(publishBtn).toBeDisabled()
  })

  test('editing hero heading updates the preview pane', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'editor@test.com', 'editor123')
    await page.goto(`/studio/${TEST_SLUG}`)

    // Select the first section in the list (assumes hero is first)
    const firstSectionBtn = page.locator('[aria-label^="Select"]').first()
    await firstSectionBtn.click()

    // Wait for the prop editor panel to open
    await expect(page.locator('aside[aria-label="Section properties"]')).toBeVisible()

    // Find the heading input and change the value
    const headingInput = page.locator('input[id$="-heading"]').first()
    await headingInput.clear()
    const newHeading = 'E2E Updated Heading'
    await headingInput.fill(newHeading)

    // The live preview pane (center column) should reflect the change
    const preview = page.locator('[aria-label="Page preview"]')
    await expect(preview).toContainText(newHeading)
  })

  test('adding a new section makes it appear in the section list', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'editor@test.com', 'editor123')
    await page.goto(`/studio/${TEST_SLUG}`)

    // Count sections before adding
    const sectionList = page.locator('[aria-label="Section list"] li')
    const before = await sectionList.count()

    // Open the Add Section menu
    await page.getByRole('button', { name: /add section/i }).click()

    // Pick "Call to Action" from the menu
    await page.getByRole('menuitem', { name: 'Call to Action' }).click()

    // Section list should have one more item
    await expect(sectionList).toHaveCount(before + 1)
  })

  test('publisher can see enabled publish button', async ({ page }) => {
    test.skip(!canRunStudio, 'Contentful or NextAuth not configured')

    await loginAs(page, 'publisher@test.com', 'publisher123')
    await page.goto(`/studio/${TEST_SLUG}`)

    const publishBtn = page.getByRole('button', { name: /^Publish$/i })
    await expect(publishBtn).toBeEnabled()
  })
})
