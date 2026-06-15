import { Worker } from 'bullmq'
import { cheerioFromPlaywright } from '@/lib/crawler/playwright'
import { runSeoScan } from '@/lib/scanners/seo'
import { runGeoScan } from '@/lib/scanners/geo'
import { runAiVisibilityScan } from '@/lib/scanners/ai-visibility'
import { runSecurityScan } from '@/lib/scanners/security'
import { calculateOverallScore, getGrade } from '@/lib/scoring'
import { classifyPage } from '@/lib/classifier/page-type'
import { createClient } from '@supabase/supabase-js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

interface ScanJobData {
  scanId: string
  url: string
  modules: string[]
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
      // Always use Playwright — accurately renders JS-heavy SPAs and captures
      // real response headers, cookies with flags, and fully-hydrated HTML.
      const crawlResult = await cheerioFromPlaywright(url)
      const { $, headers, cookies } = crawlResult
      const typedHeaders = headers as Record<string, string | string[] | undefined>

      // Classify the page to skip irrelevant modules (e.g. /admin → skip GEO/AI)
      const classification = classifyPage(url, $, typedHeaders)
      const activeModules = modules.filter((m) => !classification.skippedModules.includes(m))

      const [seoResult, geoResult, aiResult, securityResult] = await Promise.all([
        activeModules.includes('seo')
          ? runSeoScan(url, $, typedHeaders, cookies)
          : Promise.resolve({ score: 0, issues: [], checks: {} }),
        activeModules.includes('geo')
          ? runGeoScan(url, $, typedHeaders)
          : Promise.resolve({ score: 0, issues: [], checks: {} }),
        activeModules.includes('ai')
          ? runAiVisibilityScan(url, $)
          : Promise.resolve({ score: 0, issues: [], checks: {} }),
        activeModules.includes('security')
          ? runSecurityScan(url, $, typedHeaders, cookies)
          : Promise.resolve({ score: 0, issues: [], checks: {} }),
      ])

      const overallScore = calculateOverallScore(
        activeModules.includes('seo') ? seoResult.score : null,
        activeModules.includes('geo') ? geoResult.score : null,
        activeModules.includes('ai') ? aiResult.score : null,
        activeModules.includes('security') ? securityResult.score : null,
      )
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
        page_type: classification.type,
        page_type_reason: classification.reason,
        skipped_modules: classification.skippedModules,
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
  { connection: { url: redisUrl, maxRetriesPerRequest: null as null }, concurrency: 3 }
)

worker.on('completed', (job) => console.log(`Scan ${job.data.scanId} completed`))
worker.on('failed', (job, err) => console.error(`Scan ${job?.data.scanId} failed:`, err))

export default worker
