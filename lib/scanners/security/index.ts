import axios from 'axios'
import * as tls from 'tls'
import dns from 'dns/promises'
import type { SecurityResult, ScanIssue, CheckResult } from '@/types'

// ─── SC-01: HTTP Security Headers ────────────────────────────────────────────

interface HeaderCheckResult extends CheckResult {
  issues: ScanIssue[]
}

function checkSecurityHeaders(headers: Record<string, string | string[] | undefined>): HeaderCheckResult {
  const issues: ScanIssue[] = []
  const getHeader = (name: string) => {
    const val = headers[name.toLowerCase()]
    return Array.isArray(val) ? val[0] : val
  }

  let score = 0
  const checks = [
    {
      header: 'content-security-policy',
      name: 'Content-Security-Policy',
      code: 'SC-01-CSP',
      recommendation: "Add a Content-Security-Policy header. Start with: Content-Security-Policy: default-src 'self'",
    },
    {
      header: 'strict-transport-security',
      name: 'Strict-Transport-Security',
      code: 'SC-01-HSTS',
      recommendation: 'Add HSTS: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    },
    {
      header: 'x-frame-options',
      name: 'X-Frame-Options',
      code: 'SC-01-XFO',
      recommendation: 'Add X-Frame-Options: SAMEORIGIN to prevent clickjacking.',
    },
    {
      header: 'x-content-type-options',
      name: 'X-Content-Type-Options',
      code: 'SC-01-XCTO',
      recommendation: "Add X-Content-Type-Options: nosniff",
    },
    {
      header: 'permissions-policy',
      name: 'Permissions-Policy',
      code: 'SC-01-PP',
      recommendation: "Add Permissions-Policy header to restrict browser feature access.",
    },
  ]

  for (const check of checks) {
    const value = getHeader(check.header)
    if (value) {
      score += 20
    } else {
      issues.push({
        module: 'security', severity: 'high', code: check.code,
        title: `Missing ${check.name} header`,
        recommendation: check.recommendation,
      })
    }
  }

  return { passed: score >= 60, score, details: `score:${score}/100`, issues }
}

// ─── SC-02: SSL/TLS Validation ────────────────────────────────────────────────

async function checkSslTls(url: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []

  if (!url.startsWith('https://')) {
    return {
      passed: false, score: 0, details: 'not HTTPS',
      issues: [{
        module: 'security', severity: 'critical', code: 'SC-02-NH',
        title: 'Site is not using HTTPS',
        recommendation: 'Migrate to HTTPS immediately. Obtain a TLS certificate from Let\'s Encrypt (free).',
      }],
    }
  }

  return new Promise((resolve) => {
    let score = 100
    const issues: ScanIssue[] = []

    try {
      const hostname = new URL(url).hostname
      const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false }, () => {
        const cert = socket.getPeerCertificate()
        const protocol = socket.getProtocol() ?? ''
        const cipher = socket.getCipher()

        // TLS version check
        if (protocol === 'TLSv1' || protocol === 'TLSv1.1' || protocol === 'SSLv3') {
          score -= 40
          issues.push({
            module: 'security', severity: 'critical', code: 'SC-02-TLS',
            title: `Outdated TLS version: ${protocol}`,
            recommendation: 'Upgrade to TLS 1.2 or TLS 1.3.',
          })
        }

        // Cipher strength
        const weakCiphers = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT']
        const cipherName = cipher?.name ?? ''
        if (weakCiphers.some((w) => cipherName.includes(w))) {
          score -= 30
          issues.push({
            module: 'security', severity: 'high', code: 'SC-02-CI',
            title: `Weak cipher suite: ${cipherName}`,
            recommendation: 'Configure server to use strong cipher suites (AES-GCM, CHACHA20).',
          })
        }

        // Certificate expiry
        if (cert && cert.valid_to) {
          const expiry = new Date(cert.valid_to)
          const daysLeft = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft < 0) {
            score -= 50
            issues.push({ module: 'security', severity: 'critical', code: 'SC-02-EX', title: 'SSL certificate has expired', recommendation: 'Renew your SSL certificate immediately.' })
          } else if (daysLeft < 30) {
            score -= 20
            issues.push({ module: 'security', severity: 'high', code: 'SC-02-EX', title: `SSL certificate expires in ${daysLeft} days`, recommendation: 'Renew SSL certificate before expiry.' })
          }

          // Self-signed check
          if (cert.issuer?.CN === cert.subject?.CN) {
            score -= 30
            issues.push({ module: 'security', severity: 'high', code: 'SC-02-SS', title: 'Self-signed certificate detected', recommendation: 'Use a certificate from a trusted CA (e.g., Let\'s Encrypt).' })
          }
        }

        socket.end()
        resolve({ passed: score >= 70, score: Math.max(0, score), details: `protocol:${protocol} cipher:${cipherName}`, issues })
      })

      socket.on('error', () => {
        resolve({ passed: false, score: 0, details: 'connection error', issues: [{ module: 'security', severity: 'critical', code: 'SC-02-CE', title: 'SSL/TLS connection failed', recommendation: 'Verify SSL certificate installation.' }] })
      })
    } catch {
      resolve({ passed: false, score: 0, details: 'SSL check error', issues: [] })
    }
  })
}

