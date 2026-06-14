import axios from 'axios'
import type { GeoResult, ScanIssue, CheckResult } from '@/types'

// ─── G-01: E-E-A-T Signal Detection ──────────────────────────────────────────

function checkEEAT(
  $: ReturnType<typeof import('cheerio').load>,
  baseUrl: string
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100
  const html = $.html()

  // Author byline signals
  const hasAuthor =
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0 ||
    html.includes('"author"') ||
    $('[class*="author"]').length > 0

  if (!hasAuthor) {
    score -= 20
    issues.push({ module: 'geo', severity: 'medium', code: 'G-01-AU', title: 'No author byline detected', recommendation: 'Add author information with schema markup or visible byline.' })
  }

  // Date signals
  const hasDate =
    $('[itemprop="datePublished"]').length > 0 ||
    $('[itemprop="dateModified"]').length > 0 ||
    $('meta[property="article:published_time"]').length > 0 ||
    html.includes('"datePublished"') ||
    html.includes('"dateModified"')

  if (!hasDate) {
    score -= 20
    issues.push({ module: 'geo', severity: 'medium', code: 'G-01-DT', title: 'No publication date detected', recommendation: 'Add datePublished and dateModified to schema markup.' })
  }

  // Organization/Person schema
  const hasOrgSchema = html.includes('"Organization"') || html.includes('"Person"')
  if (!hasOrgSchema) {
    score -= 15
    issues.push({ module: 'geo', severity: 'low', code: 'G-01-ORG', title: 'No Organization or Person schema', recommendation: 'Add Organization/Person structured data to establish entity identity.' })
  }

  // About & Contact page links
  const origin = new URL(baseUrl).origin
  const allLinks = $('a[href]').map((_, el) => $(el).attr('href') ?? '').get()
  const hasAbout = allLinks.some((h) => /about/i.test(h))
  const hasContact = allLinks.some((h) => /contact/i.test(h))

  if (!hasAbout) {
    score -= 15
    issues.push({ module: 'geo', severity: 'low', code: 'G-01-AB', title: 'No About page link found', recommendation: 'Link to an About page to signal credibility.' })
  }
  if (!hasContact) {
    score -= 10
    issues.push({ module: 'geo', severity: 'low', code: 'G-01-CO', title: 'No Contact page link found', recommendation: 'Link to a Contact page to signal trustworthiness.' })
  }

  return { passed: score >= 60, score: Math.max(0, score), details: `author:${hasAuthor} date:${hasDate} org:${hasOrgSchema} about:${hasAbout} contact:${hasContact}`, issues }
}

// ─── G-02: AI Citability Score ────────────────────────────────────────────────

function checkAiCitability(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []

  // Extract main content
  let mainText = ''
  const mainEl = $('article, main, [role="main"]').first()
  mainText = mainEl.length > 0 ? mainEl.text() : $('body').text()
  mainText = mainText.replace(/\s+/g, ' ').trim()

  const words = mainText.split(' ').filter(Boolean)
  const first200Words = words.slice(0, 200).join(' ')

  let score = 0

  // Word count completeness
  if (words.length >= 300) score += 25
  else if (words.length >= 150) score += 15
  else {
    score += 5
    issues.push({ module: 'geo', severity: 'medium', code: 'G-02-WC', title: 'Thin content (< 300 words)', description: `${words.length} words detected.`, recommendation: 'Expand content to at least 300 words for better AI citability.' })
  }

  // Direct answer in first sentence (definition patterns)
  const firstSentence = first200Words.split(/[.!?]/)[0] ?? ''
  const isDefinitive = /is |are |refers to |means |defined as /i.test(firstSentence)
  if (isDefinitive) score += 25
  else issues.push({ module: 'geo', severity: 'low', code: 'G-02-DA', title: 'First sentence lacks direct answer', recommendation: 'Start content with a direct, definitional statement for better AI citability.' })

  // Answer density: presence of specific facts/numbers in first 200 words
  const hasNumbers = /\d+/.test(first200Words)
  const hasList = $('ul li, ol li').length > 0
  if (hasNumbers) score += 15
  if (hasList) { score += 20; }
  else issues.push({ module: 'geo', severity: 'low', code: 'G-02-LS', title: 'No lists detected', recommendation: 'Use bullet/numbered lists to improve answer density for AI snippets.' })

  // Definition presence
  const hasDefinition = /is a |is an |is the |are the /i.test(first200Words)
  if (hasDefinition) score += 15

  score = Math.min(100, score)
  return { passed: score >= 50, score, details: `words:${words.length} definitive:${isDefinitive} lists:${hasList} numbers:${hasNumbers}`, issues }
}

// ─── G-03: FAQ Schema Audit ───────────────────────────────────────────────────

