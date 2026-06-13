import axios from 'axios'
import { fetchAndParse, fetchHeaders } from '@/lib/crawler/cheerio'
import type { SeoResult, ScanIssue, CheckResult } from '@/types'

// ─── S-01: Meta Tags ──────────────────────────────────────────────────────────

function checkMetaTags(
  $: ReturnType<typeof import('cheerio').load>,
  baseUrl: string
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const title = $('title').first().text().trim()
  const description = $('meta[name="description"]').attr('content')?.trim() ?? ''
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? ''
  const robots = $('meta[name="robots"]').attr('content')?.trim() ?? ''

  if (!title) {
    score -= 30
    issues.push({ module: 'seo', severity: 'critical', code: 'S-01-T1', title: 'Missing <title> tag', recommendation: 'Add a descriptive <title> tag (30–60 characters).' })
  } else if (title.length < 30) {
    score -= 15
    issues.push({ module: 'seo', severity: 'medium', code: 'S-01-T2', title: 'Title too short', description: `Title is ${title.length} characters.`, recommendation: 'Aim for 30–60 characters.' })
  } else if (title.length > 60) {
    score -= 10
    issues.push({ module: 'seo', severity: 'low', code: 'S-01-T3', title: 'Title too long', description: `Title is ${title.length} characters.`, recommendation: 'Keep title under 60 characters to avoid truncation in SERPs.' })
  }

  if (!description) {
    score -= 25
    issues.push({ module: 'seo', severity: 'high', code: 'S-01-D1', title: 'Missing meta description', recommendation: 'Add a meta description (50–160 characters).' })
  } else if (description.length < 50) {
    score -= 10
    issues.push({ module: 'seo', severity: 'medium', code: 'S-01-D2', title: 'Meta description too short', description: `Description is ${description.length} characters.`, recommendation: 'Aim for 50–160 characters.' })
  } else if (description.length > 160) {
    score -= 5
    issues.push({ module: 'seo', severity: 'low', code: 'S-01-D3', title: 'Meta description too long', description: `Description is ${description.length} characters.`, recommendation: 'Keep description under 160 characters.' })
  }

  if (!canonical) {
    score -= 15
    issues.push({ module: 'seo', severity: 'medium', code: 'S-01-C1', title: 'Missing canonical tag', recommendation: 'Add <link rel="canonical" href="..."> to prevent duplicate content issues.' })
  }

  if (robots && (robots.includes('noindex') || robots.includes('nofollow'))) {
    issues.push({ module: 'seo', severity: 'high', code: 'S-01-R1', title: 'Page blocked from indexing', description: `robots meta: "${robots}"`, recommendation: 'Remove noindex/nofollow unless intentional.' })
  }

  return { passed: score >= 70, score: Math.max(0, score), details: `title:${title.length}chars desc:${description.length}chars canonical:${!!canonical}`, issues }
}

// ─── S-02 / S-06: PageSpeed Insights (Core Web Vitals + Page Speed) ──────────

interface PageSpeedResult {
  lcp: number
  cls: number
  inp: number
  fcp: number
  ttfb: number
  renderBlockingCount: number
  totalByteWeight: number
  score: number
  issues: ScanIssue[]
  checks: { s02: CheckResult; s06: CheckResult }
}

