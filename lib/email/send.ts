import { Resend } from 'resend'
import { branding } from '@/lib/branding'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(key)
  }
  return _resend
}

export async function sendScoreAlert({
  to,
  url,
  score,
  prevScore,
  scanId,
}: {
  to: string
  url: string
  score: number
  prevScore: number | null
  scanId: string
}): Promise<void> {
  const drop = prevScore !== null ? prevScore - score : null
  const hostname = new URL(url).hostname

  const subject = drop !== null && drop > 0
    ? `${branding.name} Alert: ${hostname} score dropped ${drop} pts (${prevScore} → ${score})`
    : `${branding.name} Alert: ${hostname} score is below threshold (${score}/100)`

  await getResend().emails.send({
    from: branding.fromEmail,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
<div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:#0f172a;padding:24px">
    <div style="color:${branding.primaryColor};font-weight:700;font-size:20px">${branding.name}</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:2px">Score Alert</div>
  </div>
  <div style="padding:24px">
    <h2 style="color:#0f172a;margin:0 0 8px 0;font-size:18px">Score alert triggered</h2>
    <p style="color:#475569;margin:0 0 24px 0;font-size:14px">A monitored site triggered an alert.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Monitored URL</div>
      <div style="color:#0f172a;font-weight:600;font-size:14px;margin-bottom:16px;word-break:break-all">${url}</div>
      <div style="display:flex;align-items:center;gap:16px">
        ${prevScore !== null ? `
        <div>
          <div style="color:#64748b;font-size:11px">Previous</div>
          <div style="font-size:28px;font-weight:700;color:#0f172a">${prevScore}</div>
        </div>
        <div style="color:#94a3b8;font-size:20px">→</div>
        ` : ''}
        <div>
          <div style="color:#64748b;font-size:11px">Current Score</div>
          <div style="font-size:28px;font-weight:700;color:#ef4444">${score}<span style="font-size:14px;color:#94a3b8">/100</span></div>
        </div>
        ${drop !== null && drop > 0 ? `
        <div style="margin-left:auto;background:#fee2e2;border-radius:6px;padding:6px 12px">
          <div style="color:#dc2626;font-weight:600;font-size:14px">&#8722;${drop} pts</div>
        </div>
        ` : ''}
      </div>
    </div>

    <a href="${branding.appUrl}/dashboard/scan/${scanId}"
       style="display:inline-block;background:${branding.primaryColor};color:#0f172a;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
      View Full Report &#8594;
    </a>
  </div>
  <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc">
    <p style="color:#94a3b8;font-size:12px;margin:0">
      You are receiving this because you enabled monitoring for ${url} in ${branding.name}.
    </p>
  </div>
</div>
</body>
</html>
    `,
  })
}