function checkFaqSchema(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []

  let faqCount = 0
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '')
      const schemas = Array.isArray(data) ? data : [data]
      schemas.forEach((s) => {
        if (s['@type'] === 'FAQPage') {
          faqCount = (s.mainEntity ?? []).length
        }
      })
    } catch { /* ignore */ }
  })

  // PAA signals: accordion, details, summary elements
  const accordionCount = $('details, [class*="accordion"], [class*="faq"]').length

  let score = 0
  if (faqCount > 0) {
    score = Math.min(100, 50 + faqCount * 10)
  } else if (accordionCount > 0) {
    score = 40
    issues.push({ module: 'geo', severity: 'medium', code: 'G-03-FS', title: 'FAQ content found but no FAQPage schema', recommendation: 'Add FAQPage JSON-LD schema to your FAQ/accordion content.' })
  } else {
    score = 20
    issues.push({ module: 'geo', severity: 'low', code: 'G-03-NF', title: 'No FAQ content or schema detected', recommendation: 'Add FAQ sections with FAQPage schema to capture PAA (People Also Ask) spots.' })
  }

  return { passed: faqCount > 0, score, details: `faqSchema:${faqCount} accordion:${accordionCount}`, issues }
}

// ─── G-04: Content Freshness ──────────────────────────────────────────────────

function checkContentFreshness(
  $: ReturnType<typeof import('cheerio').load>,
  headers: Record<string, string | string[] | undefined>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  const now = Date.now()
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000

  let latestDate: Date | null = null

  // Check Last-Modified header
  const lastMod = headers['last-modified'] as string | undefined
  if (lastMod) {
    const d = new Date(lastMod)
    if (!isNaN(d.getTime())) latestDate = d
  }

  // Check dateModified in JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '')
      const schemas = Array.isArray(data) ? data : [data]
      schemas.forEach((s) => {
        const dm = s.dateModified ?? s.datePublished
        if (dm) {
          const d = new Date(dm)
          if (!isNaN(d.getTime()) && (!latestDate || d > latestDate)) latestDate = d
        }
      })
    } catch { /* ignore */ }
  })

  // Check article:modified_time meta
  const ogModified = $('meta[property="article:modified_time"]').attr('content')
  if (ogModified) {
    const d = new Date(ogModified)
    if (!isNaN(d.getTime()) && (!latestDate || d > latestDate)) latestDate = d
  }

  if (!latestDate) {
    return { passed: false, score: 40, details: 'no date signals found', issues: [{ module: 'geo', severity: 'medium', code: 'G-04-ND', title: 'No content date signals detected', recommendation: 'Add dateModified/datePublished schema and Last-Modified headers.' }] }
  }

  const ageMs = now - latestDate.getTime()
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

  if (latestDate.getTime() < oneYearAgo) {
    issues.push({ module: 'geo', severity: 'high', code: 'G-04-ST', title: 'Content is stale (> 1 year old)', description: `Last updated: ${latestDate.toISOString().split('T')[0]} (${ageDays} days ago)`, recommendation: 'Update content regularly to maintain freshness signals for AI search.' })
    return { passed: false, score: 30, details: `lastModified:${latestDate.toISOString()} ageDays:${ageDays}`, issues }
  }

  const score = ageDays < 30 ? 100 : ageDays < 90 ? 80 : ageDays < 180 ? 60 : 40
  return { passed: true, score, details: `lastModified:${latestDate.toISOString()} ageDays:${ageDays}`, issues }
}

// ─── G-05: AI Crawler Access ──────────────────────────────────────────────────

async function checkAiCrawlerAccess(baseUrl: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []
  const origin = new URL(baseUrl).origin

  const AI_BOTS = [
    { name: 'GPTBot', pattern: /user-agent:\s*gptbot/i },
    { name: 'ClaudeBot', pattern: /user-agent:\s*claudebot/i },
    { name: 'Google-Extended', pattern: /user-agent:\s*google-extended/i },
    { name: 'Gemini-Bot', pattern: /user-agent:\s*gemini-bot/i },
  ]

  try {
    const { data: robotsTxt } = await axios.get(`${origin}/robots.txt`, { timeout: 10000, validateStatus: () => true })
    if (typeof robotsTxt !== 'string') {
      return { passed: false, score: 50, details: 'robots.txt unavailable', issues: [{ module: 'geo', severity: 'info', code: 'G-05-NA', title: 'Cannot check AI crawler access (robots.txt unavailable)' }] }
    }

    let blocked = 0
    const lines = robotsTxt.split('\n')
    let currentAgent = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^user-agent:/i.test(trimmed)) {
        currentAgent = trimmed.replace(/^user-agent:\s*/i, '').toLowerCase()
      } else if (/^disallow:/i.test(trimmed) && trimmed.replace(/^disallow:\s*/i, '').trim() !== '') {
        const isBlocked = currentAgent === '*' || AI_BOTS.some((b) => currentAgent.includes(b.name.toLowerCase()))
        if (isBlocked) {
          const botName = currentAgent === '*' ? 'all bots (including AI crawlers)' : currentAgent
          blocked++
          issues.push({
            module: 'geo', severity: 'high', code: 'G-05-BL',
            title: `AI crawler blocked: ${botName}`,
            description: `Disallow: ${trimmed.replace(/^disallow:\s*/i, '')}`,
            recommendation: `Consider allowing ${botName} to access your content for AI search visibility.`,
          })
        }
      }
    }

    const score = Math.max(0, 100 - blocked * 25)
    return { passed: blocked === 0, score, details: `blocked:${blocked}`, issues }
  } catch {
    return { passed: false, score: 50, details: 'error fetching robots.txt', issues: [] }
  }
}

