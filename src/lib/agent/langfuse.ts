import { Langfuse } from 'langfuse'
import { env } from '@/lib/env'

let _client: Langfuse | null = null
let _baseUrl: string = 'https://cloud.langfuse.com'
let _projectId: string | null = null
let _projectIdPromise: Promise<string | null> | null = null

export function getLangfuse(): Langfuse | null {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) return null
  if (!_client) {
    _baseUrl = (env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com').replace(/\/$/, '')
    _client = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: _baseUrl,
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

export function getLangfuseBaseUrl(): string { return _baseUrl }

/** Fetches the Langfuse project ID via the API (cached after first call). */
export async function getLangfuseProjectId(): Promise<string | null> {
  if (_projectId) return _projectId
  if (!_projectIdPromise) {
    _projectIdPromise = (async () => {
      // Prefer explicit env var — avoids an extra API call
      if (env.LANGFUSE_PROJECT_ID) {
        _projectId = env.LANGFUSE_PROJECT_ID
        return _projectId
      }
      const lf = getLangfuse()
      if (!lf) return null
      try {
        const res = await lf.api.projectsGet()
        _projectId = res.data?.[0]?.id ?? null
      } catch {
        _projectId = null
      }
      return _projectId
    })()
  }
  return _projectIdPromise
}

/**
 * Builds the correct Langfuse trace URL for both US and EU regions.
 * US short form `/trace/{id}` doesn't work on EU; the full path is always safe.
 */
export async function buildTraceUrl(traceId: string): Promise<string> {
  const projectId = await getLangfuseProjectId()
  if (projectId) {
    return `${_baseUrl}/project/${projectId}/traces/${traceId}`
  }
  // Fallback to short form (works on US cloud.langfuse.com)
  return `${_baseUrl}/trace/${traceId}`
}
