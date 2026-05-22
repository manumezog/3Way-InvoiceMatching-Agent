import { NextRequest, NextResponse } from 'next/server'

// Rate limiting is optional — only active when Upstash env vars are present.
// This keeps local dev working with zero config.

const RATE_LIMITED_PATHS = ['/api/agent/stream', '/api/agent/byoi', '/api/eval/run']

let limiter: ((ip: string) => Promise<{ success: boolean; limit: number; remaining: number }>) | null = null

async function getLimiter() {
  if (limiter !== null) return limiter

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    // No-op when unconfigured
    limiter = async () => ({ success: true, limit: 0, remaining: 0 })
    return limiter
  }

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis }     = await import('@upstash/redis')

  const redis   = new Redis({ url, token })
  const rl      = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 agent runs / minute / IP
    analytics: true,
    prefix: 'fastpay:rl',
  })

  limiter = (ip: string) => rl.limit(ip)
  return limiter
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? req.headers.get('x-real-ip')
           ?? '127.0.0.1'

  const check = await getLimiter()
  const { success, limit, remaining } = await check(ip)

  if (!success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please wait before running another invoice.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'Retry-After': '60',
        },
      },
    )
  }

  const res = NextResponse.next()
  res.headers.set('X-RateLimit-Limit', String(limit))
  res.headers.set('X-RateLimit-Remaining', String(remaining))
  return res
}

export const config = {
  matcher: '/api/:path*',
}
