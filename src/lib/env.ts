import { z } from 'zod'

const EnvSchema = z.object({
  // Database (optional — defaults to local SQLite in client.ts)
  DATABASE_URL: z.string().optional(),

  // AI — required from Phase 3 onward; optional for Phase 0-2
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Observability — required from Phase 4 onward
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional(),

  // Rate limiting — required from Phase 8 onward
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cost guard — max total agent runs per UTC day across all IPs (default 100)
  MAX_DAILY_RUNS: z.coerce.number().int().positive().default(100),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof EnvSchema>

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors)
    throw new Error('Invalid environment configuration — check .env.local')
  }
  return result.data
}

// Singleton — parsed once on first import
export const env = loadEnv()

// Phase-specific guards — call these in the routes/tools that need them
export function requireGeminiKey(): string {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set. Add it to .env.local')
  return env.GEMINI_API_KEY
}

export function requireLangfuse(): { publicKey: string; secretKey: string; baseUrl: string } {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY || !env.LANGFUSE_BASE_URL) {
    throw new Error('Langfuse env vars are not set. Add LANGFUSE_* to .env.local')
  }
  return {
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
  }
}
