import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { NETWORK_LABELS, NETWORKS, type NetworkId, type Quote } from '@/contracts/cart'
import { collectorSchema, type CollectorInput } from '@/contracts/orders'
import { Container } from '@/components/layout/Container'
import { Field, inputClass } from '@/components/forms/Field'
import { focusFirstError, useFormErrors } from '@/components/forms/useFormErrors'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth, useOwner } from '@/features/auth/hooks'
import { useCart, useQuote } from '@/features/cart/hooks'
import { QuoteSummary } from '@/features/cart/components/QuoteSummary'
import { useWallets } from '@/features/account/hooks'
import { orderAttempts, useCreateOrder } from '@/features/orders/hooks'
import { useCheckoutDraft } from '@/features/checkout/useCheckoutDraft'
import { WalletPicker } from '@/features/checkout/components/WalletPicker'
import { ReviewDialog } from '@/features/checkout/components/ReviewDialog'
import type { WalletWithConnection } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import { eth } from '@/lib/format'
import type { User } from '@/contracts/auth'

export function CheckoutPage() {
  const { user } = useAuth()
  // A rota já exige sessão; sem usuário (sessão expirando), o RootLayout leva ao login.
  if (!user) return <CheckoutSkeleton />
  return <Checkout user={user} />
}

function Checkout({ user }: { user: User }) {
  const owner = useOwner()
  const navigate = useNavigate()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const { draft, update, clear } = useCheckoutDraft(user)
  const { data: cart, isPending: cartPending } = useCart()
  const { data: wallets } = useWallets()
  const { errors, validate, setError } = useFormErrors(collectorSchema)
  const [walletError, setWalletError] = useState<string>()
  const [review, setReview] = useState<{ quote: Quote; collector: CollectorInput; wallet: WalletWithConnection } | null>(null)

  // Carteira padrão: a principal. Rede padrão: a da carteira escolhida.
  useEffect(() => {
    if (!wallets?.length || wallets.some((w) => w.id === draft.walletId)) return
    const primary = wallets.find((w) => w.isPrimary) ?? wallets[0]
    if (primary) update({ walletId: primary.id, network: draft.network || primary.network })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets])

  const network: NetworkId = draft.network || 'ethereum'
  const hasLines = Boolean(cart?.lines.length)
  const quote = useQuote(network, hasLines)
  const wallet = wallets?.find((w) => w.id === draft.walletId)

  // Tentativa anterior (refresh/timeout): retoma sem criar outro pedido.
  const attempt = orderAttempts.load(owner)
  const resume = useCreateOrder()

  const openReview = (e?: FormEvent) => {
    e?.preventDefault()
    const collector = validate({
      displayName: draft.displayName,
      username: draft.username,
      email: draft.email,
      note: draft.note || undefined,
    })
    let ok = Boolean(collector)
    if (!draft.network) {
      setError('network', 'Selecione uma rede')
      ok = false
    }
    if (!wallet) {
      setWalletError('Selecione uma carteira')
      ok = false
    } else if (!wallet.connected) {
      setWalletError('Conecte a carteira antes de confirmar')
      ok = false
    } else setWalletError(undefined)
    if (!ok || !collector || !wallet) {
      focusFirstError(formRef.current)
      return
    }
    if (!quote.data) return toast.error('Aguarde o cálculo dos valores.')
    if (quote.data.issues.length) return toast.error(quote.data.issues.map((i) => i.message).join(' '))
    setReview({ quote: quote.data, collector, wallet })
  }

  if (cartPending) return <CheckoutSkeleton />

  // Carrinho vazio sem tentativa em andamento: nada para pagar.
  if (!hasLines && !attempt) {
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-3 text-muted-foreground">Adicione NFTs ao carrinho para finalizar uma compra.</p>
        <Link to="/" hash="mercado" className="mt-6 inline-block rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground">
          Explorar NFTs
        </Link>
      </Container>
    )
  }

  return (
    <Container className="pb-12">
      <div className="flex items-center gap-4 pt-6 md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="grid size-9 place-items-center rounded-full bg-card"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-bold">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden pt-8 text-sm font-semibold md:block">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-brand">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/cart" className="hover:text-brand">
              Carrinho
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only max-md:hidden">Pagamento</h1>

      {attempt?.orderId && (
        <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded border border-primary bg-card p-4 text-sm">
          <span>Você tem um pedido em andamento ({attempt.orderId}).</span>
          <Link to="/orders/$orderId" params={{ orderId: attempt.orderId }} className="font-semibold text-brand underline">
            Acompanhar pedido
          </Link>
        </div>
      )}
      {attempt && !attempt.orderId && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded border border-primary bg-card p-4 text-sm">
          <span>Um envio anterior não teve resposta. Retome para recuperar o mesmo pedido, sem cobrança duplicada.</span>
          <button
            type="button"
            disabled={resume.isPending}
            onClick={() =>
              resume.mutate(attempt.payload, {
                onSuccess: (order) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
            className="flex items-center gap-2 rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {resume.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Retomar pedido
          </button>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={openReview}
        noValidate
        className="mt-6 grid gap-10 lg:grid-cols-[1fr_405px] lg:gap-8"
        aria-label="Pagamento"
      >
        <section aria-labelledby="collector-title">
          <h2 id="collector-title" className="mb-4 font-bold">
            Perfil do colecionador
          </h2>
          <div className="grid gap-5 md:grid-cols-2 md:gap-x-6">
            <Field label="Nome de exibição" required error={errors.displayName}>
              {(p) => (
                <input {...p} autoComplete="name" value={draft.displayName} onChange={(e) => update({ displayName: e.target.value })} className={inputClass} />
              )}
            </Field>
            <Field label="Nome de usuário" required error={errors.username}>
              {(p) => (
                <input {...p} autoComplete="username" value={draft.username} onChange={(e) => update({ username: e.target.value })} className={inputClass} />
              )}
            </Field>
            <Field label="E-mail" required error={errors.email}>
              {(p) => (
                <input {...p} type="email" autoComplete="email" value={draft.email} onChange={(e) => update({ email: e.target.value })} className={inputClass} />
              )}
            </Field>
            <Field label="Rede" required error={errors.network}>
              {(p) => (
                <Select value={draft.network} // O Radix Select dentro de <form> às vezes emite '' (bug conhecido): ignoramos.
                  onValueChange={(v) => v && update({ network: v as NetworkId })}>
                  <SelectTrigger {...p} className="h-10 w-full rounded border-input bg-transparent dark:bg-transparent">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Endereço da carteira" hint="Definido pela carteira selecionada.">
              {(p) => <input {...p} readOnly value={wallet?.address ?? ''} placeholder="Selecione uma carteira" className={`${inputClass} text-muted-foreground`} />}
            </Field>
            <Field label="Observação do colecionador (opcional)" error={errors.note} className="md:col-span-2 md:max-w-[350px]">
              {(p) => (
                <Textarea {...p} rows={5} value={draft.note} onChange={(e) => update({ note: e.target.value })} className="rounded border-input bg-transparent dark:bg-transparent" />
              )}
            </Field>
          </div>
        </section>

        <aside aria-labelledby="your-nfts-title" className="flex flex-col gap-6">
          <section>
            <h2 id="your-nfts-title" className="font-bold">
              Seus NFTs
            </h2>
            <div className="mt-2 flex justify-between border-b border-border pb-2 text-sm font-bold" aria-hidden>
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {(quote.data?.lines ?? []).map((l) => (
                <li key={l.editionId} className="flex items-center gap-3 bg-card pr-4">
                  <img src={l.image} alt="" width={70} height={70} className="size-[70px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{l.name}</p>
                    <p className="text-sm text-subtle">ID do token: {l.tokenId}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">(x {l.quantity})</span>
                  <span className="font-bold text-brand">{eth(l.lineTotalEth)}</span>
                </li>
              ))}
              {quote.isPending && hasLines && <Skeleton className="h-[70px] w-full" />}
            </ul>
            <p className="mt-3 text-center text-sm">
              Tem um código promocional?{' '}
              <Link to="/cart" className="text-brand underline">
                Aplique aqui
              </Link>
            </p>
          </section>

          <QuoteSummary quote={quote.data} isFetching={quote.isFetching} />
          {quote.data && quote.data.issues.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              {quote.data.issues.map((i) => i.message).join(' ')}{' '}
              <Link to="/cart" className="underline">
                Ajustar carrinho
              </Link>
            </p>
          )}

          <WalletPicker
            selectedId={draft.walletId}
            onSelect={(w) => {
              update({ walletId: w.id, network: w.network })
              setWalletError(undefined)
            }}
            error={walletError}
          />

          <button
            type="submit"
            disabled={!hasLines || quote.isPending}
            className="h-12 rounded bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 max-md:h-14 max-md:rounded-full max-md:bg-gradient-to-r max-md:from-[#e0a06a] max-md:to-[#b8763f]"
          >
            Confirmar compra
          </button>
        </aside>
      </form>

      {review && (
        <ReviewDialog
          open
          onOpenChange={(o) => !o && setReview(null)}
          initialQuote={review.quote}
          liveQuote={quote.data}
          collector={review.collector}
          wallet={review.wallet}
          network={network}
          onPlaced={clear}
        />
      )}
    </Container>
  )
}

function CheckoutSkeleton() {
  return (
    <Container className="grid gap-10 pt-10 lg:grid-cols-[1fr_405px]" aria-busy="true" aria-label="Carregando pagamento">
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </Container>
  )
}
