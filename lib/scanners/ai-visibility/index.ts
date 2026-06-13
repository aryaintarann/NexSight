import OpenAI from 'openai'
import type { AiVisibilityResult, ScanIssue, CheckResult } from '@/types'

// ─── A-01: AI Citation Probability (via OpenRouter) ───────────────────────────

async function checkAiCitationProbability(
  title: string,
  contentSample: string
): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      passed: false, score: 50,
      details: 'OpenRouter API key not configured',
      issues: [{ module: 'ai', severity: 'info', code: 'A-01-NK', title: 'AI citation check skipped (no OPENROUTER_API_KEY)' }],
    }
  }

  try {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/teridox/nexsight',
        'X-Title': 'NexSight Scanner',
      },
    })

    const prompt = `You are evaluating web content for AI search citation likelihood.

Page title: "${title}"

Content excerpt (first 500 words):
${contentSample}

Rate from 0 to 100 how likely you would cite this content when answering a relevant question. Consider:
- Content clarity and directness
- Factual density
- Authoritative tone
- Structured information
- Unique value

Respond with ONLY a single integer between 0 and 100.`

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? '50'
    const score = Math.min(100, Math.max(0, parseInt(raw, 10) || 50))

    if (score < 40) {
      issues.push({
        module: 'ai', severity: 'high', code: 'A-01-LC',
        title: 'Low AI citation probability',
        description: `Score: ${score}/100`,
        recommendation: 'Improve content clarity, add direct answers, and increase factual density.',
      })
    } else if (score < 60) {
      issues.push({
        module: 'ai', severity: 'medium', code: 'A-01-MC',
        title: 'Moderate AI citation probability',
        description: `Score: ${score}/100`,
        recommendation: 'Strengthen the opening paragraph with a direct, authoritative answer.',
      })
    }

    return { passed: score >= 60, score, details: `aiScore:${score}`, issues }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      passed: false, score: 50, details: `error: ${msg}`,
      issues: [{ module: 'ai', severity: 'info', code: 'A-01-ER', title: 'AI citation check failed', description: msg }],
    }
  }
}

// ─── A-02: Heading Hierarchy for AI ──────────────────────────────────────────

function checkHeadingHierarchy(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const h1s = $('h1')
  const h2s = $('h2')
  const h3s = $('h3')

  // Single H1 check
  if (h1s.length === 0) {
    score -= 30
    issues.push({ module: 'ai', severity: 'critical', code: 'A-02-H1M', title: 'Missing H1 tag', recommendation: 'Add exactly one H1 tag that clearly describes the page topic.' })
  } else if (h1s.length > 1) {
    score -= 15
    issues.push({ module: 'ai', severity: 'medium', code: 'A-02-H1D', title: `Multiple H1 tags (${h1s.length})`, recommendation: 'Use exactly one H1 per page.' })
  }

  // H2/H3 presence
  if (h2s.length === 0) {
    score -= 20
    issues.push({ module: 'ai', severity: 'high', code: 'A-02-H2M', title: 'No H2 headings found', recommendation: 'Add H2 subheadings to structure content into logical sections for AI parsing.' })
  }

  // Heading quality: too short
  let shortHeadings = 0
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text.split(' ').length < 3) shortHeadings++
  })

  if (shortHeadings > 0) {
    score -= shortHeadings * 5
    issues.push({
      module: 'ai', severity: 'low', code: 'A-02-HS',
      title: `${shortHeadings} heading(s) too short (< 3 words)`,
      recommendation: 'Use descriptive headings with 3+ words for better AI comprehension.',
    })
  }

  // Check for heading hierarchy skips (e.g., H1 → H3 without H2)
  const headings: Array<{ level: number; text: string }> = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push({ level: parseInt(el.tagName.replace('h', ''), 10), text: $(el).text().trim() })
  })

  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      score -= 10
      issues.push({
        module: 'ai', severity: 'low', code: 'A-02-SK',
        title: 'Heading hierarchy skip detected',
        description: `H${headings[i - 1].level} → H${headings[i].level} without intermediate level`,
        recommendation: 'Maintain logical heading hierarchy (H1 → H2 → H3) for AI parsing.',
      })
      break
    }
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    details: `h1:${h1s.length} h2:${h2s.length} h3:${h3s.length} shortHeadings:${shortHeadings}`,
    issues,
  }
}

// ─── A-03: Conversational Query Match ────────────────────────────────────────

function checkConversationalMatch(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let matchScore = 0
  let testedSections = 0

  // For each H2 section, check if content answers "what/how" questions
  $('h2').each((_, heading) => {
    const headingText = $(heading).text().trim()
    if (!headingText) return
    testedSections++

    // Collect text content until next H2
    let sectionText = ''
    let next = $(heading).next()
    while (next.length && !next.is('h2')) {
      sectionText += ' ' + next.text()
      next = next.next()
    }
    sectionText = sectionText.trim()

    if (!sectionText) return

    // Direct answer patterns: definition, numbered steps, clear explanation
    const hasDirectAnswer =
      /is |are |means |refers to |defined as /i.test(sectionText.split(/[.!?]/)[0] ?? '') ||
      /<ol|<ul|\d+\.\s/.test(sectionText) ||
      sectionText.length > 200

    if (hasDirectAnswer) matchScore += 100 / Math.max(testedSections, 1)
  })

  if (testedSections === 0) {
    issues.push({ module: 'ai', severity: 'medium', code: 'A-03-NS', title: 'No H2-structured sections to evaluate', recommendation: 'Structure content with H2 headings that act as conversational question answers.' })
    return { passed: false, score: 30, details: 'no sections', issues }
  }

  const avgScore = Math.min(100, testedSections > 0 ? matchScore : 0)

  if (avgScore < 40) {
    issues.push({
      module: 'ai', severity: 'high', code: 'A-03-LM',
      title: 'Low conversational query match',
      recommendation: 'Start each H2 section with a direct answer to the implied question.',
    })
  }

  return {
    passed: avgScore >= 50,
    score: Math.round(avgScore),
    details: `sections:${testedSections} matchScore:${Math.round(avgScore)}`,
    issues,
  }
}

// ─── Main AI Visibility Scanner ───────────────────────────────────────────────

export async function runAiVisibilityScan(
  url: string,
  $: ReturnType<typeof import('cheerio').load>
): Promise<AiVisibilityResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const title = $('title').first().text().trim()
  const bodyText = $('article, main, [role="main"]').first().text() || $('body').text()
  const contentSample = bodyText.replace(/\s+/g, ' ').trim().slice(0, 2000)

  const headingResult = checkHeadingHierarchy($)
  const queryResult = checkConversationalMatch($)
  const citationResult = await checkAiCitationProbability(title, contentSample)

  checks['a01'] = { passed: citationResult.passed, score: citationResult.score, details: citationResult.details }
  checks['a02'] = { passed: headingResult.passed, score: headingResult.score, details: headingResult.details }
  checks['a03'] = { passed: queryResult.passed, score: queryResult.score, details: queryResult.details }

  allIssues.push(...citationResult.issues, ...headingResult.issues, ...queryResult.issues)

  // Weighted: A-01(40%) A-02(30%) A-03(30%)
  const score = Math.round(
    checks['a01'].score * 0.40 +
    checks['a02'].score * 0.30 +
    checks['a03'].score * 0.30
  )

  return { score, issues: allIssues, checks }
}
