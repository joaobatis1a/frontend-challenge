import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Quote } from '@/contracts/cart'
import { isTerminalOrder, type CreateOrderInput, type Order } from '@/contracts/orders'
import { api } from '@/lib/api/endpoints'
import { toApiError } from '@/lib/api/errors'
import { keys } from '@/lib/query/keys'
import { useOwner } from '@/features/auth/hooks'

/**
 * Tentativa de compra em andamento, salva no sessionStorage:
 *   - `key`: chave de idempotência enviada no cabeçalho Idempotency-Key;
 *   - `payload`: o conteúdo enviado com essa chave;
 *   - `orderId`: preenchido quando a API confirma a criação.
 *
 * Cliques repetidos, novas tentativas após timeout e refresh da página reusam
 * a mesma chave, então a API devolve o mesmo pedido em vez de criar outro.
 * Se o conteúdo mudar (nova cotação), uma nova chave é gerada.
 */
export interface OrderAttempt {
  key: string
  payload: CreateOrderInput
  orderId: string | null
}

const attemptKey = (owner: string) => `checkout-attempt:${owner}`

export const orderAttempts = {
  load(owner: string): OrderAttempt | null {
    try {
      const raw = sessionStorage.getItem(attemptKey(owner))
      return raw ? (JSON.parse(raw) as OrderAttempt) : null
    } catch {
      return null
    }
  },
  save(owner: string, attempt: OrderAttempt): void {
    try {
      sessionStorage.setItem(attemptKey(owner), JSON.stringify(attempt))
    } catch {
      // ignorado: sem sessionStorage a proteção vale só enquanto a página estiver aberta
    }
  },
  clear(owner: string): void {
    try {
      sessionStorage.removeItem(attemptKey(owner))
    } catch {
      // ignorado
    }
  },
}

const samePayload = (a: CreateOrderInput, b: CreateOrderInput) => JSON.stringify(a) === JSON.stringify(b)

/** Quantas vezes reenviar, com a mesma chave, após timeout ou queda de rede. */
const MAX_SAFE_RETRIES = 2

export function useCreateOrder() {
  const qc = useQueryClient()
  const owner = useOwner()

  return useMutation({
    mutationFn: async (payload: CreateOrderInput): Promise<Order> => {
      const previous = orderAttempts.load(owner)
      const attempt: OrderAttempt =
        previous && samePayload(previous.payload, payload)
          ? previous
          : { key: crypto.randomUUID(), payload, orderId: null }
      orderAttempts.save(owner, attempt)

      for (let tryNumber = 0; ; tryNumber += 1) {
        try {
          const order = await api.orders.create(payload, attempt.key)
          orderAttempts.save(owner, { ...attempt, orderId: order.id })
          return order
        } catch (error) {
          const apiError = toApiError(error)
          // Reenviar é seguro: a chave de idempotência impede pedido duplicado.
          if (apiError.isTransient && tryNumber < MAX_SAFE_RETRIES) continue
          // Valores mudaram: a próxima confirmação terá outro conteúdo e outra chave.
          if (apiError.code === 'quote_outdated' || apiError.code === 'availability_conflict') {
            orderAttempts.clear(owner)
            const quote = apiError.details.quote as Quote | undefined
            if (quote) qc.setQueryData(keys.quote(owner, quote.network), quote)
            void qc.invalidateQueries({ queryKey: keys.cart(owner) })
          }
          throw apiError
        }
      }
    },
    onSuccess: (order) => {
      qc.setQueryData(keys.order(owner, order.id), order)
      void qc.invalidateQueries({ queryKey: keys.cart(owner) })
      void qc.invalidateQueries({ queryKey: keys.orders(owner), exact: true })
    },
  })
}

/**
 * Estado do pedido. A fonte principal é o evento `order.updated` (Socket.IO);
 * enquanto estiver pendente, uma consulta a cada 5 s cobre quedas do socket.
 */
export function useOrder(id: string) {
  const owner = useOwner()
  return useQuery({
    queryKey: keys.order(owner, id),
    queryFn: ({ signal }) => api.orders.get(id, { signal }),
    refetchInterval: (query) => {
      const order = query.state.data
      return order && !isTerminalOrder(order.status) ? 5_000 : false
    },
  })
}

export function useOrders() {
  const owner = useOwner()
  return useQuery({
    queryKey: keys.orders(owner),
    queryFn: ({ signal }) => api.orders.list({ signal }),
  })
}
