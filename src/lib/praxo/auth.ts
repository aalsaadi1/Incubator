import { NextRequest } from 'next/server'

// M0 auth: the Mac app sends a shared device token; real per-user auth
// (tied to NextAuth accounts) is an M4 item in docs/praxo/PLAN.md.
// The userKey header scopes plans/progress per install in the meantime.

export interface PraxoCaller {
  userKey: string
}

export function authenticatePraxo(req: NextRequest): PraxoCaller | null {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '')
  const expected = process.env.PRAXO_DEVICE_TOKEN
  if (!expected || token !== expected) return null

  const userKey = req.headers.get('x-praxo-user-key')
  if (!userKey || userKey.length < 8 || userKey.length > 128) return null

  return { userKey }
}
