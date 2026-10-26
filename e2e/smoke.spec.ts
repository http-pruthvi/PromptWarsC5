import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Soirée End-to-End Smoke Test & Axe Accessibility Audit', () => {
  test('complete celebration lifecycle smoke test with axe audits on every page', async ({ page }) => {
    // 1. Landing Page
    await page.goto('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page).toHaveTitle(/Soirée/i)

    // Verify Skip-to-content accessibility link
    const skipLink = page.locator('.skip-link')
    await expect(skipLink).toBeAttached()
    await expect(skipLink).toHaveAttribute('href', '#main-content')

    // Verify Pause animation toggle (WCAG 2.2.2)
    const pauseMotionBtn = page.getByRole('button', { name: /Pause animations/i })
    await expect(pauseMotionBtn).toBeVisible()
    await pauseMotionBtn.click()
    await expect(page.locator('html')).toHaveClass(/animations-paused/)
    const resumeMotionBtn = page.getByRole('button', { name: /Resume animations/i })
    await expect(resumeMotionBtn).toBeVisible()
    await resumeMotionBtn.click()
    await expect(page.locator('html')).not.toHaveClass(/animations-paused/)

    // Verify 320px viewport reflow without horizontal scroll
    await page.setViewportSize({ width: 320, height: 640 })
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    await page.setViewportSize({ width: 1280, height: 800 })

    // Accessibility Audit: Landing Page
    const landingAxe = await new AxeBuilder({ page }).analyze()
    expect(landingAxe.violations).toEqual([])

    // 2. Open Wizard (Planner)
    await page
      .locator('button', { hasText: /Start planning/i })
      .first()
      .click()

    const wizard = page.locator('.wizard')
    const beginPlanningBtn = page.locator('button', { hasText: /Begin Planning|New Plan/i }).first()

    await Promise.race([
      wizard.waitFor({ state: 'visible', timeout: 15000 }),
      beginPlanningBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => beginPlanningBtn.click()),
    ])

    await expect(wizard).toBeVisible({ timeout: 15000 })

    // Accessibility Audit: Planner Wizard Step 0
    const wizardStep0Axe = await new AxeBuilder({ page }).analyze()
    expect(wizardStep0Axe.violations).toEqual([])

    // Progress Step 0 -> Step 1
    await page.locator('button.pick', { hasText: /Wedding/i }).click()
    await page.locator('button', { hasText: /Continue/i }).click()

    // Fill Essentials on Step 1
    const titleInput = page.locator('#title')
    await expect(titleInput).toBeVisible()
    await titleInput.fill('Zara & Neil Sangeet Night')

    // Progress Step 1 -> Step 2
    await page.locator('button', { hasText: /Continue/i }).click()
    await expect(page.locator('button', { hasText: /Generate my plan/i })).toBeVisible()

    // Accessibility Audit: Wizard Step 2
    const wizardStep2Axe = await new AxeBuilder({ page }).analyze()
    expect(wizardStep2Axe.violations).toEqual([])

    // Submit Plan Generation
    await page.locator('button', { hasText: /Generate my plan/i }).click()

    // Wait for plan composition and PlanView render
    await expect(page.locator('button.tab', { hasText: /Overview/i })).toBeVisible({ timeout: 25000 })
    await expect(page.locator('h2', { hasText: 'Zara & Neil Sangeet Night' })).toBeVisible()

    // Accessibility Audit: PlanView (Overview Tab)
    const planViewAxe = await new AxeBuilder({ page }).analyze()
    expect(planViewAxe.violations).toEqual([])

    // Switch to Budget Tab
    await page.locator('button.tab', { hasText: /Budget/i }).click()
    await expect(page.locator('.donut-wrap')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.row').last()).toBeVisible({ timeout: 10000 })

    // Accessibility Audit: PlanView (Budget Tab)
    const budgetTabAxe = await new AxeBuilder({ page }).analyze()
    expect(budgetTabAxe.violations).toEqual([])

    // Switch to Guests Tab
    await page.locator('button.tab', { hasText: /Guests/i }).click()
    await expect(page.locator('.guests-wrap')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(400)

    // Accessibility Audit: PlanView (Guests Tab)
    const guestsTabAxe = await new AxeBuilder({ page }).analyze()
    expect(guestsTabAxe.violations).toEqual([])

    // Open Share Modal
    const shareBtn = page.getByRole('button', { name: 'Share' })
    await shareBtn.click()
    await expect(page.locator('#share-modal-title')).toBeVisible()

    // Enable sharing if not enabled
    const enableBtn = page.getByRole('button', { name: 'Enable link' })
    if (await enableBtn.isVisible()) {
      await enableBtn.click()
      await expect(page.getByRole('button', { name: 'Revoke link' })).toBeVisible()
      await page.waitForTimeout(400)
    }
    const shareInput = page.locator('input[aria-label="Shareable URL"]')
    await expect(shareInput).toBeVisible()
    const shareUrl = await shareInput.inputValue()

    // Accessibility Audit: Share Modal
    const shareModalAxe = await new AxeBuilder({ page }).analyze()
    expect(shareModalAxe.violations).toEqual([])

    // Close Share Modal
    await page.locator('button[aria-label="Close share dialog"]').click()
    await expect(page.locator('#share-modal-title')).not.toBeVisible()

    // 3. Shared Plan Page
    await page.goto(shareUrl)
    await expect(page.locator('h1', { hasText: 'Zara & Neil Sangeet Night' })).toBeVisible({ timeout: 15000 })

    // Accessibility Audit: Shared Plan Public View
    const publicPlanAxe = await new AxeBuilder({ page }).analyze()
    expect(publicPlanAxe.violations).toEqual([])

    // 4. Auth Modal
    await page.goto('/')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForLoadState('networkidle')
    const signOutBtn = page.getByRole('button', { name: /Sign out/i })
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click()
    }
    const signInBtn = page.getByRole('button', { name: /Sign in/i })
    await expect(signInBtn).toBeVisible({ timeout: 10000 })
    await signInBtn.click()
    await expect(page.locator('#auth-modal-title')).toBeVisible()
    await page.waitForTimeout(300)

    // Accessibility Audit: Auth Modal
    const authModalAxe = await new AxeBuilder({ page }).analyze()
    expect(authModalAxe.violations).toEqual([])
  })
})
