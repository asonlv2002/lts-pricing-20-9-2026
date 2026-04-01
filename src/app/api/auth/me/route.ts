// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Chưa đăng nhập.' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    user: {
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      sellerId: session.sellerId,
    },
  })
}
