import { Langfuse } from 'langfuse'
import { env } from '@/lib/env'

let _client: Langfuse | null = null
let _baseUrl: string = 'https://cloud.langfuse.com'

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

/** The base URL the Langfuse client was initialised with — use this to build trace links. */
export function getLangfuseBaseUrl(): string { return _baseUrl }
