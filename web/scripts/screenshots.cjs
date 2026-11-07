/* Takes screenshots of the vaults page from the production build in dist/. Run `npm run build` first. */
const path = require('path')
const { chromium } = require('playwright')
const { preview } = require('vite')

async function main() {
  const server = await preview({ root: path.resolve(__dirname, '..'), preview: { port: 4173, strictPort: true } })
  const url = server.resolvedUrls.local[0]
  const browser = await chromium.launch()
  const out = path.resolve(__dirname, '..', 'screenshots')
  const shots = [
    { name: 'vaults-1280x800.png', width: 1280, height: 800 },
    { name: 'vaults-375x812.png', width: 375, height: 812 },
  ]
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    if (scrollWidth > s.width) console.warn(`horizontal overflow at ${s.width}: scrollWidth ${scrollWidth}`)
    await page.screenshot({ path: path.join(out, s.name), fullPage: false })
    await page.screenshot({ path: path.join(out, s.name.replace('.png', '-full.png')), fullPage: true })
    await ctx.close()
    console.log('saved', path.join(out, s.name))
  }
  await browser.close()
  await server.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
