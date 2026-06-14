import type { Scan, ScanIssueRow } from '@/types'
import { getGrade, getGradeLabel, getScoreColor } from '@/lib/scoring'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function sevColor(s: string): string {
  return ({ critical:'#dc2626', high:'#ea580c', medium:'#ca8a04', low:'#475569', info:'#2563eb' })[s] ?? '#475569'
}

function sevBg(s: string): string {
  return ({ critical:'#fef2f2', high:'#fff7ed', medium:'#fefce8', low:'#f8fafc', info:'#eff6ff' })[s] ?? '#f8fafc'
}

export function generateHtmlReport(scan: Scan & { scan_issues: ScanIssueRow[] }): string {
  const issues   = scan.scan_issues ?? []
  const score    = scan.overall_score ?? 0
  const grade    = getGrade(score)
  const gradeLbl = getGradeLabel(grade)
  const scoreColor = getScoreColor(score)

  const scanDate = scan.completed_at
    ? new Date(scan.completed_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : new Date(scan.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })

  const hostname = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()

  const modules = [
    { key:'seo',      label:'SEO',       score: scan.seo_score ?? 0 },
    { key:'geo',      label:'GEO',       score: scan.geo_score ?? 0 },
    { key:'ai',       label:'AI Search', score: scan.ai_score  ?? 0 },
    { key:'security', label:'Security',  score: scan.sec_score ?? 0 },
  ]

  const sevOrders = ['critical','high','medium','low','info'] as const

  const sevCounts = {
    critical: issues.filter(i => i.severity==='critical').length,
    high:     issues.filter(i => i.severity==='high').length,
    medium:   issues.filter(i => i.severity==='medium').length,
    low:      issues.filter(i => i.severity==='low').length,
    info:     issues.filter(i => i.severity==='info').length,
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NexSight Report — ${esc(hostname)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    color: #111827;
    font-size: 13px;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { max-width: 860px; margin: 0 auto; padding: 48px 40px; }

  /* Header */
  .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
  .logo-box { width:26px; height:26px; background:#0e7490; border-radius:5px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:12px; flex-shrink:0; }
  .logo-name { font-size:15px; font-weight:700; color:#0f172a; }
  .logo-sep  { color:#cbd5e1; }
  .logo-sub  { font-size:12px; color:#94a3b8; }
  .report-host { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:3px; }
  .report-url  { font-size:12px; color:#94a3b8; word-break:break-all; margin-bottom:2px; }
  .report-meta { font-size:11px; color:#cbd5e1; margin-bottom:32px; }

  /* Score hero */
  .hero {
    display:flex; border:1.5px solid #e5e7eb; border-radius:12px;
    overflow:hidden; margin-bottom:32px; background:#fff;
  }
  .hero-score {
    min-width:160px; padding:28px 24px; text-align:center;
    background:#f9fafb; border-right:1.5px solid #e5e7eb;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .hero-num   { font-size:58px; font-weight:800; line-height:1; }
  .hero-denom { font-size:13px; color:#9ca3af; margin-top:2px; }
  .hero-grade { font-size:18px; font-weight:700; margin-top:10px; }
  .hero-glbl  { font-size:11px; color:#6b7280; margin-top:3px; }

  .hero-modules { flex:1; padding:24px 28px; }
  .hero-modules-lbl { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:.07em; margin-bottom:14px; }
  .mod-row { display:flex; align-items:center; gap:12px; margin-bottom:9px; }
  .mod-row:last-child { margin-bottom:0; }
  .mod-name  { font-size:12px; color:#374151; width:68px; flex-shrink:0; }
  .bar-wrap  { flex:1; height:5px; background:#e5e7eb; border-radius:3px; overflow:hidden; }
  .bar-fill  { height:100%; border-radius:3px; }
  .mod-score { font-size:12px; font-weight:600; color:#111827; width:24px; text-align:right; flex-shrink:0; }

  .hero-counts { min-width:130px; padding:24px 20px; background:#f9fafb; border-left:1.5px solid #e5e7eb; }
  .hero-counts-lbl { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:.07em; margin-bottom:14px; }
  .cnt-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
  .cnt-row:last-child { margin-bottom:0; }
  .cnt-lbl { font-size:12px; font-weight:500; }
  .cnt-num { font-size:13px; font-weight:700; }

  /* Issues */
  .section-hdr {
    font-size:13px; font-weight:700; color:#0f172a;
    padding-bottom:8px; margin-bottom:16px;
    border-bottom:1.5px solid #e5e7eb;
    display:flex; justify-content:space-between;
  }
  .section-sub { font-size:11px; font-weight:400; color:#9ca3af; }

  .sev-group { margin-bottom:18px; }
  .sev-hdr { display:flex; align-items:center; gap:7px; margin-bottom:8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  .sev-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  .issue { display:flex; margin-bottom:6px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
  .issue:last-child { margin-bottom:0; }
  .issue-bar { width:4px; flex-shrink:0; }
  .issue-body { padding:11px 14px; flex:1; min-width:0; }
  .issue-top  { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .issue-title { font-size:13px; font-weight:600; color:#111827; line-height:1.35; }
  .issue-meta  { font-size:10px; color:#9ca3af; font-family:monospace; flex-shrink:0; white-space:nowrap; padding-top:1px; }
  .issue-desc  { font-size:12px; color:#6b7280; margin-top:4px; }
  .issue-fix   { font-size:12px; color:#374151; margin-top:6px; }
  .fix-lbl     { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:.05em; }

  /* Footer */
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
  .footer-brand { font-size:12px; font-weight:600; color:#374151; }
  .footer-meta  { font-size:11px; color:#9ca3af; }

  @page { margin: 14mm; }
</style>
</head>
<body>
<div class="page">

  <!-- Logo -->
  <div class="logo-row">
    <div class="logo-box">N</div>
    <span class="logo-name">NexSight</span>
    <span class="logo-sep">·</span>
    <span class="logo-sub">Website Intelligence Report</span>
  </div>

  <h1 class="report-host">${esc(hostname)}</h1>
  <p class="report-url">${esc(scan.url)}</p>
  <p class="report-meta">Scanned ${scanDate}${scan.scan_duration ? ` · ${(scan.scan_duration/1000).toFixed(1)}s` : ''}</p>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-score">
      <div class="hero-num" style="color:${scoreColor}">${score}</div>
      <div class="hero-denom">out of 100</div>
      <div class="hero-grade" style="color:${scoreColor}">Grade ${grade}</div>
      <div class="hero-glbl">${esc(gradeLbl)}</div>
    </div>
    <div class="hero-modules">
      <div class="hero-modules-lbl">Module Scores</div>
      ${modules.map(m => {
        const c = getScoreColor(m.score)
        return `<div class="mod-row">
          <span class="mod-name">${m.label}</span>
          <div class="bar-wrap"><div class="bar-fill" style="width:${m.score}%;background:${c}"></div></div>
          <span class="mod-score">${m.score}</span>
        </div>`
      }).join('')}
    </div>
    <div class="hero-counts">
      <div class="hero-counts-lbl">Issues</div>
      ${sevOrders.map(s => {
        const cnt = sevCounts[s]
        if (!cnt) return ''
        const lbl = s.charAt(0).toUpperCase() + s.slice(1)
        return `<div class="cnt-row">
          <span class="cnt-lbl" style="color:${sevColor(s)}">${lbl}</span>
          <span class="cnt-num" style="color:${sevColor(s)}">${cnt}</span>
        </div>`
      }).join('')}
      ${issues.length === 0 ? '<p style="font-size:12px;color:#9ca3af">None</p>' : ''}
    </div>
  </div>

  <!-- Issues -->
  ${issues.length > 0 ? `
  <div class="section-hdr">
    Issues Found <span class="section-sub">${issues.length} total</span>
  </div>
  ${sevOrders.map(sev => {
    const group = issues.filter(i => i.severity === sev)
    if (!group.length) return ''
    const lbl = sev.charAt(0).toUpperCase() + sev.slice(1)
    const col = sevColor(sev)
    const bg  = sevBg(sev)
    return `<div class="sev-group">
      <div class="sev-hdr" style="color:${col}">
        <span class="sev-dot" style="background:${col}"></span>${lbl} (${group.length})
      </div>
      ${group.map(issue => `
      <div class="issue">
        <div class="issue-bar" style="background:${col}"></div>
        <div class="issue-body" style="background:${bg}">
          <div class="issue-top">
            <span class="issue-title">${esc(issue.title)}</span>
            <span class="issue-meta">${esc((issue.module ?? '').toUpperCase())} · ${esc(issue.code ?? '')}</span>
          </div>
          ${issue.description ? `<p class="issue-desc">${esc(issue.description)}</p>` : ''}
          ${issue.recommendation ? `<p class="issue-fix"><span class="fix-lbl">Fix: </span>${esc(issue.recommendation)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>`
  }).join('')}` : `
  <div style="padding:28px;text-align:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;font-size:13px;">
    No issues found — your website passed all checks.
  </div>`}

  <div class="footer">
    <span class="footer-brand">NexSight</span>
    <span class="footer-meta">Generated ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span>
  </div>

</div>
</body>
</html>`
}