async function checkPageSpeed(url: string): Promise<PageSpeedResult> {
  const issues: ScanIssue[] = []

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`
    const { data } = await axios.get(apiUrl, { timeout: 30000 })
    const audits = data.lighthouseResult?.audits ?? {}
    const categories = data.lighthouseResult?.categories ?? {}

    const lcp = audits['largest-contentful-paint']?.numericValue ?? 0
    const cls = audits['cumulative-layout-shift']?.numericValue ?? 0
    const inp = audits['interaction-to-next-paint']?.numericValue ?? 0
    const fcp = audits['first-contentful-paint']?.numericValue ?? 0
    const ttfb = audits['server-response-time']?.numericValue ?? 0
    const renderBlockingCount = (audits['render-blocking-resources']?.details?.items ?? []).length
    const totalByteWeight = audits['total-byte-weight']?.numericValue ?? 0
    const perfScore = Math.round((categories.performance?.score ?? 0) * 100)

    // S-02 Core Web Vitals checks
    if (lcp > 4000) { issues.push({ module: 'seo', severity: 'critical', code: 'S-02-LCP', title: 'LCP is poor', description: `LCP: ${(lcp / 1000).toFixed(2)}s (target < 2.5s)`, recommendation: 'Optimize images, server response time, and render-blocking resources.' }) }
    else if (lcp > 2500) { issues.push({ module: 'seo', severity: 'high', code: 'S-02-LCP', title: 'LCP needs improvement', description: `LCP: ${(lcp / 1000).toFixed(2)}s (target < 2.5s)`, recommendation: 'Optimize largest content element loading.' }) }

    if (cls > 0.25) { issues.push({ module: 'seo', severity: 'critical', code: 'S-02-CLS', title: 'CLS is poor', description: `CLS: ${cls.toFixed(3)} (target < 0.1)`, recommendation: 'Reserve space for images, ads, and dynamic content.' }) }
    else if (cls > 0.1) { issues.push({ module: 'seo', severity: 'high', code: 'S-02-CLS', title: 'CLS needs improvement', description: `CLS: ${cls.toFixed(3)} (target < 0.1)`, recommendation: 'Add size attributes to images and embeds.' }) }

    if (inp > 500) { issues.push({ module: 'seo', severity: 'critical', code: 'S-02-INP', title: 'INP is poor', description: `INP: ${inp}ms (target < 200ms)`, recommendation: 'Minimize JavaScript execution time and long tasks.' }) }
    else if (inp > 200) { issues.push({ module: 'seo', severity: 'medium', code: 'S-02-INP', title: 'INP needs improvement', description: `INP: ${inp}ms (target < 200ms)`, recommendation: 'Optimize event handlers and reduce main thread blocking.' }) }

    // S-06 Page Speed checks
    if (ttfb > 600) { issues.push({ module: 'seo', severity: 'high', code: 'S-06-TTFB', title: 'Slow server response time (TTFB)', description: `TTFB: ${ttfb}ms (target < 600ms)`, recommendation: 'Use CDN, optimize server-side rendering, or upgrade hosting.' }) }
    if (renderBlockingCount > 0) { issues.push({ module: 'seo', severity: 'medium', code: 'S-06-RBR', title: `${renderBlockingCount} render-blocking resource(s)`, recommendation: 'Defer non-critical CSS/JS or inline critical styles.' }) }
    if (totalByteWeight > 5_000_000) { issues.push({ module: 'seo', severity: 'high', code: 'S-06-SIZE', title: 'Page size too large', description: `Total: ${(totalByteWeight / 1024 / 1024).toFixed(1)}MB`, recommendation: 'Compress images, minify assets, enable gzip/brotli.' }) }

    return {
      lcp, cls, inp, fcp, ttfb, renderBlockingCount, totalByteWeight,
      score: perfScore,
      issues,
      checks: {
        s02: { passed: lcp < 2500 && cls < 0.1 && inp < 200, score: perfScore, details: `LCP:${(lcp / 1000).toFixed(2)}s CLS:${cls.toFixed(3)} INP:${inp}ms` },
        s06: { passed: ttfb < 600 && renderBlockingCount === 0, score: Math.max(0, 100 - renderBlockingCount * 10 - (ttfb > 600 ? 20 : 0)), details: `TTFB:${ttfb}ms render-blocking:${renderBlockingCount}` },
      },
    }
  } catch {
    return {
      lcp: 0, cls: 0, inp: 0, fcp: 0, ttfb: 0, renderBlockingCount: 0, totalByteWeight: 0,
      score: 50,
      issues: [{ module: 'seo', severity: 'info', code: 'S-02-ERR', title: 'PageSpeed API unavailable', description: 'Could not fetch Core Web Vitals data.' }],
      checks: {
        s02: { passed: false, score: 50, details: 'PageSpeed API unavailable' },
        s06: { passed: false, score: 50, details: 'PageSpeed API unavailable' },
      },
    }
  }
}

// ─── S-03: Broken Links ───────────────────────────────────────────────────────

async function checkBrokenLinks(
  $: ReturnType<typeof import('cheerio').load>,
  baseUrl: string
): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []
  const origin = new URL(baseUrl).origin
  const hrefs: string[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
    try {
      const abs = href.startsWith('http') ? href : new URL(href, baseUrl).href
      if (abs.startsWith(origin)) hrefs.push(abs)
    } catch { /* invalid URL */ }
  })

  // Check up to 20 unique links to avoid long scan times
  const unique = [...new Set(hrefs)].slice(0, 20)
  let brokenCount = 0

  await Promise.allSettled(
    unique.map(async (link) => {
      try {
        const result = await fetchHeaders(link)
        if (result.statusCode >= 400) {
          brokenCount++
          issues.push({
            module: 'seo', severity: result.statusCode === 404 ? 'high' : 'medium',
            code: 'S-03-BL', title: `Broken link: ${result.statusCode}`,
            description: link, recommendation: 'Fix or remove broken links.',
            affected_url: link,
          })
        }
        if (result.redirectChain.length > 3) {
          issues.push({
            module: 'seo', severity: 'low', code: 'S-03-RC',
            title: 'Long redirect chain',
            description: `${result.redirectChain.length} redirects for: ${link}`,
            recommendation: 'Reduce redirect chains to improve crawl efficiency.',
            affected_url: link,
          })
        }
      } catch { /* network error */ }
    })
  )

  const score = Math.max(0, 100 - brokenCount * 20)
  return { passed: brokenCount === 0, score, details: `checked:${unique.length} broken:${brokenCount}`, issues }
}

// ─── S-04: Schema Markup ──────────────────────────────────────────────────────

const KNOWN_SCHEMA_TYPES = ['Article', 'Product', 'FAQPage', 'BreadcrumbList', 'LocalBusiness', 'WebPage', 'Organization', 'Person', 'Event', 'Recipe']

function checkSchemaMarkup(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  const foundTypes: string[] = []
  let parseErrors = 0

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() ?? ''
      const data = JSON.parse(raw)
      const schemas = Array.isArray(data) ? data : [data]
      schemas.forEach((s) => {
        const type = s['@type']
        if (type) foundTypes.push(Array.isArray(type) ? type[0] : type)
      })
    } catch {
      parseErrors++
      issues.push({ module: 'seo', severity: 'high', code: 'S-04-PE', title: 'Invalid JSON-LD schema markup', recommendation: 'Fix JSON syntax errors in schema markup.' })
    }
  })

  if (foundTypes.length === 0 && parseErrors === 0) {
    issues.push({ module: 'seo', severity: 'medium', code: 'S-04-MS', title: 'No structured data found', recommendation: 'Add JSON-LD schema markup (Article, Product, FAQ, etc.) to improve rich results eligibility.' })
  }

  const score = Math.max(0, Math.min(100, foundTypes.length * 25 - parseErrors * 20))
  return { passed: foundTypes.length > 0 && parseErrors === 0, score, details: `types:[${foundTypes.join(',')}] errors:${parseErrors}`, issues }
}

// ─── S-05: Sitemap & Robots.txt ───────────────────────────────────────────────

async function checkSitemapAndRobots(baseUrl: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []
  const origin = new URL(baseUrl).origin
  let score = 100

  // Check robots.txt
  let sitemapUrl = `${origin}/sitemap.xml`
  try {
    const { data: robotsTxt } = await axios.get(`${origin}/robots.txt`, { timeout: 10000, validateStatus: () => true })
    if (typeof robotsTxt !== 'string' || robotsTxt.length < 5) {
      score -= 20
      issues.push({ module: 'seo', severity: 'medium', code: 'S-05-RT1', title: 'robots.txt missing or empty', recommendation: 'Create a robots.txt file at the root of your domain.' })
    } else {
      const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i)
      if (sitemapMatch) sitemapUrl = sitemapMatch[1].trim()
    }
  } catch {
    score -= 20
    issues.push({ module: 'seo', severity: 'medium', code: 'S-05-RT2', title: 'Cannot fetch robots.txt', recommendation: 'Ensure robots.txt is accessible at your domain root.' })
  }

  // Check sitemap
  try {
    const { data: sitemapData, status } = await axios.get(sitemapUrl, { timeout: 10000, validateStatus: () => true })
    if (status !== 200 || typeof sitemapData !== 'string') {
      score -= 30
      issues.push({ module: 'seo', severity: 'high', code: 'S-05-SM1', title: 'Sitemap not found', description: `Expected at: ${sitemapUrl}`, recommendation: 'Create an XML sitemap and reference it in robots.txt.' })
    } else if (!sitemapData.includes('<urlset') && !sitemapData.includes('<sitemapindex')) {
      score -= 20
      issues.push({ module: 'seo', severity: 'high', code: 'S-05-SM2', title: 'Invalid sitemap format', recommendation: 'Ensure sitemap follows the XML sitemap protocol.' })
    } else {
      const urlCount = (sitemapData.match(/<url>/g) ?? []).length
      if (urlCount === 0) {
        score -= 10
        issues.push({ module: 'seo', severity: 'low', code: 'S-05-SM3', title: 'Sitemap has no URLs', recommendation: 'Add page URLs to your sitemap.' })
      }
    }
  } catch {
    score -= 30
    issues.push({ module: 'seo', severity: 'high', code: 'S-05-SM4', title: 'Cannot fetch sitemap', recommendation: 'Ensure your sitemap is publicly accessible.' })
  }

  return { passed: score >= 70, score: Math.max(0, score), details: `sitemapUrl:${sitemapUrl}`, issues }
}

// ─── Main SEO Scanner ─────────────────────────────────────────────────────────

export async function runSeoScan(url: string): Promise<SeoResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const { $, headers } = await fetchAndParse(url)

  const metaCheck = checkMetaTags($, url)
  checks['s01'] = { passed: metaCheck.passed, score: metaCheck.score, details: metaCheck.details }
  allIssues.push(...metaCheck.issues)

  const [pageSpeedResult, brokenLinkResult, sitemapResult] = await Promise.all([
    checkPageSpeed(url),
    checkBrokenLinks($, url),
    checkSitemapAndRobots(url),
  ])

  checks['s02'] = pageSpeedResult.checks.s02
  checks['s03'] = { passed: brokenLinkResult.passed, score: brokenLinkResult.score, details: brokenLinkResult.details }
  checks['s04'] = (() => { const r = checkSchemaMarkup($); allIssues.push(...r.issues); return { passed: r.passed, score: r.score, details: r.details } })()
  checks['s05'] = { passed: sitemapResult.passed, score: sitemapResult.score, details: sitemapResult.details }
  checks['s06'] = pageSpeedResult.checks.s06

  allIssues.push(...pageSpeedResult.issues, ...brokenLinkResult.issues, ...sitemapResult.issues)

  // Weighted score: S-01(25%) S-02(20%) S-03(15%) S-04(15%) S-05(15%) S-06(10%)
  const score = Math.round(
    checks['s01'].score * 0.25 +
    checks['s02'].score * 0.20 +
    checks['s03'].score * 0.15 +
    checks['s04'].score * 0.15 +
    checks['s05'].score * 0.15 +
    checks['s06'].score * 0.10
  )

  return { score, issues: allIssues, checks }
}