// ─── SC-03: Mixed Content ─────────────────────────────────────────────────────

function checkMixedContent(
  $: ReturnType<typeof import('cheerio').load>,
  url: string
): CheckResult & { issues: ScanIssue[] } {
  if (!url.startsWith('https://')) {
    return { passed: true, score: 100, details: 'not HTTPS — mixed content N/A', issues: [] }
  }

  const issues: ScanIssue[] = []
  const mixed: string[] = []

  $('img[src], script[src], link[href], iframe[src], audio[src], video[src]').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('href') ?? ''
    if (src.startsWith('http://')) mixed.push(src)
  })

  if (mixed.length > 0) {
    issues.push({
      module: 'security', severity: 'high', code: 'SC-03-MC',
      title: `${mixed.length} mixed content resource(s) detected`,
      description: mixed.slice(0, 5).join('\n'),
      recommendation: 'Replace all HTTP resource URLs with HTTPS equivalents.',
      metadata: { urls: mixed },
    })
  }

  const score = Math.max(0, 100 - mixed.length * 20)
  return { passed: mixed.length === 0, score, details: `mixedCount:${mixed.length}`, issues }
}

// ─── SC-04: Cookie Security Flags ─────────────────────────────────────────────

function checkCookieSecurity(cookies: string[]): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []

  if (cookies.length === 0) {
    return { passed: true, score: 100, details: 'no cookies set', issues: [] }
  }

  let score = 100
  let insecureCount = 0

  for (const cookie of cookies) {
    const lower = cookie.toLowerCase()
    const cookieName = cookie.split('=')[0].trim()
    const problems: string[] = []

    if (!lower.includes('httponly')) problems.push('HttpOnly')
    if (!lower.includes('secure')) problems.push('Secure')
    if (!lower.includes('samesite')) problems.push('SameSite')

    if (problems.length > 0) {
      insecureCount++
      score -= problems.length * 5
      issues.push({
        module: 'security', severity: problems.length >= 2 ? 'high' : 'medium',
        code: 'SC-04-CK',
        title: `Cookie missing flags: ${problems.join(', ')}`,
        description: `Cookie: ${cookieName}`,
        recommendation: `Set ${problems.join(', ')} flags on cookie "${cookieName}".`,
        affected_url: cookieName,
      })
    }
  }

  return { passed: insecureCount === 0, score: Math.max(0, score), details: `total:${cookies.length} insecure:${insecureCount}`, issues }
}

// ─── SC-05: OWASP Headers Baseline ───────────────────────────────────────────

function checkOwaspBaseline(headers: Record<string, string | string[] | undefined>): CheckResult & { issues: ScanIssue[] } {
  const issues: ScanIssue[] = []
  let score = 100

  const getHeader = (name: string) => {
    const val = headers[name.toLowerCase()]
    return Array.isArray(val) ? val[0] : val
  }

  // A05:2021 Security Misconfiguration: check server info disclosure
  const serverHeader = getHeader('server')
  if (serverHeader && /\d/.test(serverHeader)) {
    score -= 15
    issues.push({
      module: 'security', severity: 'medium', code: 'SC-05-SV',
      title: 'Server version disclosed in header',
      description: `Server: ${serverHeader}`,
      recommendation: 'Remove version information from Server header to reduce attack surface.',
    })
  }

  const xPoweredBy = getHeader('x-powered-by')
  if (xPoweredBy) {
    score -= 15
    issues.push({
      module: 'security', severity: 'medium', code: 'SC-05-XP',
      title: 'X-Powered-By header exposes technology stack',
      description: `X-Powered-By: ${xPoweredBy}`,
      recommendation: 'Remove X-Powered-By header.',
    })
  }

  // A02:2021 Cryptographic Failures: check for HSTS with minimum max-age
  const hsts = getHeader('strict-transport-security')
  if (hsts) {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i)
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0
    if (maxAge < 31536000) {
      score -= 10
      issues.push({
        module: 'security', severity: 'medium', code: 'SC-05-HSTS',
        title: 'HSTS max-age too short',
        description: `max-age: ${maxAge} (minimum: 31536000)`,
        recommendation: 'Set HSTS max-age to at least 1 year (31536000 seconds).',
      })
    }
  }

  // Referrer-Policy check
  const referrerPolicy = getHeader('referrer-policy')
  if (!referrerPolicy) {
    score -= 10
    issues.push({
      module: 'security', severity: 'low', code: 'SC-05-RP',
      title: 'Missing Referrer-Policy header',
      recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin',
    })
  }

  return { passed: score >= 70, score: Math.max(0, score), details: `server:${!!serverHeader} xPoweredBy:${!!xPoweredBy} referrerPolicy:${!!referrerPolicy}`, issues }
}

