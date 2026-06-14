import { chromium } from 'playwright'
import * as cheerio from 'cheerio'

export interface RenderResult {
  html: string
  headers: Record<string, string>
  statusCode: number
  cookies: Array<{ name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: string }>
  requests: string[]
  performance: { ttfb: number; domContentLoaded: number; load: number }
}

export async function renderPage(url: string): Promise<RenderResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'NexSight-Bot/1.0 (+https://nexsight.app)',
  })
  const page = await context.newPage()

  const requests: string[] = []
  page.on('request', (req) => requests.push(req.url()))

  const startTime = Date.now()
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  const load = Date.now() - startTime

  const mainHeaders = response ? await response.allHeaders().catch(() => ({})) : {}
  const statusCode = response ? response.status() : 200

  const perfTiming = await page.evaluate(() => {
    const t = performance.timing
    return {
      ttfb: t.responseStart - t.requestStart,
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      load: t.loadEventEnd - t.navigationStart,
    }
  }).catch(() => ({ ttfb: 0, domContentLoaded: 0, load }))

  const html = await page.content()
  const rawCookies = await context.cookies()
  const cookies = rawCookies.map((c) => ({
    name: c.name, value: c.value, httpOnly: c.httpOnly,
    secure: c.secure, sameSite: c.sameSite ?? 'None',
  }))

  await browser.close()
  return { html, headers: mainHeaders, statusCode, cookies, requests, performance: perfTiming }
}

export interface CheerioRenderResult {
  $: cheerio.CheerioAPI
  html: string
  headers: Record<string, string>
  statusCode: number
  cookies: string[]
}

export async function cheerioFromPlaywright(url: string): Promise<CheerioRenderResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; NexSight/1.0; +https://nexsight.app)',
  })
  const page = await context.newPage()

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  const mainHeaders = response ? await response.allHeaders().catch(() => ({})) : {}
  const statusCode = response ? response.status() : 200

  const html = await page.content()
  const rawCookies = await context.cookies()

  // Reconstruct Set-Cookie-style strings with real flag data from Playwright
  const cookieStrings = rawCookies.map((c) => {
    let s = `${c.name}=${c.value}`
    if (c.httpOnly) s += '; HttpOnly'
    if (c.secure) s += '; Secure'
    if (c.sameSite && c.sameSite !== 'None') s += `; SameSite=${c.sameSite}`
    return s
  })

  await browser.close()
  return { $: cheerio.load(html), html, headers: mainHeaders, statusCode, cookies: cookieStrings }
}
