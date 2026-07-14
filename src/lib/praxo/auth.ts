import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

// Praxo has two callers with the same M0-simple auth philosophy (real
// accounts land in M4, see docs/praxo/PLAN.md):
//
//  1. The native Mac app: sends "Authorization: Bearer <PRAXO_DEVICE_TOKEN>"
//     plus an "X-Praxo-User-Key" header it generates per install.
//  2. The web app: the learner enters an access code (one of
//     PRAXO_ACCESS_CODES, comma-separated) on /praxo; a cookie carries it on
//     every request and the user key is derived from the code, so the same
//     code resumes the same progress on any browser.
//
// Admin (/praxo/admin) is separate: PRAXO_ADMIN_PASSWORD proven via cookie.

export interface PraxoCaller {
  userKey: string
}

export const PRAXO_CODE_COOKIE = 'praxo_code'
export const PRAXO_ADMIN_COOKIE = 'praxo_admin'

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function isValidAccessCode(code: string): boolean {
  const codes = (process.env.PRAXO_ACCESS_CODES || '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length >= 6)
  return codes.some((c) => safeEqual(c, code))
}

export function userKeyForAccessCode(code: string): string {
  return `web-${sha256(`praxo-code:${code}`).slice(0, 32)}`
}

export function authenticatePraxo(req: NextRequest): PraxoCaller | null {
  // Path 1: device token (Mac app)
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '')
  const expected = process.env.PRAXO_DEVICE_TOKEN
  if (token && expected && safeEqual(token, expected)) {
    const userKey = req.headers.get('x-praxo-user-key')
    if (userKey && userKey.length >= 8 && userKey.length <= 128) {
      return { userKey }
    }
    return null
  }

  // Path 2: access-code cookie (web app)
  const code = req.cookies.get(PRAXO_CODE_COOKIE)?.value
  if (code && isValidAccessCode(code)) {
    return { userKey: userKeyForAccessCode(code) }
  }

  return null
}

export function adminCookieValue(): string | null {
  const password = process.env.PRAXO_ADMIN_PASSWORD
  if (!password) return null
  return sha256(`praxo-admin:${password}`)
}

export function authenticatePraxoAdmin(req: NextRequest): boolean {
  const expected = adminCookieValue()
  const got = req.cookies.get(PRAXO_ADMIN_COOKIE)?.value
  return Boolean(expected && got && safeEqual(got, expected))
}
