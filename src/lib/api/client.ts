import axios from 'axios'
import { activeToken, getGuestCartId, sessionStore } from '@/lib/session/store'
import { toApiError } from './errors'

/**
 * Instância única do Axios. Toda chamada REST passa por aqui.
 * Os mocks (MSW) interceptam na camada de rede: este arquivo não sabe que
 * eles existem.
 */
export const http = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Requisição: identifica quem chama (conta ou visitante).
http.interceptors.request.use((config) => {
  const token = activeToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set('X-Guest-Cart-Id', getGuestCartId())
  return config
})

// Resposta: normaliza erros e detecta sessão expirada.
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.code === 'session_expired') sessionStore.markExpired()
    return Promise.reject(apiError)
  },
)
