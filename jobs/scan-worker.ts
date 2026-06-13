import { Worker } from 'bullmq'
import { scanQueue } from '@/jobs/queue'
import { fetchAndParse } from '@/lib/crawler/cheerio'
import { cheerioFromPlaywright } from '@/lib/crawler/playwright'
import { runSeoScan } from '@/lib/scanners/seo'
import { runGeoScan } from '@/lib/scanners/geo'
import { runAiVisibilityScan } from '@/lib/scanners/ai-visibility'
import { runSecurityScan } from '@/lib/scanners/security'
import { calculateOverallScore, getGrade } from '@/lib/scoring'
import { createClient } from '@supabase/supabase-js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
const connection = { url: redisUrl, maxRetriesPerRequest: null as null }

interface ScanJobData {
  scanId: string
  url: string
  modules: string[]
  userId: string
}

const worker = new Worker<ScanJobData>(
  'scans',
  async (job) => {
    const { scanId, url, modules } = job.data
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const startTime = Date.now()

    await supabase.from('scans').update({ status: 'running' }).eq('id', scanId)

    try {
      let crawlResult = await fetchAndParse(url)

      if (crawlResult.html.length < 5000) {
        console.log(`[worker] HTML too small (${crawlResult.html.length}B), retrying with Playwright...`)
        try {
          const playwrightResult = await cheerioFromPlaywright(url)
          crawlResult = {
            ...crawlResult,
            $: playwrightResult.$,
            html: playwrightResult.html,
            cookies: playwrightResult.cookies,
          }
        } catch (playwrightErr) {
          console.warn('[worker] Playwright fallback failed, using cheerio result:', playwrightErr)
        }
      }

      const { $, headers, cookies } = crawlResult

      const [seoResult, geoResult, aiResult, securityResult] = await Promise.all([
        modules.includes('seo') ? runSeoScan(url) : Promise.resolve({ score: 0, issues: [], checks: {} }),
        modules.includes('geo') ? runGeoScan(url, $, headers as Record<string, string | string[] | undefined>) : Promise.resolve({ score: 0, issues: [], checks: {} }),
        modules.includes('ai') ? runAiVisibilityScan(url, $) : Promise.resolve({ score: 0, issues: [], checks: {} }),
        modules.includes('security') ? runSecurityScan(url, $, headers as Record<string, string | string[] | undefined>, cookies) : Promise.resolve({ score: 0, issues: [], checks: {} }),
      ])

      const overallScore = calculateOverallScore(seoResult.score, geoResult.score, aiResult.score, securityResult.score)
      const grade = getGrade(overallScore)
      const scanDuration = Date.now() - startTime

      const result = {
        url,
        seo: seoResult,
        geo: geoResult,
        ai: aiResult,
        security: securityResult,
        overall_score: overallScore,
        grade,
        scan_duration_ms: scanDuration,
      }

      await supabase.from('scans').update({
        status: 'done',
        seo_score: seoResult.score,
        geo_score: geoResult.score,
        ai_score: aiResult.score,
        sec_score: securityResult.score,
        overall_score: overallScore,
        result,
        scan_duration: scanDuration,
        completed_at: new Date().toISOString(),
      }).eq('id', scanId)

      // Save issues to scan_issues table
      const allIssues = [
        ...seoResult.issues,
        ...geoResult.issues,
        ...aiResult.issues,
        ...securityResult.issues,
      ].map((issue) => ({ ...issue, scan_id: scanId }))

      if (allIssues.length > 0) {
        await supabase.from('scan_issues').insert(allIssues)
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase.from('scans').update({
        status: 'failed',
        error_message: msg,
        completed_at: new Date().toISOString(),
      }).eq('id', scanId)
      throw err
    }
  },
  { connection: { url: redisUrl, maxRetriesPerRequest: null as null }, concurrency: 5 }
)

worker.on('completed', (job) => console.log(`Scan ${job.data.scanId} completed`))
worker.on('failed', (job, err) => console.error(`Scan ${job?.data.scanId} failed:`, err))

export default worker
