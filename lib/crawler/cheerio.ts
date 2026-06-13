import axios, { type AxiosResponseHeaders, type RawAxiosResponseHeaders } from 'axios'
import * as cheerio from 'cheerio'

export interface FetchResult {
  $: cheerio.CheerioAPI
  html: string
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders
  cookies: string[]
  statusCode: number
  finalUrl: string
  redirectChain: string[]
}

export interface HeaderResult {
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders
  statusCode: number
  finalUrl: string
  redirectChain: string[]
}

const REQUEST_TIMEOUT = 15000
const USER_AGENT =
  'NexSight-Bot/1.0 (+https://github.com/teridox/nexsight)'

export async function fetchAndParse(url: string): Promise<FetchResult> {
  const redirectChain: string[] = []

  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    maxRedirects: 10,
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: () => true,
    beforeRedirect: (options, { headers }) => {
      if (headers.location) redirectChain.push(headers.location as string)
    },
  })

  const html = typeof response.data === 'string' ? response.data : ''
  const $ = cheerio.load(html)
  const setCookieHeader = response.headers['set-cookie']
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : []

  return {
    $,
    html,
    headers: response.headers,
    cookies,
    statusCode: response.status,
    finalUrl: response.request?.res?.responseUrl ?? url,
    redirectChain,
  }
}

export async function fetchHeaders(url: string): Promise<HeaderResult> {
  const redirectChain: string[] = []

  const response = await axios.head(url, {
    timeout: REQUEST_TIMEOUT,
    maxRedirects: 10,
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: () => true,
    beforeRedirect: (options, { headers }) => {
      if (headers.location) redirectChain.push(headers.location as string)
    },
  })

  return {
    headers: response.headers,
    statusCode: response.status,
    finalUrl: response.request?.res?.responseUrl ?? url,
    redirectChain,
  }
}
