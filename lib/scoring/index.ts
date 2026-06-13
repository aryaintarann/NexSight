import type { ScanResult } from '@/types'

// NexSight Score = (SEO × 0.30) + (GEO × 0.25) + (AI × 0.20) + (Security × 0.25)
export function calculateOverallScore(seo: number, geo: number, ai: number, security: number): number {
  return Math.round(seo * 0.30 + geo * 0.25 + ai * 0.20 + security * 0.25)
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
