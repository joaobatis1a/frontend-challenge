import type { Quote } from '@/contracts/cart'
import { Skeleton } from '@/components/ui/skeleton'
import { eth } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Subtotal, desconto, taxa de rede e total. Os valores vêm SEMPRE da cotação
 * da API (nunca calculados aqui), porque ela é a referência para o pedido.
 */
export function QuoteSummary({ quote, isFetching, className }: { quote: Quote | undefined; isFetching?: boolean; className?: string }) {
  if (!quote) return <QuoteSummarySkeleton className={className} />
  return (
    <dl className={cn('flex flex-col gap-3 text-sm', isFetching && 'opacity-70', className)} aria-busy={isFetching}>
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd className="text-base tabular-nums">{eth(quote.subtotalEth)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>
          Desconto do lançamento
          {quote.couponCode && (
            <span className="ml-1 text-xs text-brand">
              ({quote.couponCode} −{quote.couponPercent}%)
            </span>
          )}
        </dt>
        <dd className="tabular-nums">(-) {eth(quote.discountEth)}</dd>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd className="text-base tabular-nums">{eth(quote.networkFeeEth)}</dd>
        </div>
        <p className="text-right text-xs text-brand">Taxa estimada</p>
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-4 font-bold">
        <dt>Total</dt>
        <dd className="text-lg text-brand tabular-nums" aria-live="polite">
          {eth(quote.totalEth)}
        </dd>
      </div>
    </dl>
  )
}

export function QuoteSummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-label="Calculando valores">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-border pt-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}
