import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  type ParsedLocation,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { catalogSearchSchema } from '@/contracts/nft'
import { activeToken, sessionStore } from '@/lib/session/store'
import { RootLayout } from './RootLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { HomePage } from '@/pages/HomePage'

export interface RouterContext {
  queryClient: QueryClient
}

/**
 * Rotas privadas: sem sessão válida, vai para o login levando o endereço
 * atual em `redirect`, para voltar ao mesmo ponto depois de entrar.
 */
function requireAuth({ location }: { location: ParsedLocation }) {
  if (!activeToken(sessionStore.get())) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Busca, filtros, ordenação e página vivem na URL e são validados aqui.
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: lazyRouteComponent(() => import('@/pages/NftDetailPage'), 'NftDetailPage'),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('@/pages/CartPage'), 'CartPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/pages/CheckoutPage'), 'CheckoutPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/pages/OrderPage'), 'OrderPage'),
})

const authSearch = z.object({ redirect: z.string().optional() })

/** Quem já está logado não precisa ver login/cadastro: segue para o destino. */
function redirectIfAuthenticated({ search }: { search: { redirect?: string } }) {
  if (activeToken(sessionStore.get())) {
    const target = search.redirect?.startsWith('/') && !search.redirect.startsWith('//') ? search.redirect : '/'
    throw redirect({ href: target })
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: authSearch,
  beforeLoad: redirectIfAuthenticated,
  component: lazyRouteComponent(() => import('@/pages/LoginPage'), 'LoginPage'),
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  validateSearch: authSearch,
  beforeLoad: redirectIfAuthenticated,
  component: lazyRouteComponent(() => import('@/pages/SignupPage'), 'SignupPage'),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/pages/ProfilePage'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/pages/WalletsPage'), 'WalletsPage'),
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  signupRoute,
  profileRoute,
  walletsRoute,
])

// Só a página inicial vai no pacote principal; as demais carregam sob demanda.
export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
