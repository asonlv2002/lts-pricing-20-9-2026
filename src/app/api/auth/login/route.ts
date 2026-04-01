// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readUsers, verifyPassword } from '@/lib/db'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as {
      username?: string
      password?: string
    }

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' },
        { status: 400 }
      )
    }

    const users = await readUsers()
    const user = users.find(u => u.username === username)

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.' },
        { status: 403 }
      )
    }

    await createSession(user)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        sellerId: user.sellerId,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    )
  }
}
