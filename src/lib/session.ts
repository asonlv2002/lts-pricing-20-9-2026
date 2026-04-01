// src/lib/session.ts
// ─────────────────────────────────────────────────────────────────────────────
// JWT-based session management using jose.
// Server-only — never import this in client components.
// ─────────────────────────────────────────────────────────────────────────────
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AppUser } from './types'

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'lts-pricing-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(SESSION_SECRET)
const SESSION_COOKIE = 'lts_session'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 giờ (ms)

// ── Payload shape stored inside the JWT ───────────────────────────────────────
export interface SessionPayload {
  userId: string
  username: string
  role: 'admin' | 'sale' | 'purchase'
  displayName: string
  sellerId?: string
}

// ── Encrypt: sign a JWT ────────────────────────────────────────────────────────
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + SESSION_DURATION)
    .sign(encodedKey)
}

// ── Decrypt: verify + decode a JWT ───────────────────────────────────────────
export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ── createSession: sign JWT and set HttpOnly cookie ───────────────────────────
export async function createSession(
  user: Pick<AppUser, 'id' | 'username' | 'role' | 'displayName' | 'sellerId'>
): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    sellerId: user.sellerId,
  }
  const token = await encrypt(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // seconds
    path: '/',
  })
}

// ── getSession: read and verify session cookie ────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decrypt(token)
}

// ── deleteSession: clear the session cookie ───────────────────────────────────
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
