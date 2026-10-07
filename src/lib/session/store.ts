import { useSyncExternalStore } from 'react'
import type { User } from '@/contracts/auth'

/**
 * Sessão do usuário, guardada fora do React para que o Axios (interceptor)
 * e o socket possam ler o token sem depender de componentes.
 *
 * - `token`: enviado no cabeçalho Authorization.
 * - `expired`: a API respondeu `session_expired`; o usuário precisa entrar de
 *   novo, mas mantemos quem era para retomar o fluxo e limpar o cache certo.
 *
 * Só o token e os dados públicos do usuário vão para o localStorage (nunca a senha).
 */
export interface SessionState {
  token: string | null
  user: User | null
  expiresAt: string | null
  expired: boolean
}

const STORAGE_KEY = 'session:v1'
const GUEST_KEY = 'guest-cart-id'

const EMPTY: SessionState = { token: null, user: null, expiresAt: null, expired: false }

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as SessionState) } : EMPTY
  } catch {
    return EMPTY
  }
}

let state: SessionState = load()
const listeners = new Set<() => void>()

function setState(next: SessionState): void {
  state = next
  try {
    if (next.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem localStorage: a sessão vale só enquanto a aba estiver aberta.
  }
  for (const l of listeners) l()
}

export const sessionStore = {
  get: (): SessionState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  signIn(token: string, user: User, expiresAt: string): void {
    setState({ token, user, expiresAt, expired: false })
  },

  updateUser(user: User): void {
    if (state.user?.id !== user.id) return
    setState({ ...state, user })
  },

  /** A API disse que a sessão expirou: o token não vale mais. */
  markExpired(): void {
    if (!state.token || state.expired) return
    setState({ ...state, expired: true })
  },

  signOut(): void {
    setState(EMPTY)
    // Um novo carrinho de visitante, para não reaproveitar o da sessão anterior.
    resetGuestCartId()
  },
}

/** Identificador do carrinho do visitante (enviado em X-Guest-Cart-Id). */
export function getGuestCartId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = `guest-${crypto.randomUUID()}`
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    return fallbackGuestId
  }
}

const fallbackGuestId = `guest-${crypto.randomUUID()}`

function resetGuestCartId(): void {
  try {
    localStorage.removeItem(GUEST_KEY)
  } catch {
    // ignorado
  }
}

/** Token utilizável: existe e a API ainda não o recusou. */
export const activeToken = (s: SessionState = state): string | null =>
  s.token && !s.expired ? s.token : null

/**
 * Dono dos dados em cache. Toda chave privada do TanStack Query começa com
 * este valor, então dados de um usuário nunca aparecem para outro.
 */
export const cacheOwner = (s: SessionState = state): string =>
  activeToken(s) && s.user ? `user:${s.user.id}` : `guest:${getGuestCartId()}`

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}
