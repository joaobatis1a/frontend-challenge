import type { NetworkId } from '@/contracts/cart'
import type { CatalogSearch } from '@/contracts/nft'

/**
 * Fábrica de chaves do TanStack Query.
 *
 * - Dados públicos (catálogo) começam com 'nfts'.
 * - Dados privados começam com o dono (`user:<id>` ou `guest:<id>`). Assim,
 *   ao trocar de usuário, as consultas mudam de chave e nunca mostram dados
 *   do anterior; no logout basta remover tudo que começa com o dono antigo.
 */
export const keys = {
  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (search: CatalogSearch) => ['nfts', 'list', search] as const,
    featured: () => ['nfts', 'featured'] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },

  session: (owner: string) => [owner, 'session'] as const,
  favorites: (owner: string) => [owner, 'favorites'] as const,
  cart: (owner: string) => [owner, 'cart'] as const,
  quote: (owner: string, network: NetworkId) => [owner, 'quote', network] as const,
  quotes: (owner: string) => [owner, 'quote'] as const,
  orders: (owner: string) => [owner, 'orders'] as const,
  order: (owner: string, id: string) => [owner, 'orders', id] as const,
  profile: (owner: string) => [owner, 'profile'] as const,
  wallets: (owner: string) => [owner, 'wallets'] as const,
}
