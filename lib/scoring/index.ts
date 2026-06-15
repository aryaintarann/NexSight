import type { ScanResult } from '@/types'

// Weights per module. Null = module was skipped (page type filter).
// Active module weights are renormalized to sum to 1.0 so skipped modules
// don't drag the overall score down.
const MODULE_WEIGHTS = { seo: 0.30, geo: 0.25, ai: 0.20, security: 0.25 } as const

export function calculateOverallScore(
  seo: number | null,
  geo: number | null,
  ai: number | null,
  security: number | null,
): number {
  const raw = [
    { score: seo,      weight: MODULE_WEIGHTS.seo },
    { score: geo,      weight: MODULE_WEIGHTS.geo },
    { score: ai,       weight: MODULE_WEIGHTS.ai },
    { score: security, weight: MODULE_WEIGHTS.security },
  ]
  const entries = raw.filter((e) => e.score !== null) as { score: number; weight: number }[]

  if (entries.length === 0) return 0

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0)
  const weighted = entries.reduce((sum, e) => sum + e.score * (e.weight / totalWeight), 0)
  return Math.round(weighted)
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'F'
}

export function getGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    'A+': 'Excellent — top 5% websites',
    'A': 'Good — minor improvements needed',
    'B': 'Fair — significant gaps exist',
    'C': 'Poor — major issues to fix',
    'F': 'Critical — immediate action needed',
  }
  return labels[grade] ?? 'Unknown'
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e'  // green-500
  if (score >= 75) return '#84cc16'  // lime-500
  if (score >= 60) return '#eab308'  // yellow-500
  if (score >= 40) return '#f97316'  // orange-500
  return '#ef4444'                   // red-500
}

export function countIssuesBySeverity(result: ScanResult) {
  const all = [
    ...result.seo.issues,
    ...result.geo.issues,
    ...result.ai.issues,
    ...result.security.issues,
  ]
  return {
    critical: all.filter((i) => i.severity === 'critical').length,
    high: all.filter((i) => i.severity === 'high').length,
    medium: all.filter((i) => i.severity === 'medium').length,
    low: all.filter((i) => i.severity === 'low').length,
    info: all.filter((i) => i.severity === 'info').length,
  }
}
