import type {
  AuthResponse,
  AvatarInput,
  LoginInput,
  PasswordChangeInput,
  ProfileUpdateInput,
  SessionResponse,
  SignupInput,
  User,
} from '@/contracts/auth'
import type { AddCartItemInput, Cart, NetworkId, Quote } from '@/contracts/cart'
import type { CatalogSearch, FavoritesResponse, NftDetail, NftListResponse, NftSummary } from '@/contracts/nft'
import type { CreateOrderInput, Order } from '@/contracts/orders'
import type { Wallet, WalletConnection, WalletCreateInput, WalletUpdateInput } from '@/contracts/wallets'
import { http } from './client'

/**
 * Funções REST tipadas, uma por operação. Recebem `signal` quando são
 * consultas: o TanStack Query cancela a requisição se ela ficar obsoleta.
 */
type Opts = { signal?: AbortSignal }

export interface WalletWithConnection extends Wallet {
  connected: boolean
}

export const api = {
  auth: {
    signup: (input: SignupInput) => http.post<AuthResponse>('/auth/signup', input).then((r) => r.data),
    login: (input: LoginInput) => http.post<AuthResponse>('/auth/login', input).then((r) => r.data),
    session: ({ signal }: Opts = {}) => http.get<SessionResponse>('/auth/session', { signal }).then((r) => r.data),
    logout: () => http.post('/auth/logout').then(() => undefined),
  },

  nfts: {
    list: (search: CatalogSearch, { signal }: Opts = {}) =>
      http
        .get<NftListResponse>('/nfts', {
          signal,
          params: search,
          // category=art&category=music (formato que a API espera para listas)
          paramsSerializer: { indexes: null },
        })
        .then((r) => r.data),
    featured: ({ signal }: Opts = {}) => http.get<NftSummary[]>('/nfts/featured', { signal }).then((r) => r.data),
    detail: (id: string, { signal }: Opts = {}) => http.get<NftDetail>(`/nfts/${id}`, { signal }).then((r) => r.data),
  },

  favorites: {
    list: ({ signal }: Opts = {}) => http.get<FavoritesResponse>('/favorites', { signal }).then((r) => r.data),
    add: (nftId: string) => http.put<FavoritesResponse>(`/favorites/${nftId}`).then((r) => r.data),
    remove: (nftId: string) => http.delete<FavoritesResponse>(`/favorites/${nftId}`).then((r) => r.data),
  },

  cart: {
    get: ({ signal }: Opts = {}) => http.get<Cart>('/cart', { signal }).then((r) => r.data),
    add: (input: AddCartItemInput) => http.post<Cart>('/cart/items', input).then((r) => r.data),
    update: (editionId: string, quantity: number) =>
      http.patch<Cart>(`/cart/items/${editionId}`, { quantity }).then((r) => r.data),
    remove: (editionId: string) => http.delete<Cart>(`/cart/items/${editionId}`).then((r) => r.data),
    applyCoupon: (code: string) => http.put<Cart>('/cart/coupon', { code }).then((r) => r.data),
    removeCoupon: () => http.delete<Cart>('/cart/coupon').then((r) => r.data),
    quote: (network: NetworkId, { signal }: Opts = {}) =>
      http.post<Quote>('/cart/quote', { network }, { signal }).then((r) => r.data),
  },

  orders: {
    create: (input: CreateOrderInput, idempotencyKey: string) =>
      http
        .post<Order>('/orders', input, {
          headers: { 'Idempotency-Key': idempotencyKey },
          timeout: 8_000,
        })
        .then((r) => r.data),
    list: ({ signal }: Opts = {}) => http.get<Order[]>('/orders', { signal }).then((r) => r.data),
    get: (id: string, { signal }: Opts = {}) => http.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),
  },

  profile: {
    get: ({ signal }: Opts = {}) => http.get<User>('/profile', { signal }).then((r) => r.data),
    update: (input: ProfileUpdateInput) => http.patch<User>('/profile', input).then((r) => r.data),
    setAvatar: (input: AvatarInput) => http.put<User>('/profile/avatar', input).then((r) => r.data),
    removeAvatar: () => http.delete<User>('/profile/avatar').then((r) => r.data),
    changePassword: (input: PasswordChangeInput) => http.post('/profile/password', input).then(() => undefined),
  },

  wallets: {
    list: ({ signal }: Opts = {}) => http.get<WalletWithConnection[]>('/wallets', { signal }).then((r) => r.data),
    create: (input: WalletCreateInput) => http.post<Wallet>('/wallets', input).then((r) => r.data),
    update: (id: string, input: WalletUpdateInput) => http.patch<Wallet>(`/wallets/${id}`, input).then((r) => r.data),
    remove: (id: string) => http.delete(`/wallets/${id}`).then(() => undefined),
    connect: (id: string) => http.post<WalletConnection>(`/wallets/${id}/connect`).then((r) => r.data),
    disconnect: (id: string) => http.delete<WalletConnection>(`/wallets/${id}/connection`).then((r) => r.data),
  },
}
