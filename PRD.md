# NexSight
## Open-Source All-in-One Website Intelligence Platform

> **SEO · GEO · AI Search Visibility · Security Scanner** — dalam satu dashboard, self-hostable, gratis.

---

| Field | Detail |
|---|---|
| **Dokumen** | Product Requirements Document (PRD) |
| **Versi** | v3.0 — June 2026 |
| **Author** | Arya / Teridox |
| **Status** | 🟡 Draft — Active Development |
| **Lisensi** | MIT License — Open Source |
| **Tech Stack** | **Next.js 16** · TypeScript · Supabase · Tailwind CSS · BullMQ |
| **Sumber Teknis** | Dokumentasi resmi via Context7 (Next.js v16.2.2, Supabase terbaru) |

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Visi & Tujuan](#2-visi--tujuan)
3. [Target Pengguna & Persona](#3-target-pengguna--persona)
4. [Fitur & Modul Platform](#4-fitur--modul-platform)
5. [Arsitektur Teknis](#5-arsitektur-teknis)
6. [Database Schema](#6-database-schema)
7. [REST API Specification](#7-rest-api-specification)
8. [Development Roadmap](#8-development-roadmap)
9. [Strategi Monetisasi](#9-strategi-monetisasi)
10. [Risiko & Mitigasi](#10-risiko--mitigasi)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Open Source Contribution Guide](#12-open-source-contribution-guide)
13. [Referensi](#13-referensi)

---

## 1. Executive Summary

NexSight adalah platform **open-source all-in-one** untuk menganalisis performa website dari empat dimensi sekaligus:

- 🔍 **SEO** — Technical & on-page SEO audit
- 🧠 **GEO** — Generative Engine Optimization readiness
- ✨ **AI Search Visibility** — Probabilitas dikutip ChatGPT, Gemini, Perplexity, Claude
- 🔒 **Security** — OWASP headers, SSL, CVE, DNS check

Platform ini dapat di-self-host, menyediakan REST API, dashboard realtime via Supabase, serta laporan PDF/HTML — semuanya gratis dan tanpa vendor lock-in.

### Masalah yang Diselesaikan

> Tools SEO seperti Ahrefs dan SEMrush berbayar mahal dan tidak mencakup GEO/AI visibility. Tools security seperti Snyk memerlukan langganan enterprise. **Tidak ada satu pun platform open source** yang menggabungkan keempat dimensi ini dalam satu dashboard yang dapat di-self-host.

### Konteks Pasar (2026)

- 📉 Organic search traffic turun **25%+** karena shift ke AI chatbots (Gartner, 2026)
- 📈 AI-referred web sessions naik **527% YoY**
- 🤖 Google AI Overviews muncul di **25%** dari semua pencarian
- 💰 Pasar GEO senilai **$848 juta** (2025) → projected **$33.7 miliar** (2034)
- 📦 **44.2%** LLM citations berasal dari 30% pertama teks di halaman

---

## 2. Visi & Tujuan

### 2.1 Visi Produk

> Menjadi standar industri open-source untuk website intelligence audit — pengganti berbayar dari Ahrefs, Moz, Snyk, dan SEMrush — yang dapat dipakai developer indie, agency, UMKM, hingga enterprise di seluruh dunia.

### 2.2 Tujuan Bisnis & Success Metrics

| Metrik | Target (12 bulan) |
|---|---|
| GitHub Stars | 10,000+ |
| Unique Installations | 50,000+ |
| API Requests/bulan | 1,000,000+ |
| Contributor aktif | 50+ |
| Scan success rate | >95% |

---

## 3. Target Pengguna & Persona

| Persona | Kebutuhan Utama | Pain Point |
|---|---|---|
| **Web Developer** | API access, CI/CD integration | Tool scan yang bisa dipakai di pipeline otomatis |
| **Digital Agency** | Bulk scanning, white-label report, team workspace | Biaya per-seat tools seperti Ahrefs sangat mahal |
| **Pemilik Website / UMKM** | Simple UI, skor mudah dipahami | Tidak paham output tools teknis |
| **Security Engineer** | OWASP check, CVE detection | Tidak ada tool combine security + SEO satu tempat |
| **Content Marketer** | GEO score, citability check | Tidak tahu cara optimasi untuk AI search |

---

## 4. Fitur & Modul Platform

> **Prioritas:** `P0` = MVP wajib · `P1` = Phase 2 · `P2` = Phase 3+

### NexSight Score Formula

```
NexSight Score = (SEO × 0.30) + (GEO × 0.25) + (AI × 0.20) + (Security × 0.25)
```

| Skor | Grade | Interpretasi |
|---|---|---|
| 90–100 | A+ | Excellent — top 5% websites |
| 75–89 | A | Good — minor improvements needed |
| 60–74 | B | Fair — significant gaps exist |
| 40–59 | C | Poor — major issues to fix |
| 0–39 | F | Critical — immediate action needed |

---

### 4.1 Modul SEO Analyzer

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| S-01 | Meta Tags Audit | `P0` | title, description, canonical, robots meta — completeness & panjang optimal |
| S-02 | Core Web Vitals | `P0` | LCP, CLS, INP via Lighthouse API |
| S-03 | Broken Link Detector | `P0` | Crawl internal/external link, deteksi 404, redirect chain |
| S-04 | Schema Markup Validator | `P0` | JSON-LD: Article, Product, FAQ, BreadcrumbList, LocalBusiness |
| S-05 | Sitemap & Robots.txt | `P0` | Validasi format, coverage URL, disallow rules |
| S-06 | Page Speed Score | `P0` | TTFB, FCP, resource size, render-blocking resources |
| S-07 | Mobile Friendliness | `P1` | Viewport config, touch target size |
| S-08 | Internal Link Analysis | `P1` | Orphan pages, anchor text diversity |
| S-09 | Duplicate Content | `P1` | Canonical mismatch detection |
| S-10 | Heading Structure | `P1` | H1-H6 hierarchy, missing H1 |
| S-11 | Image Optimization | `P1` | Alt text, WebP, lazy loading |
| S-12 | Hreflang Check | `P2` | Multilingual site validation |

---

### 4.2 Modul GEO + AEO Analyzer

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| G-01 | E-E-A-T Signal Detection | `P0` | Author byline, date, organization markup, about & contact page |
| G-02 | AI Citability Score | `P0` | Analisis 200 kata pertama — directness, completeness, answer density |
| G-03 | FAQ Schema Audit | `P0` | FAQ schema, PAA readiness, conversational query match |
| G-04 | Content Freshness | `P0` | Last modified date, update frequency, stale content |
| G-05 | AI Crawler Access | `P0` | Robots.txt rules untuk GPTBot, ClaudeBot, Gemini-Bot |
| G-06 | Semantic Clarity | `P1` | Entity coverage, topic depth |
| G-07 | OpenGraph & Social Meta | `P1` | og:title, og:description, og:image |
| G-08 | Llms.txt Check | `P1` | Deteksi `/llms.txt` — file panduan AI tentang website |
| G-09 | Knowledge Panel Readiness | `P2` | Wikidata entity, sameAs markup |

---

### 4.3 Modul AI Search Visibility

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| A-01 | AI Citation Probability | `P0` | Estimasi likelihood konten dikutip AI via LLM |
| A-02 | Heading Hierarchy for AI | `P0` | H2/H3 clarity, logical section progression |
| A-03 | Conversational Query Match | `P0` | Simulasi pertanyaan relevan — apakah halaman menjawab direct |
| A-04 | Multi-platform AI Score | `P1` | Skor terpisah: ChatGPT · Gemini · Perplexity · Claude |
| A-05 | Content Originality | `P1` | Original vs. highly similar ke sumber lain |
| A-06 | Structured Answer Readiness | `P1` | Bullet, numbered list, table untuk AI snippet |
| A-07 | AI Search Preview | `P2` | Mockup tampilan di ChatGPT/Perplexity answer box |

---

### 4.4 Modul Security Scanner

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SC-01 | HTTP Security Headers | `P0` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy |
| SC-02 | SSL/TLS Validation | `P0` | Certificate validity, expiry, cipher strength, TLS version (min 1.2) |
| SC-03 | Mixed Content Check | `P0` | HTTP resources dalam HTTPS page |
| SC-04 | Cookie Security Flags | `P0` | HttpOnly, Secure, SameSite, `__Secure-` prefix |
| SC-05 | OWASP Headers Baseline | `P0` | OWASP Top 10 A05 & A02 |
| SC-06 | DNS Security Check | `P1` | SPF, DKIM, DMARC |
| SC-07 | Dependency CVE Lookup | `P1` | Library frontend dari HTML source → NVD CVE database |
| SC-08 | Security.txt Check | `P1` | `/.well-known/security.txt` sesuai RFC 9116 |
| SC-09 | Subdomain Takeover | `P2` | Dangling DNS records |

---

## 5. Arsitektur Teknis

### 5.1 Tech Stack

> Semua implementasi berdasarkan **dokumentasi resmi Next.js v16.2.2 dan Supabase** yang diambil langsung dari Context7.

| Layer | Teknologi | Catatan Penting (dari Context7) |
|---|---|---|
| **Frontend** | **Next.js 16** + TypeScript + Tailwind CSS | `cacheComponents: true` menggantikan `experimental.dynamicIO` |
| **Caching** | `'use cache'` directive (stable di v16) | Tidak perlu `experimental` flag lagi |
| **Build Tool** | Turbopack (default di v16) | `turbopackFileSystemCacheForDev` untuk dev lebih cepat |
| **API Layer** | Next.js 16 Route Handlers | `params` tetap `Promise` — wajib `await` |
| **Auth & Session** | `@supabase/ssr` — `createServerClient` | Gunakan `getClaims()`, bukan `getSession()` |
| **Database** | Supabase PostgreSQL + RLS | `replica identity full` untuk tabel dengan Realtime |
| **Realtime** | Supabase Realtime + RLS | Broadcast otomatis mengikuti RLS policy |
| **Job Queue** | BullMQ + Redis | Async scan, retry logic, concurrent management |
| **Crawler** | Playwright + Cheerio + Lighthouse API | Playwright untuk JS-heavy, Cheerio untuk parsing cepat |
| **AI Layer** | OpenRouter API | AI recommendations, citability analysis |
| **Report** | Puppeteer PDF + HTML export | Branded PDF & shareable HTML URL |
| **Deployment** | Docker Compose + Vercel | Self-hosted via `docker compose up` |

---

### 5.2 `next.config.ts` — Next.js 16

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16: cacheComponents menggantikan experimental.dynamicIO
  cacheComponents: true,

  experimental: {
    // Turbopack filesystem cache — mempercepat dev & build
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,  // experimental untuk production
  },
}

export default nextConfig
```

> ⚠️ **Breaking change dari Next.js 15:** Jika sebelumnya pakai `experimental.dynamicIO: true` atau `experimental.ppr: true`, migrate ke `cacheComponents: true`.

---

### 5.3 Struktur Folder Project

```
nexsight/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Overview semua scans
│   │   ├── scan/[id]/page.tsx          # Detail hasil scan
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── scan/
│   │   │   ├── route.ts                # POST /api/scan
│   │   │   └── [id]/route.ts           # GET /api/scan/:id
│   │   ├── scans/route.ts              # GET /api/scans (list)
│   │   ├── report/[id]/route.ts        # GET /api/report/:id
│   │   └── v1/                         # Public REST API
│   │       ├── scan/route.ts
│   │       └── keys/route.ts
│   └── auth/callback/route.ts          # OAuth PKCE callback
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # createServerClient
│   │   ├── client.ts                   # createBrowserClient
│   │   └── proxy.ts                    # middleware session
│   ├── scanners/
│   │   ├── seo/index.ts
│   │   ├── geo/index.ts
│   │   ├── ai-visibility/index.ts
│   │   └── security/index.ts
│   ├── crawler/
│   │   ├── playwright.ts
│   │   └── cheerio.ts
│   ├── ai/openrouter.ts
│   ├── scoring/index.ts
│   └── report/
│       ├── pdf.ts
│       └── html.ts
│
├── components/
│   ├── dashboard/
│   │   ├── ScoreCard.tsx               # 'use cache' component
│   │   ├── ScanHistory.tsx
│   │   └── RealtimeStatus.tsx          # 'use client' — Supabase Realtime
│   └── ui/
│
├── jobs/scan-worker.ts                 # BullMQ worker
├── middleware.ts                       # Supabase Auth proxy
├── next.config.ts                      # Next.js 16 config
├── docker-compose.yml
└── .env.example
```

---

### 5.4 Implementasi Teknis (dari Context7 — Next.js 16 + Supabase)

#### `middleware.ts` — Auth Session Management

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // PENTING: Gunakan getClaims() — bukan getSession()
  // Jangan taruh kode apapun antara createServerClient dan getClaims()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // PENTING: Selalu return supabaseResponse apa adanya
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

#### `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Dari Server Component — bisa diabaikan jika middleware aktif
          }
        },
      },
    }
  )
}
```

---

#### `app/api/scan/route.ts` — Trigger Scan

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanQueue } from '@/jobs/scan-worker'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url, modules = ['seo', 'geo', 'ai', 'security'] } = await request.json()

  const { data: scan, error } = await supabase
    .from('scans')
    .insert({ user_id: user.id, url, status: 'queued' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }

  await scanQueue.add('run-scan', { scanId: scan.id, url, modules, userId: user.id })

  return NextResponse.json({ scanId: scan.id, status: 'queued' }, { status: 201 })
}
```

---

#### `app/api/scan/[id]/route.ts` — Get Hasil Scan

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Next.js 16: params tetap Promise — wajib await (sama seperti v15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // wajib await

  const supabase = await createClient()
  const { data: scan, error } = await supabase
    .from('scans')
    .select('*, scan_issues(*)')
    .eq('id', id)
    .single()

  if (error || !scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  return NextResponse.json(scan)
}
```

---

#### `app/(dashboard)/scan/[id]/page.tsx` — Page dengan async params

```tsx
// Next.js 16: params di Page juga Promise
export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // wajib await

  const supabase = await createClient()
  const { data: scan } = await supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .single()

  return (
    <div>
      <ScoreCard scan={scan} />
      <RealtimeStatus scanId={id} initialScan={scan} />
    </div>
  )
}
```

---

#### Cache Components dengan `'use cache'` (Next.js 16 — Stable)

```tsx
// components/dashboard/ScoreCard.tsx
// 'use cache' stable di Next.js 16 — tidak perlu experimental flag

async function CachedScoreSummary({ url }: { url: string }) {
  'use cache'
  // Semua fetch di dalam komponen ini otomatis di-cache
  const historicalData = await fetchHistoricalScores(url)

  return (
    <div className="score-summary">
      {historicalData.map(entry => (
        <ScoreEntry key={entry.id} data={entry} />
      ))}
    </div>
  )
}

// Komponen wrapper — children tidak ikut di-cache
async function CachedWrapper({ children }: { children: React.ReactNode }) {
  'use cache'
  return (
    <div className="wrapper">
      <header>NexSight Score History</header>
      {children}  {/* Dynamic content dipass through, tidak ikut di-cache */}
    </div>
  )
}
```

---

#### `components/dashboard/RealtimeStatus.tsx` — Supabase Realtime

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Scan } from '@/types'

interface Props {
  scanId: string
  initialScan: Scan
}

export function RealtimeStatus({ scanId, initialScan }: Props) {
  const [scan, setScan] = useState<Scan>(initialScan)
  const supabase = createClient()

  useEffect(() => {
    // Supabase Realtime dengan filter per scan_id
    // RLS otomatis berlaku — user hanya terima update scan milik mereka
    const channel = supabase
      .channel(`scan-${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        (payload) => setScan(payload.new as Scan)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [scanId])

  return (
    <div>
      <p>Status: <strong>{scan.status}</strong></p>
      {scan.overall_score && <p>Score: <strong>{scan.overall_score}/100</strong></p>}
    </div>
  )
}
```

---

#### `app/auth/callback/route.ts` — OAuth PKCE

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'

      if (isLocal) return NextResponse.redirect(`${origin}${next}`)
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

---

## 6. Database Schema

### 6.1 Catatan Penting — Realtime + RLS

Berdasarkan Context7: tabel yang menggunakan Supabase Realtime perlu `REPLICA IDENTITY FULL` agar data sebelumnya ikut dikirim. RLS otomatis berlaku pada Realtime broadcast.

```sql
-- Setup Realtime publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Aktifkan replica identity FULL untuk tabel dengan Realtime
ALTER TABLE public.scans REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;
```

### 6.2 SQL Schema Lengkap

```sql
-- ─────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name   TEXT,
  company     TEXT,
  plan        TEXT DEFAULT 'free',  -- free | pro | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- Auto-create profile saat user register
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- ─────────────────────────────────────────────────────
-- SCANS
-- ─────────────────────────────────────────────────────
CREATE TABLE public.scans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL,
  url             TEXT NOT NULL,
  status          TEXT DEFAULT 'queued',  -- queued | running | done | failed
  seo_score       INT CHECK (seo_score BETWEEN 0 AND 100),
  geo_score       INT CHECK (geo_score BETWEEN 0 AND 100),
  ai_score        INT CHECK (ai_score BETWEEN 0 AND 100),
  sec_score       INT CHECK (sec_score BETWEEN 0 AND 100),
  overall_score   INT CHECK (overall_score BETWEEN 0 AND 100),
  result          JSONB,
  scan_duration   INT,        -- milliseconds
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans REPLICA IDENTITY FULL;  -- diperlukan untuk Realtime

CREATE POLICY "Users see only own scans"
  ON public.scans FOR ALL
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);


-- ─────────────────────────────────────────────────────
-- SCAN_ISSUES
-- ─────────────────────────────────────────────────────
CREATE TABLE public.scan_issues (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id         UUID REFERENCES public.scans ON DELETE CASCADE NOT NULL,
  module          TEXT NOT NULL,    -- seo | geo | ai | security
  severity        TEXT NOT NULL,    -- critical | high | medium | low | info
  code            TEXT NOT NULL,    -- SC-01, S-03, G-02 dll
  title           TEXT NOT NULL,
  description     TEXT,
  recommendation  TEXT,
  affected_url    TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scan_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see issues of own scans"
  ON public.scan_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = public.scan_issues.scan_id
      AND (SELECT auth.uid()) = public.scans.user_id
    )
  );

