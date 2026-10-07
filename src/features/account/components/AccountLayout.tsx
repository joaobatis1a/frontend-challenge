import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Download, Heart, LineChart, LogOut, MapPin, ShoppingCart, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Container } from '@/components/layout/Container'
import { comingSoon } from '@/components/layout/comingSoon'
import { useLogout } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'

// No mobile vira uma faixa horizontal; no desktop, a lista vertical do layout.
const item =
  'flex w-full items-center gap-3 whitespace-nowrap border-b-4 border-transparent px-4 py-3 text-sm text-brand hover:bg-secondary md:border-b-0 md:border-l-4 aria-[current=page]:border-primary aria-[current=page]:bg-secondary/40'

/** Menu lateral "Meu perfil" compartilhado por Perfil e Carteiras. */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()

  // mutateAsync: o aviso e a navegação acontecem mesmo que este componente desmonte no meio.
  const signOut = async () => {
    await logout.mutateAsync().catch(() => undefined)
    toast.success('Você saiu da sua conta.')
    void navigate({ to: '/' })
  }

  return (
    <Container className="grid gap-8 py-8 md:grid-cols-[310px_1fr] md:gap-7">
      <nav aria-label="Meu perfil" className="min-w-0 self-start rounded bg-card md:py-4">
        <h2 className="hidden px-3 pb-2 text-lg font-bold md:block">Meu perfil</h2>
        <ul className="flex overflow-x-auto md:flex-col">
          <li>
            <Link to="/profile" className={item} activeOptions={{ includeHash: true }}>
              <UserRound className="size-4" aria-hidden /> Dados do perfil
            </Link>
          </li>
          <li>
            <Link to="/wallets" className={item} activeOptions={{ includeHash: true }}>
              <MapPin className="size-4" aria-hidden /> Carteiras
            </Link>
          </li>
          <li>
            <Link to="/profile" hash="atividade" className={item} activeOptions={{ includeHash: true }}>
              <ShoppingCart className="size-4" aria-hidden /> Atividade
            </Link>
          </li>
          <li>
            <Link to="/profile" hash="favoritos" className={item} activeOptions={{ includeHash: true }}>
              <Heart className="size-4" aria-hidden /> Lista de interesse
            </Link>
          </li>
          <li>
            <button type="button" className={item} onClick={() => comingSoon('A área de ofertas')}>
              <LineChart className="size-4" aria-hidden /> Ofertas
            </button>
          </li>
          <li>
            <button type="button" className={item} onClick={() => comingSoon('A área de arquivos baixados')}>
              <Download className="size-4" aria-hidden /> Arquivos baixados
            </button>
          </li>
          <li>
            <button type="button" className={item} onClick={() => comingSoon('O suporte')}>
              <AlertTriangle className="size-4" aria-hidden /> Suporte
            </button>
          </li>
          <li className="md:mt-1 md:border-t md:border-border md:pt-1">
            <button type="button" className={cn(item, 'font-bold')} onClick={() => void signOut()} disabled={logout.isPending}>
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">
        <h1 className="mb-6 font-bold">{title}</h1>
        {children}
      </div>
    </Container>
  )
}
