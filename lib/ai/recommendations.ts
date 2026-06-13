import OpenAI from 'openai'

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium'
  title: string
  action: string
  estimatedImpact: string
}

export async function generateRecommendations(
  url: string,
  overallScore: number,
  topIssues: Array<{ module: string; severity: string; title: string; code: string }>
): Promise<Recommendation[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || topIssues.length === 0) return []

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: { 'HTTP-Referer': 'https://nexsight.app', 'X-Title': 'NexSight' },
  })

  const issueList = topIssues
    .slice(0, 8)
    .map((i) => `- [${i.module.toUpperCase()}] ${i.title} (${i.severity})`)
    .join('\n')

  const prompt = `Website: ${url}
NexSight Score: ${overallScore}/100

Top issues found:
${issueList}

Provide exactly 3 prioritized action recommendations to improve the score. For each:
1. A short title (max 8 words)
2. A specific, actionable step (1-2 sentences)
3. Estimated score impact (e.g. "+5-8 points")

Format as JSON array:
[{"priority":"high","title":"...","action":"...","estimatedImpact":"..."}]

Only output valid JSON, nothing else.`

  try {
    const response = await client.chat.completions.create({
      model: 'anthropic/claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? '[]'
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]) as Recommendation[]
  } catch {
    return []
  }
}
