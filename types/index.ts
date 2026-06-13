export interface ScanIssue {
  module: 'seo' | 'geo' | 'ai' | 'security'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  code: string
  title: string
  description?: string
  recommendation?: string
  affected_url?: string
  metadata?: Record<string, unknown>
}

export interface CheckResult {
  passed: boolean
  score: number
  details: string
}

export interface ModuleResult {
  score: number
  issues: ScanIssue[]
  checks: Record<string, CheckResult>
}

export interface SeoResult extends ModuleResult {}
export interface GeoResult extends ModuleResult {}
export interface AiVisibilityResult extends ModuleResult {}
export interface SecurityResult extends ModuleResult {}

export interface ScanResult {
  url: string
  seo: SeoResult
  geo: GeoResult
  ai: AiVisibilityResult
  security: SecurityResult
  overall_score: number
  grade: string
  scan_duration_ms: number
}

export interface Scan {
  id: string
  user_id: string
  url: string
  status: 'queued' | 'running' | 'done' | 'failed'
  seo_score: number | null
  geo_score: number | null
  ai_score: number | null
  sec_score: number | null
  overall_score: number | null
  result: ScanResult | null
  scan_duration: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface ScanIssueRow extends ScanIssue {
  id: string
  scan_id: string
  created_at: string
}
