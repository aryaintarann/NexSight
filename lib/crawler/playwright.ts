import { chromium } from 'playwright'

export interface RenderResult {
  html: string
  cookies: Array<{ name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: string }>
  requests: string[]
  performance: {
    ttfb: number
    domContentLoaded: number
    load: number
  }
}

export async function renderPage(url: string): Promise<RenderResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'NexSight-Bot/1.0 (+https://github.com/teridox/nexsight)',
  })
  const page = await context.newPage()

  const requests: string[] = []
  page.on('request', (req) => requests.push(req.url()))

  let ttfb = 0
  let domContentLoaded = 0
  let load = 0

  page.on('response', async (res) => {
    if (res.url() === url && !ttfb) {
      ttfb = Date.now()
    }
  })

  const startTime = Date.now()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  load = Date.now() - startTime

  const perfTiming = await page.evaluate(() => {
    const timing = performance.timing
    return {
      ttfb: timing.responseStart - timing.requestStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      load: timing.loadEventEnd - timing.navigationStart,
    }
  }).catch(() => ({ ttfb: 0, domContentLoaded: 0, load }))

  const html = await page.content()
  const rawCookies = await context.cookies()
  const cookies = rawCookies.map((c) => ({
    name: c.name,
    value: c.value,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite ?? 'None',
  }))

  await browser.close()

  return { html, cookies, requests, performance: perfTiming }
}
