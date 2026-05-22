import { Langfuse } from 'langfuse'
import { env } from '@/lib/env'

let _client: Langfuse | null = null

export function getLangfuse(): Langfuse | null {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) return null
  if (!_client) {
    _client = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
      flushAt: 1,   // send immediately — we flush manually at the end too
      flushInterval: 0,
    })
  }
  return _client
}
