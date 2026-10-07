import type { Order } from '@/contracts/orders'
import type { Wallet } from '@/contracts/wallets'
import type { User } from '@/contracts/auth'
import { hashPassword, randomToken } from './crypto'
import {
  SEED_FAVORITES,
  SEED_USERS,
  SEED_WALLETS,
  buildSeedNfts,
  type SeedNft,
} from './seed'

const STORAGE_KEY = 'mock:db:v1'

export interface DbUser extends User {
  salt: string
  passwordHash: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string
}

export interface DbCartLine {
  nftId: string
  editionId: string
  quantity: number
}

export interface DbCart {
  id: string
  lines: DbCartLine[]
  couponCode: string | null
  version: number
}

export interface DbOrder extends Order {
  userId: string
  /** Quando o pedido pendente deve ser resolvido (epoch ms). */
  settleAt: number | null
}

export interface DbIdempotencyRecord {
  requestHash: string
  orderId: string
}

export interface Db {
  users: DbUser[]
  sessions: DbSession[]
  nfts: SeedNft[]
  favorites: Record<string, string[]>
  carts: Record<string, DbCart>
  wallets: Record<string, Wallet[]>
  connectedWallets: Record<string, string[]>
  orders: DbOrder[]
  idempotency: Record<string, DbIdempotencyRecord>
  counters: { order: number; wallet: number; event: number; guest: number }
}

let db: Db | null = null

async function buildInitialDb(): Promise<Db> {
  const users: DbUser[] = []
  for (const seed of SEED_USERS) {
    const salt = `salt-${seed.id}`
    users.push({
      id: seed.id,
      name: seed.name,
      email: seed.email,
      username: seed.username,
      bio: seed.bio,
      avatarUrl: null,
      createdAt: '2026-08-01T12:00:00.000Z',
      salt,
      passwordHash: await hashPassword(seed.password, salt),
    })
  }
  return {
    users,
    sessions: [],
    nfts: buildSeedNfts(),
    favorites: structuredClone(SEED_FAVORITES),
    carts: {},
    wallets: structuredClone(SEED_WALLETS),
    connectedWallets: {},
    orders: [],
    idempotency: {},
    counters: { order: 0, wallet: 10, event: 0, guest: 0 },
  }
}

function load(): Db | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Db) : null
  } catch {
    return null
  }
}

/** Prepara o banco: restaura do localStorage ou semeia do zero. */
export async function initDb(): Promise<Db> {
  db = load() ?? (await buildInitialDb())
  commit()
  return db
}

export function getDb(): Db {
  if (!db) throw new Error('Banco simulado não inicializado')
  return db
}

/** Persiste o estado. Chamado após cada mutação. */
export function commit(): void {
  if (!db) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Sem localStorage (modo privado): o estado vale só enquanto a aba existir.
  }
}

export async function resetDb(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorado
  }
  db = await buildInitialDb()
  commit()
}

export function nextId(kind: 'order' | 'wallet' | 'event' | 'guest'): number {
  const d = getDb()
  d.counters[kind] += 1
  return d.counters[kind]
}

export function newSession(userId: string, ttlMs = 60 * 60 * 1000): DbSession {
  const session: DbSession = {
    token: randomToken(),
    userId,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  }
  getDb().sessions.push(session)
  commit()
  return session
}

export function publicUser(user: DbUser): User {
  const { salt: _salt, passwordHash: _hash, ...rest } = user
  return rest
}
