import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { usePrivateCacheCleanup, useSessionCheck } from '@/features/auth/hooks'
import { useRealtime, useRealtimeNotice } from '@/lib/realtime/RealtimeProvider'
import { useSession } from '@/lib/session/store'

/** Avisos de tempo real viram toasts (o Sonner anuncia em uma região aria-live). */
function useRealtimeToasts() {
  useRealtimeNotice((notice) => {
    if (notice.kind === 'cart-changed') {
      toast.warning('Preço ou disponibilidade mudou no seu carrinho', {
        id: 'cart-changed',
        description: `${notice.names.join(', ')}. O resumo foi atualizado.`,
      })
    } else if (notice.status === 'confirmed') {
      toast.success(`Pedido ${notice.orderId} confirmado`, { id: `order-${notice.orderId}` })
    } else if (notice.status === 'rejected') {
      toast.error(`Pagamento do pedido ${notice.orderId} recusado`, { id: `order-${notice.orderId}` })
    }
  })
}

/**
 * Sessão expirada durante a navegação: leva ao login guardando onde o usuário
 * estava (`redirect`). O que ele preencheu no checkout fica no sessionStorage.
 */
function useSessionExpiryRedirect() {
  const { expired } = useSession()
  const navigate = useNavigate()
  const { pathname, href } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, href: s.location.href }),
  })
  const handled = useRef(false)

  useEffect(() => {
    if (!expired) {
      handled.current = false
      return
    }
    if (handled.current || pathname === '/login' || pathname === '/signup') return
    handled.current = true
    toast.error('Sua sessão expirou. Entre novamente para continuar de onde parou.', { id: 'session-expired' })
    void navigate({ to: '/login', search: { redirect: href } })
  }, [expired, pathname, href, navigate])
}

function ConnectionStatus() {
  const { status } = useRealtime()
  if (status !== 'reconnecting') return null
  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary bg-card px-4 py-1.5 text-xs text-brand shadow"
    >
      Reconectando ao tempo real…
    </div>
  )
}

export function RootLayout() {
  useSessionCheck()
  usePrivateCacheCleanup()
  useRealtimeToasts()
  useSessionExpiryRedirect()

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="min-h-dvh outline-none">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <ConnectionStatus />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
