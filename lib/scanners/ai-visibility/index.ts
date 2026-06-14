import type { AiVisibilityResult, ScanIssue, CheckResult } from '@/types'

// ─── A-01: Content Intelligence Score (deterministic) ────────────────────────
// Replaces subjective LLM-based rating with measurable, reproducible signals
// that correlate with AI citation likelihood across ChatGPT/Gemini/Perplexity.

function checkContentIntelligence(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 0

  const bodyText = ($('article, main, [role="main"]').first().text() || $('body').text())
    .replace(/\s+/g, ' ').trim()
  const words = bodyText.split(' ').filter(Boolean)
  const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().split(' ').length > 3)

  // ── Word count: 0-25 pts ────────────────────────────────────────────────────
  if (words.length >= 800) score += 25
  else if (words.length >= 500) score += 20
  else if (words.length >= 300) score += 13
  else if (words.length >= 150) score += 6
  else {
    score += 2
    issues.push({
      module: 'ai', severity: 'high', code: 'A-01-WC',
      title: 'Thin content — insufficient word count',
      description: `${words.length} words detected. AI systems strongly prefer 500+ words.`,
      recommendation: 'Expand content to at least 500 words for strong AI search visibility.',
    })
  }

  // ── Direct answer in opening: 0-20 pts ─────────────────────────────────────
  const firstPara = $('article p, main p, [role="main"] p').first().text().trim()
    || sentences.slice(0, 2).join('. ')
  const hasDirectAnswer = /\b(is\s|are\s|refers to|means |defined as|consists of|includes |describes )/i.test(firstPara)
  const openingIsSubstantial = firstPara.split(' ').length >= 20

  if (hasDirectAnswer && openingIsSubstantial) score += 20
  else if (hasDirectAnswer) score += 12
  else if (openingIsSubstantial) score += 8
  else {
    score += 3
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-01-DA',
      title: 'Opening paragraph lacks a direct answer',
      recommendation: 'Start content with a clear, direct definition or answer. AI systems extract the first substantive statement when generating responses.',
    })
  }

  // ── Fact density — numbers and specific data: 0-20 pts ─────────────────────
  const factMatches = bodyText.match(/\b\d[\d,.]*([\s%$€£°]|\b)/g) ?? []
  const uniqueFacts = new Set(factMatches).size
  if (uniqueFacts >= 15) score += 20
  else if (uniqueFacts >= 8) score += 14
  else if (uniqueFacts >= 3) score += 7
  else {
    score += 2
    issues.push({
      module: 'ai', severity: 'low', code: 'A-01-FD',
      title: 'Low fact density',
      description: `Only ${uniqueFacts} distinct numeric facts found.`,
      recommendation: 'Include specific numbers, statistics, percentages, and data points. Factual density strongly correlates with AI citation likelihood.',
    })
  }

  // ── Content structure: headings + lists + tables: 0-20 pts ─────────────────
  const h2h3Count = $('h2, h3').length
  const listItems = $('ul li, ol li').length
  const tableCount = $('table').length
  const structPts = Math.min(20, h2h3Count * 2 + Math.min(listItems, 10) + tableCount * 4)
  score += structPts

  if (structPts < 5) {
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-01-ST',
      title: 'Poor content structure for AI parsing',
      description: `Found ${h2h3Count} subheadings, ${listItems} list items, ${tableCount} tables.`,
      recommendation: 'Use H2/H3 headings, bullet lists, and tables. Structured content is significantly more likely to be cited by AI search engines.',
    })
  }

  // ── Readability — average sentence length: 0-15 pts ────────────────────────
  if (sentences.length > 0) {
    const avgWords = words.length / sentences.length
    if (avgWords <= 15) score += 15
    else if (avgWords <= 20) score += 10
    else if (avgWords <= 28) score += 5
    else {
      score += 1
      issues.push({
        module: 'ai', severity: 'low', code: 'A-01-RL',
        title: 'Long average sentence length reduces AI comprehension',
        description: `Average: ${avgWords.toFixed(0)} words per sentence (target: ≤ 20).`,
        recommendation: 'Break long sentences into shorter, clearer statements. AI systems prefer scannable, concise prose.',
      })
    }
  } else {
    score += 7
  }

  score = Math.min(100, score)
  return {
    passed: score >= 60,
    score,
    details: `words:${words.length} facts:${uniqueFacts} structPts:${structPts} directAnswer:${hasDirectAnswer}`,
    issues,
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

  if (h1s.length === 0) {
    score -= 30
    issues.push({ module: 'ai', severity: 'critical', code: 'A-02-H1M', title: 'Missing H1 tag', recommendation: 'Add exactly one H1 tag that clearly describes the page topic.' })
  } else if (h1s.length > 1) {
    score -= 15
    issues.push({ module: 'ai', severity: 'medium', code: 'A-02-H1D', title: `Multiple H1 tags (${h1s.length})`, recommendation: 'Use exactly one H1 per page.' })
  }

  if (h2s.length === 0) {
    score -= 20
    issues.push({ module: 'ai', severity: 'high', code: 'A-02-H2M', title: 'No H2 headings found', recommendation: 'Add H2 subheadings to structure content into logical sections for AI parsing.' })
  }

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

  const headings: Array<{ level: number }> = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push({ level: parseInt(el.tagName.replace('h', ''), 10) })
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

// ─── A-03: Content-to-HTML Ratio ──────────────────────────────────────────────
// Low ratio = bloated HTML with little content — AI crawlers deprioritize these.

function checkContentToHtmlRatio(
  $: ReturnType<typeof import('cheerio').load>
): CheckResult & { issues: ScanIssue[] } {
  const htmlLength = $.html().length
  const textLength = $('body').text().replace(/\s+/g, ' ').trim().length
  const ratio = htmlLength > 0 ? Math.round((textLength / htmlLength) * 100) : 0

  if (ratio >= 25) return { passed: true, score: 100, details: `ratio:${ratio}%`, issues: [] }
  if (ratio >= 15) return { passed: true, score: 75, details: `ratio:${ratio}%`, issues: [] }

  return {
    passed: false, score: Math.max(0, ratio * 2),
    details: `ratio:${ratio}%`,
    issues: [{
      module: 'ai', severity: 'low', code: 'A-03-CR',
      title: 'Low content-to-HTML ratio',
      description: `Text is only ${ratio}% of total page size.`,
      recommendation: 'Reduce excessive HTML boilerplate, scripts in <body>, and inline styles. AI crawlers prefer content-dense pages.',
    }],
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
  const defLists = $('dl dt').length

  if (lists === 0 && tables === 0 && defLists === 0) {
    score -= 30
    issues.push({
      module: 'ai', severity: 'medium', code: 'A-06-NL',
      title: 'No lists or tables found',
      description: 'AI systems prefer structured content for generating snippet answers.',
      recommendation: 'Add bullet lists, numbered steps, comparison tables, or definition lists to key sections.',
    })
  } else if (lists < 3 && tables === 0) {
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

  return { passed: score >= 70, score: Math.max(0, score), details: `lists:${lists} tables:${tables} h2:${h2Count}`, issues }
}

// ─── Main AI Visibility Scanner ───────────────────────────────────────────────

export async function runAiVisibilityScan(
  url: string,
  $: ReturnType<typeof import('cheerio').load>
): Promise<AiVisibilityResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const intelligenceResult = checkContentIntelligence($)
  const headingResult = checkHeadingHierarchy($)
  const ratioResult = checkContentToHtmlRatio($)
  const structuredResult = checkStructuredAnswerReadiness($)

  checks['a01'] = { passed: intelligenceResult.passed, score: intelligenceResult.score, details: intelligenceResult.details }
  checks['a02'] = { passed: headingResult.passed, score: headingResult.score, details: headingResult.details }
  checks['a03'] = { passed: ratioResult.passed, score: ratioResult.score, details: ratioResult.details }
  checks['a06'] = { passed: structuredResult.passed, score: structuredResult.score, details: structuredResult.details }

  allIssues.push(
    ...intelligenceResult.issues,
    ...headingResult.issues,
    ...ratioResult.issues,
    ...structuredResult.issues,
  )

  // Weighted: A-01(40%) A-02(30%) A-03(10%) A-06(20%)
  const score = Math.round(
    checks['a01'].score * 0.40 +
    checks['a02'].score * 0.30 +
    checks['a03'].score * 0.10 +
    checks['a06'].score * 0.20
  )

  return { score, issues: allIssues, checks }
}