// ─── G-07: OpenGraph Meta Tags ────────────────────────────────────────────────

function checkOpenGraph(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
  const ogType = $('meta[property="og:type"]').attr('content')
  const twitterCard = $('meta[name="twitter:card"]').attr('content')

  if (!ogTitle) {
    score -= 25
    issues.push({ module: 'geo', severity: 'medium', code: 'G-07-OT', title: 'Missing og:title', recommendation: 'Add <meta property="og:title" content="...">.' })
  }
  if (!ogDesc) {
    score -= 20
    issues.push({ module: 'geo', severity: 'medium', code: 'G-07-OD', title: 'Missing og:description', recommendation: 'Add <meta property="og:description" content="...">.' })
  }
  if (!ogImage) {
    score -= 25
    issues.push({ module: 'geo', severity: 'medium', code: 'G-07-OI', title: 'Missing og:image', recommendation: 'Add og:image for rich previews in social and AI-generated summaries.' })
  }
  if (!ogType) {
    score -= 10
    issues.push({ module: 'geo', severity: 'low', code: 'G-07-OY', title: 'Missing og:type', recommendation: 'Add <meta property="og:type" content="website"> or "article".' })
  }
  if (!twitterCard) {
    score -= 20
    issues.push({ module: 'geo', severity: 'low', code: 'G-07-TC', title: 'Missing twitter:card meta', recommendation: 'Add <meta name="twitter:card" content="summary_large_image">.' })
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    details: `og:title=${!!ogTitle} og:desc=${!!ogDesc} og:image=${!!ogImage} twitter=${!!twitterCard}`,
    issues,
  }
}

// ─── G-08: llms.txt ───────────────────────────────────────────────────────────

async function checkLlmsTxt(baseUrl: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const origin = new URL(baseUrl).origin
  const urls = [`${origin}/llms.txt`, `${origin}/.well-known/llms.txt`]

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 8000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexSight/1.0; +https://nexsight.app)' },
      })
      if (res.status === 200 && typeof res.data === 'string' && res.data.length > 10) {
        return {
          passed: true, score: 100,
          details: `llms.txt found at ${url} (${res.data.length} bytes)`,
          issues: [],
        }
      }
    } catch { /* not found */ }
  }

  return {
    passed: false, score: 60,
    details: 'llms.txt not found',
    issues: [{
      module: 'geo', severity: 'low', code: 'G-08-NF',
      title: 'No llms.txt file found',
      description: 'llms.txt helps AI crawlers understand your site content and structure.',
      recommendation: 'Create /llms.txt following the standard at llmstxt.org.',
    }],
  }
}

// ─── Main GEO Scanner ─────────────────────────────────────────────────────────

export async function runGeoScan(
  url: string,
  $: ReturnType<typeof import('cheerio').load>,
  headers: Record<string, string | string[] | undefined>
): Promise<GeoResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const [eatResult, citabilityResult, faqResult, freshnessResult, crawlerResult, ogResult, llmsResult] = await Promise.all([
    Promise.resolve(checkEEAT($, url)),
    Promise.resolve(checkAiCitability($)),
    Promise.resolve(checkFaqSchema($)),
    Promise.resolve(checkContentFreshness($, headers as Record<string, string | string[] | undefined>)),
    checkAiCrawlerAccess(url),
    Promise.resolve(checkOpenGraph($)),
    checkLlmsTxt(url),
  ])

  checks['g01'] = { passed: eatResult.passed, score: eatResult.score, details: eatResult.details }
  checks['g02'] = { passed: citabilityResult.passed, score: citabilityResult.score, details: citabilityResult.details }
  checks['g03'] = { passed: faqResult.passed, score: faqResult.score, details: faqResult.details }
  checks['g04'] = { passed: freshnessResult.passed, score: freshnessResult.score, details: freshnessResult.details }
  checks['g05'] = { passed: crawlerResult.passed, score: crawlerResult.score, details: crawlerResult.details }
  checks['g07'] = { passed: ogResult.passed, score: ogResult.score, details: ogResult.details }
  checks['g08'] = { passed: llmsResult.passed, score: llmsResult.score, details: llmsResult.details }

  allIssues.push(...eatResult.issues, ...citabilityResult.issues, ...faqResult.issues, ...freshnessResult.issues, ...crawlerResult.issues, ...ogResult.issues, ...llmsResult.issues)

  // Weighted: G-01(22%) G-02(23%) G-03(11%) G-04(11%) G-05(17%) G-07(11%) G-08(5%)
  const score = Math.round(
    checks['g01'].score * 0.22 +
    checks['g02'].score * 0.23 +
    checks['g03'].score * 0.11 +
    checks['g04'].score * 0.11 +
    checks['g05'].score * 0.17 +
    checks['g07'].score * 0.11 +
    checks['g08'].score * 0.05
  )

  return { score, issues: allIssues, checks }
}
