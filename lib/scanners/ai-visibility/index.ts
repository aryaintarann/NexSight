import OpenAI from 'openai'
import type { AiVisibilityResult, ScanIssue, CheckResult } from '@/types'

// ─── A-01: AI Citation Probability + A-04: Multi-Platform Scores ──────────────

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

Rate how likely each AI system would cite this content (0-100 each):
1. ChatGPT (OpenAI) — prefers factual, structured, authoritative content
2. Gemini (Google) — prefers well-cited, comprehensive, E-E-A-T signals
3. Perplexity — prefers current, sourced, dense-information content
4. Claude (Anthropic) — prefers clear, well-reasoned, honest content

Respond with ONLY 4 integers separated by commas, in order: ChatGPT,Gemini,Perplexity,Claude
Example: 72,68,75,80`

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? '50,50,50,50'
    const parts = raw.split(',').map((s) => Math.min(100, Math.max(0, parseInt(s.trim(), 10) || 50)))
    const [chatgpt = 50, gemini = 50, perplexity = 50, claude = 50] = parts
    const score = Math.round((chatgpt + gemini + perplexity + claude) / 4)

    if (score < 40) {
      issues.push({
        module: 'ai', severity: 'high', code: 'A-01-LC',
        title: 'Low AI citation probability',
        description: `Score: ${score}/100`,
        recommendation: 'Improve content clarity, add direct answers, and increase factual density.',
        metadata: { chatgpt, gemini, perplexity, claude },
      })
    } else if (score < 60) {
      issues.push({
        module: 'ai', severity: 'medium', code: 'A-01-MC',
        title: 'Moderate AI citation probability',
        description: `Score: ${score}/100`,
        recommendation: 'Strengthen the opening paragraph with a direct, authoritative answer.',
        metadata: { chatgpt, gemini, perplexity, claude },
      })
    }

    return {
      passed: score >= 60,
      score,
      details: `aiScore:${score} chatgpt:${chatgpt} gemini:${gemini} perplexity:${perplexity} claude:${claude}`,
      issues,
    }
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

// ─── A-05: Content Originality ────────────────────────────────────────────────

function checkContentOriginality(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(' ').filter(Boolean).length

  const mainText = ($('article, main, .content, #content').text() || '').trim()
  const mainWordCount = mainText.split(' ').filter(Boolean).length
  const contentRatio = wordCount > 0 ? mainWordCount / wordCount : 0

  if (wordCount < 100) {
    score -= 40
    issues.push({
      module: 'ai', severity: 'high', code: 'A-05-TH',
      title: 'Very thin content — likely not indexable by AI',
      description: `Only ${wordCount} words detected on page.`,
      recommendation: 'Add substantive content of at least 300 words.',
    })
  } else if (contentRatio < 0.3 && wordCount > 200) {
    score -= 25
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-05-BP',
      title: 'High boilerplate ratio — most text is navigation/footer',
      recommendation: 'Increase main content area relative to navigation and footer text.',
    })
  }

  const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 20)
  const unique = new Set(sentences.map((s) => s.trim().toLowerCase().slice(0, 60)))
  const duplicationRatio = sentences.length > 0 ? 1 - unique.size / sentences.length : 0
  if (duplicationRatio > 0.3 && sentences.length > 5) {
    score -= 20
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-05-DP',
      title: 'High content duplication detected',
      description: `${Math.round(duplicationRatio * 100)}% of sentences appear duplicated.`,
      recommendation: 'Remove repeated content blocks and ensure each section adds unique value.',
    })
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    details: `words:${wordCount} contentRatio:${contentRatio.toFixed(2)} dupRatio:${duplicationRatio.toFixed(2)}`,
    issues,
  }
}

// ─── A-06: Structured Answer Readiness ───────────────────────────────────────

function checkStructuredAnswerReadiness(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const lists = $('ul li, ol li').length
  const tables = $('table').length
  const h2Count = $('h2').length

  if (lists === 0 && tables === 0) {
    score -= 30
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-06-NL',
      title: 'No lists or tables found',
      description: 'AI systems prefer structured content for generating answers.',
      recommendation: 'Add bullet lists, numbered steps, or comparison tables to key sections.',
    })
  } else if (lists < 3) {
    score -= 15
    issues.push({
      module: 'ai', severity: 'low', code: 'A-06-FL',
      title: 'Few structured list items',
      recommendation: 'Use more bullet/numbered lists to make content scannable by AI.',
    })
  }

  if (h2Count === 0) {
    score -= 25
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-06-NS',
      title: 'No H2 sections — content is not segmented',
      recommendation: 'Add H2 headings to divide content into scannable topics.',
    })
  } else if (h2Count < 2) {
    score -= 10
    issues.push({
      module: 'ai', severity: 'low', code: 'A-06-FS',
      title: 'Few H2 sections (only 1)',
      recommendation: 'Add more H2 sections to cover multiple aspects of the topic.',
    })
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    details: `lists:${lists} tables:${tables} h2:${h2Count}`,
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
  const originalityResult = checkContentOriginality($)
  const structuredResult = checkStructuredAnswerReadiness($)

  checks['a01'] = { passed: citationResult.passed, score: citationResult.score, details: citationResult.details }
  checks['a02'] = { passed: headingResult.passed, score: headingResult.score, details: headingResult.details }
  checks['a03'] = { passed: queryResult.passed, score: queryResult.score, details: queryResult.details }
  checks['a05'] = { passed: originalityResult.passed, score: originalityResult.score, details: originalityResult.details }
  checks['a06'] = { passed: structuredResult.passed, score: structuredResult.score, details: structuredResult.details }

  allIssues.push(
    ...citationResult.issues,
    ...headingResult.issues,
    ...queryResult.issues,
    ...originalityResult.issues,
    ...structuredResult.issues,
  )

  // Weighted: A-01(30%) A-02(20%) A-03(20%) A-05(15%) A-06(15%)
  const score = Math.round(
    checks['a01'].score * 0.30 +
    checks['a02'].score * 0.20 +
    checks['a03'].score * 0.20 +
    checks['a05'].score * 0.15 +
    checks['a06'].score * 0.15
  )

  return { score, issues: allIssues, checks }
}
