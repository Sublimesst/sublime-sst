import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter for Edge runtime
// In production, replace with Upstash Redis or similar
const store = new Map<string, { count: number; reset: number }>()

export function rateLimit(req: NextRequest, limit = 10, windowMs = 60_000): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `${ip}:${req.nextUrl.pathname}`
  const now = Date.now()

  const entry = store.get(key)
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked

  entry.count++
  return true
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Muitas requisições. Aguarde alguns instantes e tente novamente.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