CREATE INDEX idx_scan_issues_scan_id ON public.scan_issues(scan_id);
CREATE INDEX idx_scan_issues_severity ON public.scan_issues(severity);


-- ─────────────────────────────────────────────────────
-- API_KEYS
-- ─────────────────────────────────────────────────────
CREATE TABLE public.api_keys (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,  -- bcrypt hash
  key_prefix  TEXT NOT NULL,        -- 8 chars untuk display (nxs_xxxx)
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys"
  ON public.api_keys FOR ALL
  USING ((SELECT auth.uid()) = user_id);
```

---

## 7. REST API Specification

### 7.1 Base URL & Auth

```
Base URL: https://your-instance.com/api/v1

Authentication:
  Authorization: Bearer <supabase-jwt>
  X-API-Key: nxs_xxxxxxxxxxxxxxxx
```

### 7.2 Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/v1/scan` | Trigger scan baru |
| `GET` | `/api/v1/scan/:id` | Status & hasil scan |
| `GET` | `/api/v1/scans` | List history scan |
| `GET` | `/api/v1/report/:id?format=pdf\|html` | Generate & download report |
| `POST` | `/api/v1/keys` | Buat API key baru |
| `DELETE` | `/api/v1/keys/:id` | Hapus API key |

### 7.3 Contoh Request & Response

```jsonc
// POST /api/v1/scan
{
  "url": "https://example.com",
  "modules": ["seo", "geo", "ai", "security"]
}

// Response 201
{
  "scan_id": "uuid-xxxx",
  "status": "queued",
  "url": "https://example.com",
  "created_at": "2026-06-13T10:00:00Z"
}

// GET /api/v1/scan/:id — Response 200 (done)
{
  "id": "uuid-xxxx",
  "url": "https://example.com",
  "status": "done",
  "overall_score": 72,
  "scores": { "seo": 82, "geo": 61, "ai": 47, "security": 73 },
  "issues": { "critical": 2, "high": 5, "medium": 12, "low": 8 },
  "scan_duration_ms": 28430,
  "completed_at": "2026-06-13T10:00:28Z"
}
```

### 7.4 Rate Limits

| Plan | Scan/menit | Scan/bulan |
|---|---|---|
| Self-Hosted | Unlimited | Unlimited |
| Cloud Free | 2 | 50 |
| Cloud Pro | 10 | 1,000 |
| Enterprise | 60 | Unlimited |

---

## 8. Development Roadmap

### Phase 1 — MVP Core *(4–6 minggu)*

- [ ] Init Next.js 16 + Supabase + TypeScript + Tailwind
- [ ] `next.config.ts` dengan `cacheComponents: true` dan Turbopack filesystem cache
- [ ] Auth flow: register, login, middleware dengan `getClaims()`
- [ ] SEO Analyzer: S-01 sampai S-06 (semua P0)
- [ ] Security Scanner: SC-01 sampai SC-05 (semua P0)
- [ ] Basic scoring & issue list
- [ ] HTML report export
- [ ] Docker Compose self-hosting
- [ ] README + GitHub Actions CI/CD

### Phase 2 — GEO + AI Visibility + Dashboard *(3–4 minggu)*

- [ ] GEO Analyzer: G-01 sampai G-08
- [ ] AI Search Visibility: A-01 sampai A-04
- [ ] Realtime dashboard via Supabase Realtime + RLS
- [ ] PDF report dengan Puppeteer
- [ ] AI recommendations via OpenRouter
- [ ] Score visualization dengan Recharts
- [ ] `'use cache'` untuk score history components

### Phase 3 — REST API + Multi-user *(3–4 minggu)*

- [ ] Public REST API (`/api/v1/*`)
- [ ] API key management UI
- [ ] Team workspace + shared scans
- [ ] Webhook notifications
- [ ] OpenAPI documentation (Swagger UI)

### Phase 4 — Monitoring & Ecosystem *(Ongoing)*

- [ ] Scheduled monitoring (cron scans)
- [ ] Email/webhook alerts saat skor turun
- [ ] White-label mode
- [ ] Plugin system untuk custom checks
- [ ] Comparison view (before/after)

---

## 9. Strategi Monetisasi

Model **open-core** seperti Cal.com dan Formbricks.

| Tier | Harga | Fitur Utama |
|---|---|---|
| **Self-Hosted** | Gratis | Semua fitur, unlimited scans, Docker |
| **Cloud Starter** | $9/bulan | 100 scans/bulan, PDF, email alerts |
| **Cloud Pro** | $29/bulan | 1000 scans/bulan, scheduled monitoring, team |
| **White-Label** | $99/bulan | Custom branding, unlimited klien |
| **Enterprise** | Custom | SLA, dedicated instance, SSO |

---

## 10. Risiko & Mitigasi

| Risiko | Severity | Mitigasi |
|---|---|---|
| Rate limiting dari target website | Medium | Exponential backoff, robots.txt compliance |
| AI Search algorithm berubah | High | Modular scoring — update independent per check |
| Crawler diblokir Cloudflare/WAF | Medium | Playwright stealth mode, proper User-Agent |
| Biaya AI API membengkak | High | AI optional, BYOK untuk self-hosted |
| SSRF dari URL input | High | Validasi ketat, block private IP ranges |
| Session sync issues | Medium | Ikuti pattern Context7 — jangan modifikasi `supabaseResponse` |
| `cacheComponents` conflict dengan dynamic data | Medium | Pisahkan cached dan dynamic components dengan benar |

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Full 4-modul scan | < 30 detik per URL |
| API response (status check) | < 200ms |
| Dashboard load (dengan `'use cache'`) | < 1.5 detik |
| PDF generation | < 10 detik |
| Concurrent scans | ≥ 10 parallel per instance |
| Uptime (cloud) | 99.5% |
| Scan success rate | > 95% |

---

## 12. Open Source Contribution Guide

### Quick Start

```bash
git clone https://github.com/teridox/nexsight.git
cd nexsight
npm install
cp .env.example .env.local
npx supabase db push
npm run dev
```

### Environment Variables

```env
# .env.example

# Supabase — gunakan PUBLISHABLE_KEY, bukan ANON_KEY
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJxxx

# AI Layer
OPENROUTER_API_KEY=sk-or-xxx

# Job Queue
REDIS_URL=redis://localhost:6379
```

---

## 13. Referensi

| Sumber | Versi | Diakses via |
|---|---|---|
| Next.js Upgrade Guide v16 | v16.2.2 | Context7 — `/vercel/next.js/v16.2.2` |
| Next.js `use cache` Directive | v16.1.6 | Context7 — `/vercel/next.js/v16.1.6` |
| Next.js Turbopack Filesystem Cache | v16.1.6 | Context7 — `/vercel/next.js/v16.1.6` |
| Supabase Auth + Next.js Middleware | Terbaru | Context7 — `/supabase/supabase` |
| Supabase Realtime + RLS | Terbaru | Context7 — `/supabase/supabase` |
| OWASP Top 10 2021 | — | owasp.org |
| RFC 9116 — security.txt | — | securitytxt.org |
| Llms.txt Standard | — | llmstxt.org |
| NVD CVE Database | — | nvd.nist.gov |

---

*NexSight PRD v3.0 — Arya / Teridox — Juni 2026 — MIT License*
*Seluruh implementasi teknis berdasarkan dokumentasi resmi Next.js v16.2.2 dan Supabase via Context7*