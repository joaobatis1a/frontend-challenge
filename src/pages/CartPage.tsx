import { useRef } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_QUANTITY_PER_LINE, type CartLine, type QuoteIssue, type QuoteLine } from '@/contracts/cart'
import { ethEquals, ethMul } from '@/contracts/money'
import { Container } from '@/components/layout/Container'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/hooks'
import { useCart, useQuote, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/hooks'
import { CouponForm } from '@/features/cart/components/CouponForm'
import { QuoteSummary } from '@/features/cart/components/QuoteSummary'
import { QuantityStepper } from '@/features/catalog/components/QuantityStepper'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { useFeatured } from '@/features/catalog/hooks'
import { errorMessage } from '@/lib/api/errors'
import { eth } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CartPage() {
  const { data: cart, isPending, isError, error, refetch } = useCart()
  const hasLines = Boolean(cart?.lines.length)
  // O resumo do carrinho usa a rede Ethereum; no pagamento o usuário escolhe a rede.
  const quote = useQuote('ethereum', hasLines)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const router = useRouter()

  // Preço visto quando o carrinho foi aberto: se mudar em tempo real, a linha avisa.
  const seenPrices = useRef(new Map<string, string>())
  for (const line of cart?.lines ?? []) {
    if (!seenPrices.current.has(line.editionId)) seenPrices.current.set(line.editionId, line.unitPriceEth)
  }

  const issues = quote.data?.issues ?? []
  const canCheckout = hasLines && quote.data && issues.length === 0 && !quote.isFetching

  const checkout = () => {
    if (!isAuthenticated) {
      toast.info('Entre na sua conta para finalizar a compra. Seu carrinho será mantido.')
      void navigate({ to: '/login', search: { redirect: '/checkout' } })
      return
    }
    void navigate({ to: '/checkout' })
  }

  const summary = (
    <>
      <QuoteSummary quote={quote.data} isFetching={quote.isFetching} />
      {quote.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Não foi possível calcular os valores. {errorMessage(quote.error)}{' '}
          <button type="button" className="underline" onClick={() => void quote.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {issues.length > 0 && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Ajuste os itens indicados antes de finalizar.
        </p>
      )}
    </>
  )

  return (
    <Container className="pb-80 md:pb-0">
      <div className="flex items-center gap-4 pt-6 md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="grid size-9 place-items-center rounded-full bg-card"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-bold">Carrinho de NFTs</h1>
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
            <Link to="/" hash="mercado" className="hover:text-brand">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho</h1>

      {isPending ? (
        <CartSkeleton />
      ) : isError ? (
        <div role="alert" className="mt-8 rounded bg-card p-8 text-center">
          <p className="font-semibold">Não foi possível carregar o carrinho.</p>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage(error)}</p>
          <button type="button" onClick={() => void refetch()} className="mt-4 rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Tentar novamente
          </button>
        </div>
      ) : !hasLines ? (
        <div className="mt-8 rounded bg-card p-10 text-center">
          <p className="text-lg font-semibold">Seu carrinho está vazio.</p>
          <p className="mt-2 text-sm text-muted-foreground">Explore o mercado e adicione NFTs para colecionar.</p>
          <Link to="/" hash="mercado" className="mt-6 inline-block rounded bg-primary px-6 py-2.5 font-bold text-primary-foreground">
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_332px] lg:gap-20">
          <section aria-labelledby="cart-items-title">
            <h2 id="cart-items-title" className="sr-only">
              Itens do carrinho
            </h2>
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] border-b border-border pb-2 text-sm font-bold md:grid" aria-hidden>
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            <ul className="mt-3 flex flex-col gap-3">
              {cart!.lines.map((line) => (
                <CartItem
                  key={line.editionId}
                  line={line}
                  quoteLine={quote.data?.lines.find((l) => l.editionId === line.editionId)}
                  issue={issues.find((i) => i.editionId === line.editionId)}
                  previousPrice={seenPrices.current.get(line.editionId)}
                />
              ))}
            </ul>
          </section>

          {/* Desktop: coluna de resumo */}
          <aside aria-labelledby="summary-title" className="hidden md:block">
            <h2 id="summary-title" className="border-b border-border pb-2 text-lg font-bold">
              Resumo da carteira
            </h2>
            <div className="mt-6">
              <CouponForm appliedCode={cart!.couponCode} />
            </div>
            <div className="mt-6">{summary}</div>
            <button
              type="button"
              onClick={checkout}
              disabled={!canCheckout}
              className="mt-6 h-10 w-full rounded bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Conectar e finalizar
            </button>
            <Link to="/" hash="mercado" className="mt-4 block text-center text-brand hover:underline">
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}

      {/* Mobile: resumo fixo no rodapé, como no frame "Carrinho" mobile. */}
      {hasLines && (
        <aside aria-label="Resumo do carrinho" className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-border bg-card px-6 pt-5 pb-6 md:hidden">
          <CouponForm appliedCode={cart!.couponCode} variant="mobile" />
          <div className="mt-4">{summary}</div>
          <button
            type="button"
            onClick={checkout}
            disabled={!canCheckout}
            className="mt-5 h-14 w-full rounded-full bg-gradient-to-r from-[#e0a06a] to-[#b8763f] font-bold text-primary-foreground disabled:opacity-50"
          >
            Conectar e finalizar
          </button>
        </aside>
      )}

      <AlsoViewed />
    </Container>
  )
}

