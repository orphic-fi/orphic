/*
 * Screenshots for review. Two servers:
 *  - vite preview of dist/ (production build) for the disconnected and static pages
 *  - vite dev with VITE_DEMO=1 for connected demo states (demo cannot run in a production build)
 * Run `npm run build` first.
 */
const path = require('path')
const { chromium } = require('playwright')
const { preview, createServer } = require('vite')

const root = path.resolve(__dirname, '..')
const out = path.join(root, 'screenshots')

async function shot(browser, url, name, { width = 1280, height = 800, prepare } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('main h1, main h2', { timeout: 60_000 })
  await page.waitForTimeout(800)
  if (prepare) await prepare(page)
  await page.waitForTimeout(300)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > width) console.warn(`horizontal overflow at ${width}: scrollWidth ${scrollWidth} (${name})`)
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false })
  await page.screenshot({ path: path.join(out, `${name}-full.png`), fullPage: true })
  await ctx.close()
  console.log('saved', path.join(out, `${name}.png`))
}

async function main() {
  const prod = await preview({ root, preview: { port: 4173, strictPort: true } })
  const prodUrl = prod.resolvedUrls.local[0].replace(/\/$/, '')

  process.env.VITE_DEMO = '1'
  const dev = await createServer({ root, server: { port: 5199, strictPort: true }, logLevel: 'silent' })
  await dev.listen()
  const devUrl = `http://localhost:5199`

  const browser = await chromium.launch()

  // Production build, no wallet.
  await shot(browser, `${prodUrl}/`, 'vaults-disconnected')
  await shot(browser, `${prodUrl}/`, 'vaults-disconnected-375', { width: 375, height: 812 })
  await shot(browser, `${prodUrl}/agents`, 'agents')
  await shot(browser, `${prodUrl}/how-it-works`, 'how-it-works')

  // Demo fixtures.
  await shot(browser, `${devUrl}/`, 'vaults-connected-demo')
  await shot(browser, `${devUrl}/`, 'vaults-connected-demo-375', { width: 375, height: 812 })
  await shot(browser, `${devUrl}/`, 'senior-withdraw-demo', {
    prepare: async (page) => {
      await page.locator('section[data-kind="senior"] button', { hasText: 'Withdraw' }).first().click()
      await page.locator('section[data-kind="senior"] input').fill('2500')
    },
  })
  await shot(browser, `${devUrl}/`, 'junior-deposit-summary-demo', {
    prepare: async (page) => {
      await page.locator('section[data-kind="junior"] input').fill('1000')
    },
  })
  await shot(browser, `${devUrl}/`, 'junior-exit-timeline-demo', {
    prepare: async (page) => {
      await page.locator('section[data-kind="junior"] button', { hasText: 'Request exit' }).first().click()
    },
  })
  await shot(browser, `${devUrl}/?scenario=cover`, 'senior-cover-demo')

  await browser.close()
  await dev.close()
  await prod.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
