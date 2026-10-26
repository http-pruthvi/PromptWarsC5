import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'

async function runDesktopAudit(url, outDir) {
  console.info('Running Lighthouse Accessibility Desktop Audit...')
  const desktopRes = await lighthouse(url, {
    port: 9222,
    output: 'json',
    onlyCategories: ['accessibility'],
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
  })
  const score = Math.round((desktopRes?.lhr.categories.accessibility?.score ?? 0) * 100)
  console.info(`Lighthouse Desktop Accessibility Score: ${score}/100`)
  fs.writeFileSync(path.join(outDir, 'lighthouse-a11y-desktop.json'), JSON.stringify(desktopRes?.lhr, null, 2))
  return score
}

async function runMobileAudit(url, outDir) {
  console.info('Running Lighthouse Accessibility Mobile Audit...')
  const mobileRes = await lighthouse(url, {
    port: 9222,
    output: 'json',
    onlyCategories: ['accessibility'],
    formFactor: 'mobile',
  })
  const score = Math.round((mobileRes?.lhr.categories.accessibility?.score ?? 0) * 100)
  console.info(`Lighthouse Mobile Accessibility Score: ${score}/100`)
  fs.writeFileSync(path.join(outDir, 'lighthouse-a11y-mobile.json'), JSON.stringify(mobileRes?.lhr, null, 2))
  return score
}

async function runAudit() {
  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9222', '--headless=new', '--no-sandbox'],
  })

  try {
    const url = 'http://localhost:5173'
    const outDir = path.resolve('test-results')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const desktopScore = await runDesktopAudit(url, outDir)
    const mobileScore = await runMobileAudit(url, outDir)

    if (desktopScore !== 100 || mobileScore !== 100) {
      console.error(`FAIL: Expected 100/100, got Desktop: ${desktopScore}, Mobile: ${mobileScore}`)
      process.exit(1)
    } else {
      console.info('PASS: Lighthouse Accessibility Score is 100 on both Desktop and Mobile!')
    }
  } finally {
    await browser.close()
  }
}

runAudit().catch((err) => {
  console.error(err)
  process.exit(1)
})
