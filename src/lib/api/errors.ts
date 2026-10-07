import axios from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts/errors'

export type ClientErrorCode = ApiErrorCode | 'network_error' | 'timeout' | 'unknown'

/**
 * Erro único usado em toda a interface. Converte as três formas de falha
 * (resposta da API, queda de rede e timeout) em um só formato.
 */
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string>
  readonly details: Record<string, unknown>

  constructor(code: ClientErrorCode, message: string, status: number | null, body?: Partial<ApiErrorBody>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = body?.fieldErrors ?? {}
    this.details = body?.details ?? {}
  }

  /** Falhas em que tentar de novo pode funcionar (rede, timeout, 5xx, 429). */
  get isTransient(): boolean {
    return (
      this.code === 'network_error' ||
      this.code === 'timeout' ||
      this.code === 'transient_failure' ||
      this.code === 'server_error' ||
      (this.status !== null && (this.status >= 500 || this.status === 429))
    )
  }

  get isAuthError(): boolean {
    return this.code === 'unauthenticated' || this.code === 'session_expired'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'O servidor demorou para responder.', null)
    }
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    if (error.response && body?.code) {
      return new ApiError(body.code, body.message ?? 'Erro inesperado.', error.response.status, body)
    }
    if (error.response) {
      return new ApiError('unknown', `Erro HTTP ${error.response.status}.`, error.response.status)
    }
    return new ApiError('network_error', 'Sem conexão com o servidor. Verifique sua internet.', null)
  }
  return new ApiError('unknown', error instanceof Error ? error.message : 'Erro inesperado.', null)
}

/** Mensagem amigável para exibir em toasts e alertas. */
export const errorMessage = (error: unknown): string => toApiError(error).message
