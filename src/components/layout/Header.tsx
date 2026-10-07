import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart, UserRound } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks'
import { cartItemCount, useCart } from '@/features/cart/hooks'
import { cn } from '@/lib/utils'
import { Container } from './Container'
import { comingSoon } from './comingSoon'

const navItem =
  'relative py-2 text-sm text-foreground transition-colors hover:text-brand data-[active=true]:font-semibold data-[active=true]:text-brand ' +
  'after:absolute after:inset-x-0 after:-bottom-[9px] after:h-0.5 after:bg-primary after:opacity-0 data-[active=true]:after:opacity-100'

/** Cabeçalho do desktop/tablet. No mobile a navegação fica na barra inferior. */
export function Header() {
  const { pathname, href } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, href: s.location.href }),
  })
  const { user, isAuthenticated } = useAuth()
  const { data: cart } = useCart()
  const count = cartItemCount(cart)
  const inMarket = /^\/(nft|cart|checkout|orders)/.test(pathname)

  return (
    <header className="hidden md:block">
      <Container className="flex h-[68px] items-center justify-between border-b border-border">
        <Link to="/" className="text-sm font-bold tracking-widest" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-8">
          <Link to="/" className={navItem} data-active={pathname === '/' && !inMarket}>
            Início
          </Link>
          <Link to="/" hash="mercado" className={navItem} data-active={inMarket}>
            Mercado
          </Link>
          <button type="button" className={navItem} onClick={() => comingSoon('A página de criadores')}>
            Criadores
          </button>
          <button type="button" className={navItem} onClick={() => comingSoon('A área Aprenda')}>
            Aprenda
          </button>
        </nav>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            hash="busca"
            className="rounded p-1 hover:text-brand"
            aria-label="Buscar NFTs"
          >
            <Search className="size-5" aria-hidden />
          </Link>
          <Link to="/cart" className="relative rounded p-1 hover:text-brand" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
            <ShoppingCart className="size-5" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
              >
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className={cn(
                'flex items-center gap-2 rounded border border-primary px-3 py-1.5 text-sm text-brand hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
              ) : (
                <UserRound className="size-4" aria-hidden />
              )}
              <span className="max-w-[140px] truncate">{user.username}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              // Volta para a página atual depois de entrar.
              search={{ redirect: pathname === '/login' ? undefined : href }}
              className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <LogIn className="size-4" aria-hidden />
              Entrar
            </Link>
          )}
        </div>
      </Container>
    </header>
  )
}
