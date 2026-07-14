import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidAccessCode, PRAXO_CODE_COOKIE } from '@/lib/praxo/auth'

const loginSchema = z.object({ code: z.string().min(6).max(64) })

// POST /api/praxo/web/login — learner access-code login. Sets an HttpOnly
// cookie; the code doubles as the identity (same code = same progress).
export async function POST(req: NextRequest) {
  try {
    const { code } = loginSchema.parse(await req.json())
    if (!isValidAccessCode(code)) {
      return NextResponse.json({ error: 'That code is not valid.' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(PRAXO_CODE_COOKIE, code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// DELETE /api/praxo/web/login — logout.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(PRAXO_CODE_COOKIE)
  return res
}
