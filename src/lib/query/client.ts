import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/api/errors'

/**
 * Política de cache e retries (documentada no ARCHITECTURE.md):
 * - staleTime de 30 s: o catálogo muda pouco e o tempo real cobre preço/estoque.
 * - Consultas: até 2 novas tentativas, só para falhas transitórias (rede, 5xx).
 *   Erros 4xx (validação, 404, sessão) não melhoram tentando de novo.
 * - Mutations: nunca repetem sozinhas. Repetir uma escrita sem idempotência
 *   poderia duplicar a operação; o usuário decide quando tentar de novo.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => failureCount < 2 && toApiError(error).isTransient,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3_000),
      },
      mutations: { retry: false },
    },
  })
}
