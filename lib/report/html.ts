import type { Scan, ScanIssueRow } from '@/types'
import { getGrade, getGradeLabel, getScoreColor } from '@/lib/scoring'

function scoreBar(score: number): string {
  const color = getScoreColor(score)
  return `<div class="score-bar-wrap"><div class="score-bar" style="width:${score}%;background:${color}"></div></div>`
}

function severityColor(severity: string): string {
  return {
    critical: '#ef4444',
    high:     '#f97316',
    medium:   '#eab308',
    low:      '#64748b',
    info:     '#3b82f6',
  }[severity] ?? '#64748b'
}

function moduleLabel(module: string): string {
  return { seo: 'SEO', geo: 'GEO', ai: 'AI Visibility', security: 'Security' }[module] ?? module.toUpperCase()
}

function issueRows(issues: ScanIssueRow[], module?: string): string {
  const filtered = module ? issues.filter((i) => i.module === module) : issues
  if (filtered.length === 0) return '<tr><td colspan="4" class="empty">No issues found</td></tr>'
  return filtered
    .sort((a, b) => (['critical','high','medium','low','info'].indexOf(a.severity)) - (['critical','high','medium','low','info'].indexOf(b.severity)))
    .map((i) => `
      <tr>
        <td><span class="badge" style="background:${severityColor(i.severity)}22;color:${severityColor(i.severity)};border:1px solid ${severityColor(i.severity)}44">${i.severity}</span></td>
        <td><code>${i.code}</code></td>
        <td>
          <strong>${escapeHtml(i.title)}</strong>
          ${i.description ? `<br><small>${escapeHtml(i.description)}</small>` : ''}
        </td>
        <td>${i.recommendation ? escapeHtml(i.recommendation) : '—'}</td>
      </tr>`).join('')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function generateHtmlReport(scan: Scan & { scan_issues: ScanIssueRow[] }): string {
  const issues = scan.scan_issues ?? []
  const grade = scan.overall_score != null ? getGrade(scan.overall_score) : '—'
  const gradeLabel = scan.overall_score != null ? getGradeLabel(grade) : ''
  const overallColor = scan.overall_score != null ? getScoreColor(scan.overall_score) : '#64748b'

  const modules = [
    { key: 'seo',      label: 'SEO Analyzer',        score: scan.seo_score,  weight: '30%', color: '#22d3ee' },
    { key: 'geo',      label: 'GEO + AEO',            score: scan.geo_score,  weight: '25%', color: '#a78bfa' },
    { key: 'ai',       label: 'AI Search Visibility', score: scan.ai_score,   weight: '20%', color: '#34d399' },
    { key: 'security', label: 'Security Scanner',     score: scan.sec_score,  weight: '25%', color: '#fb7185' },
  ]

  const issueCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high:     issues.filter((i) => i.severity === 'high').length,
    medium:   issues.filter((i) => i.severity === 'medium').length,
    low:      issues.filter((i) => i.severity === 'low').length,
  }

  const scanDate = scan.completed_at
    ? new Date(scan.completed_at).toLocaleString()
    : new Date(scan.created_at).toLocaleString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NexSight Report — ${escapeHtml(scan.url)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#020617;color:#f1f5f9;line-height:1.6;font-size:14px}
  .container{max-width:1000px;margin:0 auto;padding:40px 24px}
  /* Header */
  .header{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:32px;margin-bottom:24px}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}
  .logo-icon{width:36px;height:36px;background:#22d3ee;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#020617;font-size:16px}
  .logo-name{font-size:20px;font-weight:700;color:#fff}
  .header-meta{color:#64748b;font-size:13px;margin-top:4px}
  .url{font-size:18px;font-weight:600;color:#fff;margin:8px 0;word-break:break-all}
  /* Overall score */
  .overall{display:flex;align-items:center;gap:32px;background:#1e293b;border-radius:12px;padding:24px;margin-top:20px}
  .overall-score{text-align:center}
  .score-num{font-size:56px;font-weight:700;line-height:1}
  .score-denom{color:#475569;font-size:20px}
  .grade{font-size:22px;font-weight:700;margin-top:4px}
  .grade-label{color:#94a3b8;font-size:13px}
  .issue-summary{display:flex;gap:16px;flex-wrap:wrap}
  .issue-chip{text-align:center;padding:10px 16px;border-radius:8px;min-width:64px}
  .issue-chip .cnt{font-size:22px;font-weight:700}
  .issue-chip .lbl{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8}
  /* Module cards */
  .modules{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px}
  .module-card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px}
  .module-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .module-name{font-weight:600;color:#e2e8f0}
  .module-weight{font-size:11px;color:#475569;background:#1e293b;padding:2px 8px;border-radius:20px}
  .module-score{font-size:28px;font-weight:700;margin-bottom:8px}
  .module-issues{font-size:12px;color:#64748b}
  .score-bar-wrap{background:#1e293b;border-radius:4px;height:6px;overflow:hidden}
  .score-bar{height:100%;border-radius:4px;transition:width 0.3s}
  /* Issues table */
  .section{background:#0f172a;border:1px solid #1e293b;border-radius:12px;margin-bottom:16px;overflow:hidden}
  .section-header{padding:16px 20px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center}
  .section-title{font-weight:600;color:#e2e8f0;font-size:15px}
  .section-count{font-size:12px;color:#475569}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;background:#0f172a;border-bottom:1px solid #1e293b}
  td{padding:12px 16px;border-bottom:1px solid #1e293b11;vertical-align:top;font-size:13px}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#1e293b20}
  code{font-family:monospace;background:#1e293b;padding:2px 6px;border-radius:4px;font-size:12px;color:#94a3b8}
  .badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:capitalize}
  small{color:#64748b;display:block;margin-top:2px}
  strong{color:#f1f5f9}
  .empty{padding:20px;text-align:center;color:#475569}
  /* Footer */
  .footer{text-align:center;padding:32px;color:#334155;font-size:12px}
  .footer a{color:#22d3ee;text-decoration:none}
  @media print{body{background:#fff;color:#0f172a}.header,.module-card,.section{border-color:#e2e8f0;background:#f8fafc}.score-bar-wrap{background:#e2e8f0}}
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-icon">N</div>
      <span class="logo-name">NexSight</span>
    </div>
    <div class="header-meta">Website Intelligence Report</div>
    <div class="url">${escapeHtml(scan.url)}</div>
    <div class="header-meta">
      Scanned: ${scanDate}
      ${scan.scan_duration ? ` · Duration: ${(scan.scan_duration / 1000).toFixed(1)}s` : ''}
    </div>

    ${scan.overall_score != null ? `
    <div class="overall">
      <div class="overall-score">
        <div class="score-num" style="color:${overallColor}">${scan.overall_score}<span class="score-denom">/100</span></div>
        <div class="grade" style="color:${overallColor}">${grade}</div>
        <div class="grade-label">${gradeLabel}</div>
      </div>
      <div>
        <div style="color:#94a3b8;font-size:12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em">Issues Found</div>
        <div class="issue-summary">
          ${issueCounts.critical > 0 ? `<div class="issue-chip" style="background:#ef444420"><div class="cnt" style="color:#ef4444">${issueCounts.critical}</div><div class="lbl" style="color:#ef4444">Critical</div></div>` : ''}
          ${issueCounts.high > 0 ? `<div class="issue-chip" style="background:#f9731620"><div class="cnt" style="color:#f97316">${issueCounts.high}</div><div class="lbl" style="color:#f97316">High</div></div>` : ''}
          ${issueCounts.medium > 0 ? `<div class="issue-chip" style="background:#eab30820"><div class="cnt" style="color:#eab308">${issueCounts.medium}</div><div class="lbl" style="color:#eab308">Medium</div></div>` : ''}
          ${issueCounts.low > 0 ? `<div class="issue-chip" style="background:#1e293b"><div class="cnt" style="color:#94a3b8">${issueCounts.low}</div><div class="lbl" style="color:#64748b">Low</div></div>` : ''}
        </div>
      </div>
    </div>` : ''}
  </div>

  <!-- Module Scores -->
  <div class="modules">
    ${modules.map(({ label, score, weight, color }) => {
      const s = score ?? 0
      const moduleIssues = issues.filter((i) => i.module === label.toLowerCase().replace(' analyzer','').replace(' + aeo','').replace(' search visibility','').replace(' scanner',''))
      return `
      <div class="module-card">
        <div class="module-header">
          <span class="module-name">${label}</span>
          <span class="module-weight">weight ${weight}</span>
        </div>
        <div class="module-score" style="color:${color}">${s}<span style="color:#334155;font-size:16px">/100</span></div>
        ${scoreBar(s)}
        <div class="module-issues" style="margin-top:8px">${moduleIssues.length} issues</div>
      </div>`
    }).join('')}
  </div>

  <!-- Issues by module -->
  ${modules.map(({ key, label }) => {
    const moduleIssues = issues.filter((i) => i.module === key)
    return `
    <div class="section">
      <div class="section-header">
        <span class="section-title">${label}</span>
        <span class="section-count">${moduleIssues.length} issues</span>
      </div>
      <table>
        <thead><tr><th style="width:90px">Severity</th><th style="width:90px">Code</th><th>Issue</th><th>Recommendation</th></tr></thead>
        <tbody>${issueRows(issues, key)}</tbody>
      </table>
    </div>`
  }).join('')}

  <div class="footer">
    Generated by <a href="https://github.com/teridox/nexsight">NexSight</a> — Open-source website intelligence platform · MIT License
  </div>
</div>
</body>
</html>`
}
