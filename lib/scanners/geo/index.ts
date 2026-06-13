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

// ─── Main GEO Scanner ─────────────────────────────────────────────────────────

export async function runGeoScan(
  url: string,
  $: ReturnType<typeof import('cheerio').load>,
  headers: Record<string, string | string[] | undefined>
): Promise<GeoResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const [eatResult, citabilityResult, faqResult, freshnessResult, crawlerResult] = await Promise.all([
    Promise.resolve(checkEEAT($, url)),
    Promise.resolve(checkAiCitability($)),
    Promise.resolve(checkFaqSchema($)),
    Promise.resolve(checkContentFreshness($, headers as Record<string, string | string[] | undefined>)),
    checkAiCrawlerAccess(url),
  ])

  checks['g01'] = { passed: eatResult.passed, score: eatResult.score, details: eatResult.details }
  checks['g02'] = { passed: citabilityResult.passed, score: citabilityResult.score, details: citabilityResult.details }
  checks['g03'] = { passed: faqResult.passed, score: faqResult.score, details: faqResult.details }
  checks['g04'] = { passed: freshnessResult.passed, score: freshnessResult.score, details: freshnessResult.details }
  checks['g05'] = { passed: crawlerResult.passed, score: crawlerResult.score, details: crawlerResult.details }

  allIssues.push(...eatResult.issues, ...citabilityResult.issues, ...faqResult.issues, ...freshnessResult.issues, ...crawlerResult.issues)

  // Weighted: G-01(25%) G-02(30%) G-03(15%) G-04(15%) G-05(15%)
  const score = Math.round(
    checks['g01'].score * 0.25 +
    checks['g02'].score * 0.30 +
    checks['g03'].score * 0.15 +
    checks['g04'].score * 0.15 +
    checks['g05'].score * 0.15
  )

  return { score, issues: allIssues, checks }
}
