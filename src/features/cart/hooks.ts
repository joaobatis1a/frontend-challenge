import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemInput, Cart, NetworkId } from '@/contracts/cart'
import { api } from '@/lib/api/endpoints'
import { keys } from '@/lib/query/keys'
import { useOwner } from '@/features/auth/hooks'

/** Carrinho do dono atual (conta ou visitante). Persistido na API simulada. */
export function useCart() {
  const owner = useOwner()
  return useQuery({
    queryKey: keys.cart(owner),
    queryFn: ({ signal }) => api.cart.get({ signal }),
  })
}

/**
 * Toda mutation do carrinho devolve o carrinho atualizado: gravamos direto no
 * cache e invalidamos as cotações, que dependem dele.
 */
function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>) {
  const qc = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      qc.setQueryData(keys.cart(owner), cart)
      void qc.invalidateQueries({ queryKey: keys.quotes(owner) })
    },
  })
}

export const useAddToCart = () => useCartMutation((input: AddCartItemInput) => api.cart.add(input))

export const useUpdateCartItem = () =>
  useCartMutation(({ editionId, quantity }: { editionId: string; quantity: number }) =>
    api.cart.update(editionId, quantity),
  )

export const useRemoveCartItem = () => useCartMutation((editionId: string) => api.cart.remove(editionId))

export const useApplyCoupon = () => useCartMutation((code: string) => api.cart.applyCoupon(code))

export const useRemoveCoupon = () => useCartMutation((_: void) => api.cart.removeCoupon())

/**
 * Cotação: subtotal, desconto, taxa de rede e total calculados pela API.
 * Nunca fica "fresca" no cache: é a referência para fechar o pedido.
 */
export function useQuote(network: NetworkId, enabled = true) {
  const owner = useOwner()
  return useQuery({
    queryKey: keys.quote(owner, network),
    queryFn: ({ signal }) => api.cart.quote(network, { signal }),
    enabled,
    staleTime: 0,
  })
}

export const cartItemCount = (cart: Cart | undefined): number =>
  cart?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0
