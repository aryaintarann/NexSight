import puppeteer from 'puppeteer'
import { generateHtmlReport } from './html'
import type { Scan, ScanIssueRow } from '@/types'

export async function generatePdfReport(scan: Scan & { scan_issues: ScanIssueRow[] }): Promise<Buffer> {
  const html = generateHtmlReport(scan)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
  })

  await browser.close()
  return Buffer.from(pdf)
}
