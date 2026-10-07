import { http, HttpResponse } from 'msw'
import { MAX_QUANTITY_PER_LINE } from '@/contracts/cart'
import type { AuthResponse, SessionResponse } from '@/contracts/auth'
import { loginSchema, signupSchema } from '@/contracts/auth'
import { commit, getDb, newSession, nextId, publicUser, type DbCart } from '../db'
import { hashPassword } from '../crypto'
import { apiError, gate, parseBody, readJson, readToken, requireAuth } from '../http-utils'

/** Junta o carrinho do visitante ao da conta, somando quantidades até o limite por linha. */
export function mergeGuestCart(guestCartId: string | undefined, userId: string): void {
  if (!guestCartId) return
  const db = getDb()
  const guest = db.carts[guestCartId]
  if (!guest) return
  const target: DbCart = db.carts[userId] ?? { id: userId, lines: [], couponCode: null, version: 1 }
  for (const line of guest.lines) {
    const existing = target.lines.find((l) => l.editionId === line.editionId)
    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY_PER_LINE, existing.quantity + line.quantity)
    } else {
      target.lines.push({ ...line })
    }
  }
  target.couponCode = target.couponCode ?? guest.couponCode
  target.version += 1
  db.carts[userId] = target
  delete db.carts[guestCartId]
  commit()
}

function usernameFrom(email: string): string {
  const base = (email.split('@')[0] ?? 'colecionador').toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const taken = new Set(getDb().users.map((u) => u.username))
  let candidate = base.length >= 3 ? base : `${base}_user`
  let n = 1
  while (taken.has(candidate)) {
    n += 1
    candidate = `${base}_${n}`
  }
  return candidate
}

export const authHandlers = [
  http.post('/api/auth/signup', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const parsed = parseBody(signupSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const { name, email, password, guestCartId } = parsed.data

    const db = getDb()
    if (db.users.some((u) => u.email === email)) {
      return apiError('email_taken', 'Este e-mail já está cadastrado.', {
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      })
    }
    const salt = `salt-${nextId('guest')}-${Date.now()}`
    const user = {
      id: `user-${Date.now().toString(36)}`,
      name,
      email,
      username: usernameFrom(email),
      bio: '',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(password, salt),
    }
    db.users.push(user)
    db.wallets[user.id] = []
    db.favorites[user.id] = []
    const session = newSession(user.id)
    mergeGuestCart(guestCartId, user.id)
    commit()
    const body: AuthResponse = { user: publicUser(user), token: session.token, expiresAt: session.expiresAt }
    return HttpResponse.json(body, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const parsed = parseBody(loginSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const { email, password, guestCartId } = parsed.data

    const user = getDb().users.find((u) => u.email === email)
    const ok = user && (await hashPassword(password, user.salt)) === user.passwordHash
    if (!user || !ok) return apiError('invalid_credentials', 'E-mail ou senha incorretos.')

    const session = newSession(user.id)
    mergeGuestCart(guestCartId, user.id)
    const body: AuthResponse = { user: publicUser(user), token: session.token, expiresAt: session.expiresAt }
    return HttpResponse.json(body)
  }),

  http.get('/api/auth/session', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const body: SessionResponse = { user: publicUser(auth.user), expiresAt: auth.session.expiresAt }
    return HttpResponse.json(body)
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const token = readToken(request)
    const db = getDb()
    db.sessions = db.sessions.filter((s) => s.token !== token)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),
]
