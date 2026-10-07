import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, LoginInput, SignupInput } from '@/contracts/auth'
import { api } from '@/lib/api/endpoints'
import { keys } from '@/lib/query/keys'
import { activeToken, cacheOwner, getGuestCartId, sessionStore, useSession } from '@/lib/session/store'

/** Dono atual do cache (`user:<id>` ou `guest:<id>`). */
export function useOwner(): string {
  return cacheOwner(useSession())
}

export function useAuth() {
  const session = useSession()
  const token = activeToken(session)
  return {
    user: token ? session.user : null,
    isAuthenticated: Boolean(token && session.user),
    /** A sessão existia e a API a recusou: precisa entrar de novo. */
    isExpired: session.expired,
  }
}

function onAuthenticated(data: AuthResponse) {
  sessionStore.signIn(data.token, data.user, data.expiresAt)
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: Omit<LoginInput, 'guestCartId'>) =>
      // O carrinho do visitante vai junto para a API mesclar com o da conta.
      api.auth.login({ ...input, guestCartId: getGuestCartId() }),
    onSuccess: onAuthenticated,
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: (input: Omit<SignupInput, 'guestCartId'>) =>
      api.auth.signup({ ...input, guestCartId: getGuestCartId() }),
    onSuccess: onAuthenticated,
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Mesmo se a API falhar, a sessão local é encerrada.
      await api.auth.logout().catch(() => undefined)
    },
    onSettled: () => sessionStore.signOut(),
  })
}

/**
 * Confere a sessão salva ao abrir o app (recuperação após refresh). Se a API
 * responder `session_expired`, o interceptor do Axios marca a sessão como expirada.
 */
export function useSessionCheck() {
  const session = useSession()
  const token = activeToken(session)
  const owner = cacheOwner(session)
  const query = useQuery({
    queryKey: keys.session(owner),
    queryFn: ({ signal }) => api.auth.session({ signal }),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })
  useEffect(() => {
    if (query.data) sessionStore.updateUser(query.data.user)
  }, [query.data])
  return query
}

/**
 * Ao trocar de dono (login, logout, troca de usuário ou expiração), remove do
 * cache tudo que pertencia ao dono anterior. As chaves privadas começam com o
 * dono, então basta um `removeQueries` pelo prefixo.
 */
export function usePrivateCacheCleanup() {
  const qc = useQueryClient()
  const owner = useOwner()
  const previous = useRef(owner)
  useEffect(() => {
    if (previous.current !== owner) {
      qc.removeQueries({ queryKey: [previous.current] })
      previous.current = owner
    }
  }, [owner, qc])
}