function CartItem({
  line,
  quoteLine,
  issue,
  previousPrice,
}: {
  line: CartLine
  quoteLine: QuoteLine | undefined
  issue: QuoteIssue | undefined
  previousPrice: string | undefined
}) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const max = Math.max(1, Math.min(line.available, MAX_QUANTITY_PER_LINE))
  const priceChanged = previousPrice !== undefined && !ethEquals(previousPrice, line.unitPriceEth)
  // Total da linha conforme a cotação da API; enquanto ela recalcula, mostra a conta local.
  const lineTotal = quoteLine?.quantity === line.quantity ? quoteLine.lineTotalEth : ethMul(line.unitPriceEth, line.quantity)

  const setQuantity = (quantity: number) =>
    update.mutate(
      { editionId: line.editionId, quantity },
      { onError: (error) => toast.error(errorMessage(error)) },
    )

  return (
    <li
      className={cn(
        'rounded-2xl bg-card md:rounded-none',
        (issue || priceChanged) && 'ring-1 ring-primary',
      )}
    >
      <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] md:gap-x-0">
        <div className="row-span-3 flex items-center gap-4 md:row-span-1">
          <img src={line.image} alt="" width={70} height={70} className="size-[100px] rounded-l-2xl object-cover md:size-[70px] md:rounded-none" />
          <div className="hidden md:block">
            <Link to="/nft/$nftId" params={{ nftId: line.nftId }} className="font-bold hover:text-brand">
              {line.name}
            </Link>
            <p className="text-sm text-subtle">ID do token: {line.tokenId}</p>
            <p className="text-xs text-subtle">Edição: {line.editionLabel}</p>
          </div>
        </div>
        <div className="pt-3 md:hidden">
          <Link to="/nft/$nftId" params={{ nftId: line.nftId }} className="text-sm font-bold">
            {line.name}
          </Link>
          <p className="text-xs text-subtle">Edição: {line.editionLabel}</p>
        </div>
        <p className="font-bold text-brand md:font-normal md:text-muted-foreground">
          <span className="sr-only">Preço unitário: </span>
          {eth(line.unitPriceEth)}
        </p>
        <div className="flex items-center justify-between pr-3 pb-3 md:block md:p-0">
          <QuantityStepper
            value={line.quantity}
            max={max}
            onChange={setQuantity}
            disabled={update.isPending || remove.isPending}
            label={`Quantidade de ${line.name}`}
            size="sm"
          />
          <button
            type="button"
            onClick={() =>
              remove.mutate(line.editionId, {
                onSuccess: () => toast.success(`${line.name} removido do carrinho`),
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
            disabled={remove.isPending}
            className="text-muted-foreground hover:text-brand md:hidden"
            aria-label={`Remover ${line.name} do carrinho`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        <p className="hidden font-bold text-brand md:block">
          <span className="sr-only">Total: </span>
          {eth(lineTotal)}
        </p>
        <button
          type="button"
          onClick={() =>
            remove.mutate(line.editionId, {
              onSuccess: () => toast.success(`${line.name} removido do carrinho`),
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
          disabled={remove.isPending}
          className="hidden text-muted-foreground hover:text-brand md:block"
          aria-label={`Remover ${line.name} do carrinho`}
        >
          <Trash2 className="size-5" aria-hidden />
        </button>
      </div>
      {(issue || priceChanged) && (
        <p role="status" className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-brand">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {issue
            ? issue.message
            : `Preço atualizado: era ${eth(previousPrice!)}, agora ${eth(line.unitPriceEth)}.`}
        </p>
      )}
    </li>
  )
}

function CartSkeleton() {
  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_332px] lg:gap-20" aria-busy="true" aria-label="Carregando carrinho">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[100px] w-full md:h-[70px]" />
        ))}
      </div>
      <div className="hidden flex-col gap-4 md:flex">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function AlsoViewed() {
  const { data, isPending } = useFeatured()
  return (
    <section aria-labelledby="also-title" className="mt-16 hidden md:block md:mt-24">
      <h2 id="also-title" className="border-b border-border pb-2 font-bold text-brand">
        Colecionadores também viram
      </h2>
      <ul className="mt-6 grid grid-cols-5 gap-4">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : data?.slice(0, 5).map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
