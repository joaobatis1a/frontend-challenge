import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import type { NftSummary } from '@/contracts/nft'
import { Skeleton } from '@/components/ui/skeleton'
import { eth } from '@/lib/format'
import { isRare } from '@/lib/nft'
import { cn } from '@/lib/utils'
import { useFavoriteAction, useQuickAdd } from '../useNftActions'

interface NftCardProps {
  nft: NftSummary
  /** Imagens da primeira dobra carregam com prioridade (melhora o LCP). */
  priority?: boolean
  /** Posição na grade: no mobile os cards da coluna direita descem um pouco (layout em cascata). */
  offset?: boolean
}

const actionBtn =
  'grid size-8 place-items-center rounded bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50'

export function NftCard({ nft, priority = false, offset = false }: NftCardProps) {
  const { isFavorite, toggle } = useFavoriteAction(nft.id)
  const { addToCart, isPending } = useQuickAdd()

  return (
    <article className={cn('group relative', offset && 'mt-8 md:mt-0')} aria-labelledby={`nft-${nft.id}-name`}>
      <div className="relative rounded-2xl bg-card p-1 md:rounded-none md:p-0">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="block rounded-2xl md:rounded-none md:px-4 md:py-5"
          tabIndex={-1}
          aria-hidden
        >
          <img
            src={nft.image}
            alt=""
            width={480}
            height={480}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={cn('aspect-square w-full rounded-xl object-cover', !nft.inStock && 'opacity-60 grayscale-[40%]')}
          />
        </Link>

        {isRare(nft.rarity) && (
          <span className="absolute top-3 left-0 bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground md:top-5">
            RARO
          </span>
        )}
        {!nft.inStock && (
          <span className="absolute top-3 right-3 rounded bg-background/90 px-2 py-1 text-xs font-semibold text-brand">
            Esgotado
          </span>
        )}

        {/* Mobile: só o coração, como no layout. */}
        <button
          type="button"
          onClick={toggle}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-background/80 text-brand md:hidden"
        >
          <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden />
        </button>

        {/* Desktop: ações aparecem ao passar o mouse ou ao focar pelo teclado. */}
        <div className="absolute inset-x-0 bottom-2 hidden justify-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <button
            type="button"
            className={actionBtn}
            disabled={!nft.defaultEditionId || isPending}
            onClick={() => nft.defaultEditionId && addToCart(nft.id, nft.defaultEditionId, nft.name)}
            aria-label={nft.defaultEditionId ? `Adicionar ${nft.name} ao carrinho` : `${nft.name} está esgotado`}
          >
            <ShoppingCart className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={actionBtn}
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current text-brand')} aria-hidden />
          </button>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className={actionBtn}
            aria-label={`Ver detalhes de ${nft.name}`}
          >
            <Search className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <h3 id={`nft-${nft.id}-name`} className="mt-3 px-2 text-sm md:px-0 md:text-[15px]">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="hover:text-brand">
          {nft.name}
        </Link>
      </h3>
      <p className="px-2 text-sm font-bold text-brand md:px-0 md:text-[15px]">
        {eth(nft.priceFromEth)}
        {nft.originalPriceEth && (
          <span className="ml-2 font-normal text-muted-foreground line-through">
            <span className="sr-only">, antes </span>
            {eth(nft.originalPriceEth)}
          </span>
        )}
      </p>
    </article>
  )
}

/** Mesmo tamanho do card real, para não deslocar o layout ao carregar. */
export function NftCardSkeleton({ offset = false }: { offset?: boolean }) {
  return (
    <div className={cn(offset && 'mt-8 md:mt-0')}>
      <div className="rounded-2xl bg-card p-1 md:rounded-none md:px-4 md:py-5">
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  )
}
