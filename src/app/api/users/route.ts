// src/app/api/users/route.ts
// Admin-only CRUD for user accounts.
import { NextRequest, NextResponse } from 'next/server'
import { readUsers, writeUsers, hashPassword } from '@/lib/db'
import { getSession } from '@/lib/session'
import type { AppUser } from '@/lib/types'

// ── Helper: require admin session ─────────────────────────────────────────────
async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// ── GET /api/users — list all users ──────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, message: 'Không có quyền.' }, { status: 403 })
  }
  const users = await readUsers()
  // Never expose passwordHash
  const safe = users.map(({ passwordHash: _, ...u }) => u)
  return NextResponse.json({ success: true, users: safe })
}

// ── POST /api/users — create user ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, message: 'Không có quyền.' }, { status: 403 })
  }
  const body = await request.json() as Partial<AppUser> & { password?: string }
  const { username, password, displayName, role, sellerId, active } = body

  if (!username || !password || !displayName || !role) {
    return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc.' }, { status: 400 })
  }

  const users = await readUsers()
  if (users.find(u => u.username === username)) {
    return NextResponse.json({ success: false, message: 'Tên đăng nhập đã tồn tại.' }, { status: 409 })
  }

  const maxId = users.reduce((max, u) => {
    const n = parseInt(u.id.replace(/\D/g, ''), 10)
    return n > max ? n : max
  }, 0)
  const newId = `U${String(maxId + 1).padStart(3, '0')}`

  const newUser: AppUser = {
    id: newId,
    username,
    passwordHash: hashPassword(password),
    displayName,
    role,
    sellerId: role === 'sale' ? (sellerId ?? undefined) : undefined,
    active: active !== false,
    createdAt: new Date().toISOString().slice(0, 10),
  }

  await writeUsers([...users, newUser])
  const { passwordHash: _, ...safe } = newUser
  return NextResponse.json({ success: true, user: safe }, { status: 201 })
}

// ── PATCH /api/users — update user ────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, message: 'Không có quyền.' }, { status: 403 })
  }
  const body = await request.json() as Partial<AppUser> & { id: string; password?: string }
  const { id, password, ...updates } = body

  if (!id) {
    return NextResponse.json({ success: false, message: 'Thiếu ID người dùng.' }, { status: 400 })
  }

  const users = await readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng.' }, { status: 404 })
  }

  const updated: AppUser = {
    ...users[idx],
    ...updates,
    // Only update passwordHash if a new password is provided
    ...(password ? { passwordHash: hashPassword(password) } : {}),
    id: users[idx].id,                // id is immutable
    username: users[idx].username,    // username is immutable
    createdAt: users[idx].createdAt,  // createdAt is immutable
  }
  users[idx] = updated
  await writeUsers(users)

  const { passwordHash: _, ...safe } = updated
  return NextResponse.json({ success: true, user: safe })
}

// ── DELETE /api/users — delete user ──────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ success: false, message: 'Không có quyền.' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ success: false, message: 'Thiếu ID.' }, { status: 400 })
  }
  if (id === session.userId) {
    return NextResponse.json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập.' }, { status: 400 })
  }

  const users = await readUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng.' }, { status: 404 })
  }

  await writeUsers(filtered)
  return NextResponse.json({ success: true })
}
