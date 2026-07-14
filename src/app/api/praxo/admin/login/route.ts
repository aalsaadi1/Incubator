import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminCookieValue, PRAXO_ADMIN_COOKIE } from '@/lib/praxo/auth'

const loginSchema = z.object({ password: z.string().min(1).max(200) })

// POST /api/praxo/admin/login — admin password login.
export async function POST(req: NextRequest) {
  try {
    const { password } = loginSchema.parse(await req.json())
    const expected = process.env.PRAXO_ADMIN_PASSWORD
    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Wrong password.' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(PRAXO_ADMIN_COOKIE, adminCookieValue()!, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
