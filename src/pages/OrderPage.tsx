import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Loader2, X, XCircle } from 'lucide-react'
import { NETWORK_LABELS } from '@/contracts/cart'
import { isTerminalOrder, type Order } from '@/contracts/orders'
import { PROVIDER_LABELS } from '@/contracts/wallets'
import { Container } from '@/components/layout/Container'
import { Skeleton } from '@/components/ui/skeleton'
import { useOwner } from '@/features/auth/hooks'
import { orderAttempts, useOrder } from '@/features/orders/hooks'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { eth, formatDate, shortAddress } from '@/lib/format'

/**
 * Estado do pedido. O recibo só aparece para pedido CONFIRMADO pela API
 * simulada, e mostra o snapshot gravado no pedido (mudanças posteriores no
 * catálogo não alteram estes valores).
 */
export function OrderPage() {
  const { orderId } = useParams({ from: '/orders/$orderId' })
  const owner = useOwner()
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId)

  // Pedido terminal: a tentativa de compra salva para recuperação não é mais necessária.
  useEffect(() => {
    if (order && isTerminalOrder(order.status) && orderAttempts.load(owner)?.orderId === order.id) {
      orderAttempts.clear(owner)
    }
  }, [order, owner])

  if (isPending) {
    return (
      <Container className="py-16">
        <Skeleton className="mx-auto h-[520px] w-full max-w-[580px]" />
      </Container>
    )
  }
  if (isError) {
    const notFound = toApiError(error).code === 'not_found'
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold">{notFound ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <p className="mt-3 text-muted-foreground">{notFound ? 'Confira o endereço ou veja seus pedidos no perfil.' : errorMessage(error)}</p>
        {!notFound && (
          <button type="button" onClick={() => void refetch()} className="mt-6 rounded bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Tentar novamente
          </button>
        )}
      </Container>
    )
  }
  if (order.status === 'pending') return <PendingOrder order={order} />
  if (order.status === 'rejected') return <RejectedOrder order={order} />
  return <Receipt order={order} />
}

function PendingOrder({ order }: { order: Order }) {
  return (
    <Container className="py-16">
      <div role="status" aria-live="polite" className="mx-auto max-w-[580px] rounded bg-card p-10 text-center">
        <Loader2 className="mx-auto size-10 animate-spin text-brand" aria-hidden />
        <h1 className="mt-6 text-xl font-bold">Aguardando confirmação do pagamento</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pedido <strong className="text-foreground">{order.id}</strong> criado. Estamos aguardando a confirmação na rede{' '}
          {NETWORK_LABELS[order.snapshot.network]}. Você pode recarregar ou fechar a página: o pedido não será duplicado.
        </p>
        <p className="mt-6 text-2xl font-bold text-brand">{eth(order.snapshot.totalEth)}</p>
      </div>
    </Container>
  )
}

function RejectedOrder({ order }: { order: Order }) {
  return (
    <Container className="py-16">
      <div role="alert" className="mx-auto max-w-[580px] rounded border-b-[10px] border-destructive bg-card p-10 text-center">
        <XCircle className="mx-auto size-12 text-destructive" aria-hidden />
        <h1 className="mt-4 text-xl font-bold">Pagamento recusado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {order.rejectionReason ?? 'A transação não foi concluída.'} Nenhum valor foi cobrado e seus itens continuam no carrinho.
        </p>
        <p className="mt-2 text-xs text-subtle">Pedido {order.id}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/cart" className="rounded border border-primary px-5 py-2.5 text-brand hover:bg-secondary">
            Voltar ao carrinho
          </Link>
          <Link to="/checkout" className="rounded bg-primary px-5 py-2.5 font-bold text-primary-foreground hover:bg-primary/90">
            Tentar novamente
          </Link>
        </div>
      </div>
    </Container>
  )
}

function ThankYouIcon() {
  return (
    <svg viewBox="0 0 72 84" className="mx-auto h-[84px] w-[72px] text-brand" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M8 34 36 54 64 34M8 34v42h56V34M8 34l28-22 28 22" strokeLinejoin="round" />
      <path d="M8 76 30 56M64 76 42 56" />
      <rect x="15" y="6" width="42" height="34" rx="2" fill="var(--card)" />
      <text x="36" y="21" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none">THANK</text>
      <text x="36" y="33" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none">YOU</text>
    </svg>
  )
}

function Receipt({ order }: { order: Order }) {
  const navigate = useNavigate()
  const { snapshot, transaction } = order
  return (
    <Container className="py-10 md:py-24">
      <article aria-labelledby="receipt-title" className="relative mx-auto max-w-[580px] border-b-[10px] border-primary bg-card">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="absolute top-4 right-4 text-brand hover:opacity-80"
          aria-label="Fechar recibo e voltar ao início"
        >
          <X className="size-5" aria-hidden />
        </button>
        <header className="px-6 pt-6 pb-5 text-center">
          <ThankYouIcon />
          <h1 id="receipt-title" className="mt-4 font-bold text-muted-foreground">
            Seus NFTs agora estão na sua carteira
          </h1>
        </header>
        <dl className="grid grid-cols-2 gap-4 border-y border-primary px-6 py-3 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary">
          <div>
            <dt className="font-bold text-muted-foreground">ID da transação</dt>
            <dd className="text-muted-foreground">{transaction ? shortAddress(transaction.hash) : '—'}</dd>
          </div>
          <div className="sm:pl-4">
            <dt className="text-muted-foreground">Data</dt>
            <dd className="text-muted-foreground">{formatDate(order.updatedAt)}</dd>
          </div>
          <div className="sm:pl-4">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-muted-foreground">{eth(snapshot.totalEth)}</dd>
          </div>
          <div className="sm:pl-4">
            <dt className="font-bold text-muted-foreground">Carteira</dt>
            <dd className="text-muted-foreground">{PROVIDER_LABELS[snapshot.walletProvider]}</dd>
          </div>
        </dl>

        <div className="px-6 py-6 sm:px-11">
          <h2 className="font-bold">Detalhes da transação</h2>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">Itens do pedido {order.id}</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 font-bold">NFTs</th>
                <th scope="col" className="py-2 text-center font-bold">Edições</th>
                <th scope="col" className="py-2 text-right font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.map((item) => (
                <tr key={item.editionId}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt="" width={64} height={64} className="size-16 rounded object-cover" />
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-subtle">ID do token: {item.tokenId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-muted-foreground">(x {item.quantity})</td>
                  <td className="text-right font-bold text-brand">{eth(item.lineTotalEth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 ml-auto flex max-w-[320px] flex-col gap-1 border-b border-border pb-3 text-sm">
            {snapshot.couponCode && (
              <div className="flex justify-between">
                <dt>Desconto ({snapshot.couponCode})</dt>
                <dd>(-) {eth(snapshot.discountEth)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd className="text-base">{eth(snapshot.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-base text-brand">{eth(snapshot.totalEth)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-center text-sm leading-6 text-muted-foreground">
            Transação confirmada na {NETWORK_LABELS[snapshot.network]} (simulada). A propriedade foi transferida para sua
            carteira {shortAddress(snapshot.walletAddress)} e registrada na rede.
          </p>
          {transaction && (
            <div className="mt-6 text-center">
              <a
                href={transaction.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded bg-primary px-4 py-3 font-bold text-primary-foreground hover:bg-primary/90"
              >
                Ver no explorador <span className="sr-only">(link simulado, abre em nova aba)</span>
              </a>
              <p className="mt-2 text-xs text-subtle">Link e hash simulados: não existem em uma blockchain real.</p>
            </div>
          )}
        </div>
      </article>
    </Container>
  )
}
