import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import { cartItemCount, useCart } from '@/features/cart/hooks'
import { comingSoon } from './comingSoon'

const item = 'grid size-11 place-items-center rounded-full text-muted-foreground data-[active=true]:text-brand'

/** Barra de navegação inferior do mobile (frame "Início" mobile). */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: cart } = useCart()
  const count = cartItemCount(cart)

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 h-[72px] rounded-t-3xl border-t border-border bg-card md:hidden"
    >
      <ul className="mx-auto flex h-full max-w-md items-center justify-around px-4">
        <li>
          <Link to="/" className={item} data-active={pathname === '/'} aria-label="Início">
            <Home className="size-5" aria-hidden />
          </Link>
        </li>
        <li>
          <Link to="/profile" hash="favoritos" className={item} aria-label="Favoritos">
            <Heart className="size-5" aria-hidden />
          </Link>
        </li>
        <li className="-mt-10">
          <button
            type="button"
            onClick={() => comingSoon('A leitura de QR Code')}
            className="grid size-16 place-items-center rounded-full border-4 border-background bg-gradient-to-br from-[#e0a06a] to-[#a8683a] text-primary-foreground"
            aria-label="Ler QR Code"
          >
            <ScanLine className="size-6" aria-hidden />
          </button>
        </li>
        <li>
          <Link
            to="/cart"
            className={`${item} relative`}
            data-active={pathname === '/cart'}
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingCart className="size-5" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute top-1 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
              >
                {count}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link to="/profile" className={item} data-active={pathname === '/profile' || pathname === '/wallets'} aria-label="Perfil">
            <UserRound className="size-5" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
