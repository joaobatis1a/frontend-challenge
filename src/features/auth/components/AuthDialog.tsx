import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Container } from '@/components/layout/Container'
import { comingSoon } from '@/components/layout/comingSoon'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { HeroDesktop } from '@/features/catalog/components/HomeSections'
import { cn } from '@/lib/utils'

/** Só aceita caminhos internos (evita redirecionar para outro site). */
export const safeRedirect = (redirect: string | undefined): string =>
  redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'

interface AuthDialogProps {
  mode: 'login' | 'signup'
  description: string
  redirect: string | undefined
  children: ReactNode
}

/**
 * Login e cadastro abrem como modal sobre o hero da página inicial (desktop)
 * e como tela cheia no mobile, como nos frames do Figma. O Dialog do shadcn
 * (Radix) prende o foco dentro do modal e o devolve ao fechar.
 */
export function AuthDialog({ mode, description, redirect, children }: AuthDialogProps) {
  const navigate = useNavigate()
  const close = () => void navigate({ to: '/' })

  return (
    <>
      {/* Fundo decorativo: inert = fora da ordem de foco e da árvore de acessibilidade */}
      <div inert className="hidden md:block">
        <Container>
          <HeroDesktop />
        </Container>
      </div>
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          className={cn(
            'gap-0 border-0 bg-card p-0 shadow-2xl sm:max-w-[500px]',
            // Mobile: tela cheia
            'max-md:inset-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:bg-background',
            'md:rounded-none md:border-b-[10px] md:border-primary',
          )}
        >
          <div className="overflow-y-auto px-7 pt-14 pb-10 md:px-20 md:pt-12">
            <p className="mb-12 text-center text-4xl font-bold tracking-widest md:hidden" aria-hidden>
              KURIO
            </p>
            <DialogTitle className="flex justify-center gap-2 text-center text-lg font-normal tracking-wider">
              <span className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
              <span aria-hidden className="flex gap-2">
                <Link
                  to="/login"
                  search={{ redirect }}
                  className={cn(mode === 'login' ? 'text-brand' : 'hidden md:inline')}
                  tabIndex={-1}
                >
                  Entrar
                </Link>
                <span className="hidden border-l border-primary md:inline" />
                <Link
                  to="/signup"
                  search={{ redirect }}
                  className={cn(mode === 'signup' ? 'text-brand max-md:text-foreground' : 'hidden md:inline')}
                  tabIndex={-1}
                >
                  {mode === 'signup' ? <span className="md:hidden">Criar perfil de colecionador</span> : null}
                  <span className={cn(mode === 'signup' && 'max-md:hidden')}>Criar conta</span>
                </Link>
              </span>
            </DialogTitle>
            <DialogDescription className="mt-8 hidden text-center text-xs leading-4 text-foreground md:block">
              {description}
            </DialogDescription>
            <div className="mt-8">{children}</div>

            <div className="my-6 flex items-center gap-3 text-xs md:-mx-20">
              <span className="h-px flex-1 bg-border" />
              Ou continue com
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => comingSoon('O login com Google')}
                className="flex h-10 items-center justify-center gap-3 rounded border border-border text-xs text-muted-foreground hover:border-primary"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
                  <path fill="#34A853" d="M3.3 7.4l3.2 2.4C7.3 7.8 9.5 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 8.2 2.2 4.9 4.3 3.3 7.4Z" opacity=".9" />
                  <path fill="#FBBC05" d="M12 21.8c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-3.9 0-5.3-2.5-5.5-3.8l-3.2 2.5c1.6 3.1 4.9 5 8.7 5Z" opacity=".9" />
                </svg>
                Continuar com Google
              </button>
              <button
                type="button"
                onClick={() => comingSoon('O login com Facebook')}
                className="flex h-10 items-center justify-center gap-3 rounded border border-border text-xs text-muted-foreground hover:border-primary"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="#3b5998" aria-hidden>
                  <path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.7-.6Z" />
                </svg>
                Continuar com Facebook
              </button>
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Novo na Kurio?{' '}
                  <Link to="/signup" search={{ redirect }} className="text-brand underline-offset-4 hover:underline">
                    Crie uma conta
                  </Link>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <Link to="/login" search={{ redirect }} className="text-brand underline-offset-4 hover:underline">
                    Entre
                  </Link>
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
