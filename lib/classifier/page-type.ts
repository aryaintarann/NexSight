export type PageType = 'public_content' | 'admin_backend' | 'auth_page' | 'api_endpoint' | 'utility'

export interface PageClassification {
  type: PageType
  reason: string
  skippedModules: string[]
}

const ADMIN_URL   = /\/(admin|wp-admin|administrator|backend|panel|cpanel|cms|manage|management|control|phpmyadmin)\b/i
const AUTH_URL    = /\/(login|signin|sign-in|signup|sign-up|register|logout|auth|forgot-password|reset-password|verify|oauth|callback|sso)\b/i
const API_URL     = /^\/api\b/i
const UTILITY_URL = /\/(sitemap|robots\.txt|feed|rss|\.well-known|healthcheck|health|favicon|manifest\.json)\b/i

export function classifyPage(
  url: string,
  $: ReturnType<typeof import('cheerio').load>,
  headers: Record<string, string | string[] | undefined>,
): PageClassification {
  const pathname = (() => { try { return new URL(url).pathname } catch { return url } })()
  const contentType = ((headers['content-type'] as string) ?? '').toLowerCase()

  // API endpoint — JSON response or /api/ path
  if (API_URL.test(pathname) || contentType.includes('application/json')) {
    return {
      type: 'api_endpoint',
      reason: 'API endpoint — not a public content page',
      skippedModules: ['seo', 'geo', 'ai'],
    }
  }

  // Utility page — sitemap, robots, feed, etc.
  if (UTILITY_URL.test(pathname)) {
    return {
      type: 'utility',
      reason: 'Utility page — not meant to rank in search',
      skippedModules: ['seo', 'geo', 'ai'],
    }
  }

  // Admin / backend
  if (ADMIN_URL.test(pathname)) {
    return {
      type: 'admin_backend',
      reason: 'Admin or backend page — not a public-facing page',
      skippedModules: ['geo', 'ai'],
    }
  }

  // Auth page — URL pattern OR password field with thin content
  const hasPasswordField = $('input[type="password"]').length > 0
  const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
  if (AUTH_URL.test(pathname) || (hasPasswordField && wordCount < 300)) {
    return {
      type: 'auth_page',
      reason: 'Authentication page — not indexed by search engines',
      skippedModules: ['geo', 'ai'],
    }
  }

  // noindex → still run SEO (to surface the noindex issue), skip GEO/AI
  const robotsMeta = $('meta[name="robots"]').attr('content') ?? ''
  if (robotsMeta.includes('noindex')) {
    return {
      type: 'admin_backend',
      reason: 'Page has noindex meta — excluded from search indexing',
      skippedModules: ['geo', 'ai'],
    }
  }

  return {
    type: 'public_content',
    reason: 'Public content page',
    skippedModules: [],
  }
}

export const PAGE_TYPE_LABEL: Record<PageType, string> = {
  public_content: 'Public Page',
  admin_backend:  'Admin / Backend',
  auth_page:      'Auth Page',
  api_endpoint:   'API Endpoint',
  utility:        'Utility',
}