// ─── SC-06: DNS Security (SPF / DMARC) ───────────────────────────────────────

async function checkDnsSecurity(url: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const issues: ScanIssue[] = []
  let score = 100
  const hostname = new URL(url).hostname

  try {
    const txtRecords = await dns.resolveTxt(hostname).catch(() => [] as string[][])
    const flat = txtRecords.flat()
    const hasSpf = flat.some((r) => r.startsWith('v=spf1'))

    if (!hasSpf) {
      score -= 35
      issues.push({
        module: 'security', severity: 'medium', code: 'SC-06-SPF',
        title: 'Missing SPF record',
        recommendation: 'Add an SPF TXT record to prevent email spoofing.',
      })
    }

    const dmarcRecords = await dns.resolveTxt(`_dmarc.${hostname}`).catch(() => [] as string[][])
    const hasDmarcRecord = dmarcRecords.flat().some((r) => r.startsWith('v=DMARC1'))

    if (!hasDmarcRecord) {
      score -= 35
      issues.push({
        module: 'security', severity: 'medium', code: 'SC-06-DMARC',
        title: 'Missing DMARC record',
        recommendation: 'Add a DMARC policy at _dmarc.yourdomain.com.',
      })
    }
  } catch {
    score = 50
    issues.push({
      module: 'security', severity: 'info', code: 'SC-06-ER',
      title: 'DNS security check incomplete',
      description: 'Could not resolve DNS records.',
    })
  }

  return { passed: score >= 70, score: Math.max(0, score), details: `dns check for ${hostname}`, issues }
}

// ─── SC-08: security.txt ─────────────────────────────────────────────────────

async function checkSecurityTxt(url: string): Promise<CheckResult & { issues: ScanIssue[] }> {
  const origin = new URL(url).origin
  const candidates = [`${origin}/.well-known/security.txt`, `${origin}/security.txt`]

  for (const candidate of candidates) {
    try {
      const res = await axios.get(candidate, {
        timeout: 8000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexSight/1.0; +https://nexsight.app)' },
      })
      if (res.status === 200 && typeof res.data === 'string' && res.data.includes('Contact:')) {
        return { passed: true, score: 100, details: `security.txt found at ${candidate}`, issues: [] }
      }
    } catch { /* not found */ }
  }

  return {
    passed: false, score: 70,
    details: 'security.txt not found',
    issues: [{
      module: 'security', severity: 'low', code: 'SC-08-NF',
      title: 'No security.txt file',
      recommendation: 'Create /.well-known/security.txt per RFC 9116 with Contact: and Expires: fields.',
    }],
  }
}

// ─── Main Security Scanner ────────────────────────────────────────────────────

export async function runSecurityScan(
  url: string,
  $: ReturnType<typeof import('cheerio').load>,
  headers: Record<string, string | string[] | undefined>,
  cookies: string[]
): Promise<SecurityResult> {
  const allIssues: ScanIssue[] = []
  const checks: Record<string, CheckResult> = {}

  const [sslResult, dnsResult, securityTxtResult] = await Promise.all([
    checkSslTls(url),
    checkDnsSecurity(url),
    checkSecurityTxt(url),
  ])

  const headerResult = checkSecurityHeaders(headers)
  const mixedResult = checkMixedContent($, url)
  const cookieResult = checkCookieSecurity(cookies)
  const owaspResult = checkOwaspBaseline(headers)

  checks['sc01'] = { passed: headerResult.passed, score: headerResult.score, details: headerResult.details }
  checks['sc02'] = { passed: sslResult.passed, score: sslResult.score, details: sslResult.details }
  checks['sc03'] = { passed: mixedResult.passed, score: mixedResult.score, details: mixedResult.details }
  checks['sc04'] = { passed: cookieResult.passed, score: cookieResult.score, details: cookieResult.details }
  checks['sc05'] = { passed: owaspResult.passed, score: owaspResult.score, details: owaspResult.details }
  checks['sc06'] = { passed: dnsResult.passed, score: dnsResult.score, details: dnsResult.details }
  checks['sc08'] = { passed: securityTxtResult.passed, score: securityTxtResult.score, details: securityTxtResult.details }

  allIssues.push(
    ...headerResult.issues, ...sslResult.issues, ...mixedResult.issues,
    ...cookieResult.issues, ...owaspResult.issues, ...dnsResult.issues,
    ...securityTxtResult.issues
  )

  // Weighted: SC-01(25%) SC-02(22%) SC-03(17%) SC-04(13%) SC-05(8%) SC-06(10%) SC-08(5%)
  const score = Math.round(
    checks['sc01'].score * 0.25 +
    checks['sc02'].score * 0.22 +
    checks['sc03'].score * 0.17 +
    checks['sc04'].score * 0.13 +
    checks['sc05'].score * 0.08 +
    checks['sc06'].score * 0.10 +
    checks['sc08'].score * 0.05
  )

  return { score, issues: allIssues, checks }
}
