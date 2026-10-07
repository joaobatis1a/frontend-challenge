import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { NETWORK_LABELS, type NetworkId, type Quote } from '@/contracts/cart'
import type { CollectorInput } from '@/contracts/orders'
import { PROVIDER_LABELS } from '@/contracts/wallets'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useOwner } from '@/features/auth/hooks'
import { useCreateOrder } from '@/features/orders/hooks'
import { QuoteSummary } from '@/features/cart/components/QuoteSummary'
import { api, type WalletWithConnection } from '@/lib/api/endpoints'
import { toApiError } from '@/lib/api/errors'
import { eth, shortAddress } from '@/lib/format'
import { keys } from '@/lib/query/keys'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cotação que o usuário estava vendo ao clicar em "Confirmar compra". */
  initialQuote: Quote
  /** Cotação atual do cache (pode mudar em tempo real enquanto o diálogo está aberto). */
  liveQuote: Quote | undefined
  collector: CollectorInput
  wallet: WalletWithConnection
  network: NetworkId
  onPlaced: () => void
}

/**
 * Revisão antes do envio. Antes de criar o pedido, a cotação é buscada de
 * novo na API: se preço, estoque, cupom ou taxa mudaram, o usuário vê os
 * novos valores e precisa confirmar outra vez.
 */
export function ReviewDialog({ open, onOpenChange, initialQuote, liveQuote, collector, wallet, network, onPlaced }: ReviewDialogProps) {
  const qc = useQueryClient()
  const owner = useOwner()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const [reviewed, setReviewed] = useState(initialQuote)
  const [changedFrom, setChangedFrom] = useState<Quote | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReviewed(initialQuote)
      setChangedFrom(null)
      setError(null)
    }
  }, [open, initialQuote])

  // Chegou um evento de preço/estoque enquanto revisa: mostra a nova cotação.
  const liveChanged = liveQuote && liveQuote.fingerprint !== reviewed.fingerprint
  useEffect(() => {
    if (open && liveChanged && liveQuote) {
      setChangedFrom(reviewed)
      setReviewed(liveQuote)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, liveChanged])

  const showChange = (next: Quote) => {
    setChangedFrom(reviewed)
    setReviewed(next)
  }

  const confirm = async () => {
    setError(null)
    setChecking(true)
    let fresh: Quote
    try {
      fresh = await qc.fetchQuery({
        queryKey: keys.quote(owner, network),
        queryFn: ({ signal }) => api.cart.quote(network, { signal }),
        staleTime: 0,
      })
    } catch (e) {
      setChecking(false)
      setError(toApiError(e).message)
      return
    }
    setChecking(false)
    if (fresh.fingerprint !== reviewed.fingerprint) return showChange(fresh)
    if (fresh.issues.length) return setError(fresh.issues.map((i) => i.message).join(' '))

    createOrder.mutate(
      {
        collector,
        walletId: wallet.id,
        network,
        quoteFingerprint: fresh.fingerprint,
        expectedTotalEth: fresh.totalEth,
      },
      {
        onSuccess: (order) => {
          onPlaced()
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
        },
        onError: (e) => {
          const apiError = toApiError(e)
          const quote = apiError.details.quote as Quote | undefined
          if ((apiError.code === 'quote_outdated' || apiError.code === 'availability_conflict') && quote) {
            showChange(quote)
            if (quote.issues.length) setError(quote.issues.map((i) => i.message).join(' '))
            return
          }
          setError(
            apiError.isTransient
              ? `${apiError.message} Seu pedido não foi duplicado: ao tentar de novo, recuperamos o mesmo envio.`
              : apiError.message,
          )
        },
      },
    )
  }

  const busy = checking || createOrder.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogTitle>Revise sua compra</DialogTitle>
        <DialogDescription>Confira os itens, a carteira e os valores antes de confirmar.</DialogDescription>

        {changedFrom && (
          <div role="alert" className="flex gap-2 rounded border border-primary bg-secondary/60 p-3 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-brand" aria-hidden />
            <p>
              Os valores mudaram desde a sua revisão: o total era <strong>{eth(changedFrom.totalEth)}</strong> e agora é{' '}
              <strong className="text-brand">{eth(reviewed.totalEth)}</strong>. Confira e confirme novamente.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2 text-sm">
          {reviewed.lines.map((l) => (
            <li key={l.editionId} className="flex items-center gap-3">
              <img src={l.image} alt="" width={40} height={40} className="size-10 rounded object-cover" />
              <span className="flex-1">
                {l.name} <span className="text-subtle">· {l.editionLabel}</span>
              </span>
              <span className="text-muted-foreground">x{l.quantity}</span>
              <span className="w-24 text-right font-bold text-brand">{eth(l.lineTotalEth)}</span>
            </li>
          ))}
        </ul>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-y border-border py-3 text-sm">
          <dt className="text-muted-foreground">Colecionador</dt>
          <dd>
            {collector.displayName} (@{collector.username})
          </dd>
          <dt className="text-muted-foreground">Carteira</dt>
          <dd>
            {wallet.label} · {PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
          </dd>
          <dt className="text-muted-foreground">Rede</dt>
          <dd>{NETWORK_LABELS[network]}</dd>
        </dl>

        <QuoteSummary quote={reviewed} />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="h-10 rounded border border-border px-4 text-sm hover:border-primary disabled:opacity-50"
          >
            Voltar e editar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy || reviewed.issues.length > 0}
            className="flex h-10 items-center justify-center gap-2 rounded bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {checking ? 'Revalidando valores…' : createOrder.isPending ? 'Enviando pedido…' : changedFrom ? 'Confirmar novos valores' : 'Confirmar e pagar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
