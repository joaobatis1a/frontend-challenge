import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, Mail, Search, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_QUANTITY_PER_LINE, NETWORK_LABELS } from '@/contracts/cart'
import type { NftDetail, NftEdition } from '@/contracts/nft'
import { Container } from '@/components/layout/Container'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCatalog, useNft } from '@/features/catalog/hooks'
import { useFavoriteAction } from '@/features/catalog/useNftActions'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { QuantityStepper } from '@/features/catalog/components/QuantityStepper'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { errorMessage, toApiError } from '@/lib/api/errors'
import { eth, formatDate, shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const query = useNft(nftId)

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    const notFound = toApiError(query.error).code === 'not_found'
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1>
        <p className="mt-3 text-muted-foreground">
          {notFound ? 'Ele pode ter sido removido ou o endereço está incorreto.' : errorMessage(query.error)}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!notFound && (
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="rounded bg-primary px-4 py-2 font-semibold text-primary-foreground"
            >
              Tentar novamente
            </button>
          )}
          <Link to="/" hash="mercado" className="rounded border border-primary px-4 py-2 text-brand">
            Voltar ao mercado
          </Link>
        </div>
      </Container>
    )
  }
  return <Detail nft={query.data} />
}

function Detail({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const router = useRouter()
  const { isFavorite, toggle } = useFavoriteAction(nft.id)
  const { data: cart } = useCart()
  const add = useAddToCart()

  const firstAvailable = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]
  const [editionId, setEditionId] = useState(firstAvailable?.id ?? '')
  const edition: NftEdition | undefined = nft.editions.find((e) => e.id === editionId)
  const [image, setImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  // Limite: estoque da edição e máximo por linha do carrinho, descontando o que já está nele.
  const inCart = cart?.lines.find((l) => l.editionId === editionId)?.quantity ?? 0
  const maxQty = Math.max(0, Math.min(edition?.available ?? 0, MAX_QUANTITY_PER_LINE - inCart))
  const soldOut = !edition || edition.available === 0

  // Estoque pode mudar em tempo real: mantém a quantidade dentro do novo limite.
  useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, maxQty || 1)))
  }, [maxQty])

  const buy = (goToCart: boolean) => {
    if (!edition) return
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          toast.success(`${nft.name} (${edition.label}) adicionado ao carrinho`)
          if (goToCart) void navigate({ to: '/cart' })
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const gallery = nft.gallery
  const mainImage = gallery[image] ?? nft.image

  const quantityHint = soldOut
    ? 'Edição esgotada'
    : maxQty === 0
      ? `Você já tem o máximo desta edição no carrinho (${inCart})`
      : `${edition.available} de ${edition.total} disponíveis · máx. ${MAX_QUANTITY_PER_LINE} por pedido`

  const buyDisabled = soldOut || maxQty === 0 || add.isPending

  return (
    <>
      <Container className="pb-40 md:pb-0">
        {/* Mobile: voltar e favoritar sobre a imagem */}
        <div className="flex items-center justify-between pt-6 md:hidden">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.history.back() : void navigate({ to: '/' }))}
            className="grid size-9 place-items-center rounded-full bg-card"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
            className="grid size-9 place-items-center rounded-full bg-card text-brand"
          >
            <Heart className={cn('size-5', isFavorite && 'fill-current')} aria-hidden />
          </button>
        </div>

        <nav aria-label="Trilha de navegação" className="hidden pt-6 text-sm font-semibold md:block">
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
            <li aria-current="page" className="text-muted-foreground">
              {nft.name}
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,575px)_1fr] lg:gap-8">
          {/* Galeria */}
          <div className="grid gap-4 md:grid-cols-[100px_1fr]">
            <ul className="order-2 flex gap-3 md:order-1 md:flex-col" aria-label="Imagens do NFT">
              {gallery.map((src, i) => (
                <li key={`${src}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setImage(i)}
                    aria-label={`Ver imagem ${i + 1} de ${gallery.length}`}
                    aria-pressed={i === image}
                    className="block overflow-hidden rounded border-2 border-transparent aria-pressed:border-primary"
                  >
                    <img src={src} alt="" width={100} height={100} loading="lazy" className="size-16 object-cover md:size-[100px]" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="relative order-1 rounded bg-card p-0 md:order-2 md:p-5">
              <img
                src={mainImage}
                alt={`${nft.name}: ilustração da coleção ${nft.collection}`}
                width={480}
                height={480}
                fetchPriority="high"
                className="aspect-square w-full rounded-3xl object-cover md:rounded-2xl"
              />
              <Dialog>
                <DialogTrigger
                  className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-background/80 hover:text-brand"
                  aria-label="Ampliar imagem"
                >
                  <Search className="size-5" aria-hidden />
                </DialogTrigger>
                <DialogContent className="max-w-[min(90vw,720px)] border-border bg-card p-4 sm:max-w-[min(90vw,720px)]">
                  <DialogTitle>{nft.name}</DialogTitle>
                  <DialogDescription className="sr-only">Imagem ampliada do NFT</DialogDescription>
                  <img src={mainImage} alt={nft.name} width={480} height={480} className="w-full rounded-xl" />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Informações e compra */}
          <div className="-mx-4 rounded-t-3xl bg-card px-6 pt-6 md:mx-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-xl font-bold md:text-[28px]">{nft.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm md:hidden">
                <Star className="size-4 fill-brand text-brand" aria-hidden />
                <span className="font-bold">{nft.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({nft.reviewCount})</span>
                <span className="sr-only">avaliação média, {nft.reviewCount} avaliações</span>
              </span>
            </div>
            <div className="mt-2 hidden flex-wrap items-center justify-between gap-2 border-b border-border pb-3 md:flex">
              <p className="text-2xl font-bold text-brand" aria-live="polite">
                {edition ? eth(edition.priceEth) : eth(nft.priceFromEth)}
              </p>
              <p className="flex items-center gap-1 text-sm">
                <span className="flex" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={cn('size-4', i < Math.round(nft.rating) ? 'fill-brand text-brand' : 'text-subtle')} />
                  ))}
                </span>
                <span className="sr-only">Nota {nft.rating.toFixed(1)} de 5.</span>
                {nft.reviewCount} avaliações de colecionadores
              </p>
            </div>

            <h2 className="mt-4 hidden text-sm font-bold md:block">Sobre este NFT:</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{nft.description}</p>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-bold">Edição:</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
                {nft.editions.map((e) => {
                  const unavailable = e.available === 0
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={e.id === editionId}
                      onClick={() => setEditionId(e.id)}
                      className={cn(
                        'rounded-full border border-border px-3 py-1 text-xs uppercase aria-checked:border-primary aria-checked:font-bold aria-checked:text-brand',
                        unavailable && 'text-muted-foreground line-through',
                      )}
                    >
                      {e.label}
                      {unavailable && <span className="sr-only"> (esgotada)</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 hidden flex-wrap items-center justify-between gap-4 md:flex">
              <QuantityStepper
                value={quantity}
                max={maxQty}
                onChange={setQuantity}
                disabled={buyDisabled && !add.isPending}
                label="Quantidade"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => buy(true)}
                  disabled={buyDisabled}
                  className="h-10 min-w-32 rounded bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {add.isPending ? 'Adicionando…' : 'COMPRAR'}
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-pressed={isFavorite}
                  className="flex h-10 items-center gap-2 rounded border border-primary px-3 text-sm text-brand hover:bg-secondary"
                >
                  <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </button>
              </div>
            </div>
            <p className={cn('mt-2 text-xs', soldOut || maxQty === 0 ? 'text-destructive' : 'text-subtle')} aria-live="polite">
              {quantityHint}
            </p>

            <dl className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.map((a) => a.value).join(', ')}</dd>
              </div>
            </dl>

            <div className="mt-4 hidden items-center gap-3 text-sm font-bold md:flex">
              <span>Compartilhar este NFT:</span>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no LinkedIn (abre em nova aba)"
                className="hover:text-brand"
              >
                in
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`}
                aria-label="Compartilhar por e-mail"
                className="hover:text-brand"
              >
                <Mail className="size-4" aria-hidden />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Twitter (abre em nova aba)"
                className="hover:text-brand"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                  <path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.7 4.8a4 4 0 0 0 1.2 5.4c-.6 0-1.3-.2-1.8-.5 0 2 1.4 3.6 3.2 4a4 4 0 0 1-1.8.1 4 4 0 0 0 3.8 2.8A8.1 8.1 0 0 1 2 18.2 11.4 11.4 0 0 0 8.3 20c7.4 0 11.5-6.2 11.5-11.5v-.5c.8-.6 1.5-1.3 2-2.1Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-16 hidden md:flex">
          <TabsList variant="line" className="h-auto w-full justify-start gap-8 border-b border-border p-0">
            <TabsTrigger value="details" className="flex-none px-0 pb-2 text-base data-[state=active]:font-bold data-[state=active]:text-brand after:bg-primary">
              Detalhes do NFT
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-none px-0 pb-2 text-base data-[state=active]:font-bold data-[state=active]:text-brand after:bg-primary">
              Avaliações de colecionadores ({nft.reviewCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-4 text-sm leading-6 text-muted-foreground">
            <p>
              {nft.name} é uma obra digital da coleção {nft.collection}, criada por {nft.creator.name}. Cada atributo
              fica armazenado nos metadados do token e é verificado na rede {NETWORK_LABELS[nft.network]}.
            </p>
            <p className="mt-6">
              A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro
              permanente de procedência. {nft.creator.name} recebe {nft.royaltyPercent}% de direitos autorais nas
              vendas secundárias.
            </p>
            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <dt className="font-bold text-foreground">Rede:</dt>
                <dd>Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados no IPFS.</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Contrato:</dt>
                <dd>
                  {shortAddress(nft.contractAddress)} · Contrato inteligente ERC-721 verificado (simulado).
                </dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Direitos autorais:</dt>
                <dd>{nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4">
            <ul className="flex flex-col gap-4">
              {nft.reviews.map((r) => (
                <li key={r.id} className="rounded bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    {r.author}
                    <span className="flex" aria-label={`Nota ${r.rating} de 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} aria-hidden className={cn('size-3', i < r.rating ? 'fill-brand text-brand' : 'text-subtle')} />
                      ))}
                    </span>
                    <span className="font-normal text-subtle">{formatDate(r.createdAt)}</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>

        <MoreFromCollection nft={nft} />
      </Container>

      {/* Mobile: barra fixa de compra, como no frame "Detalhes do NFT" mobile. */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-border bg-card px-6 pt-4 pb-6 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">Qtd.</span>
            <QuantityStepper value={quantity} max={maxQty} onChange={setQuantity} disabled={buyDisabled && !add.isPending} label="Quantidade" size="sm" />
          </div>
          <p className="text-xl font-bold text-brand">{edition ? eth(edition.priceEth) : '—'}</p>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => buy(true)}
            disabled={buyDisabled}
            className="h-14 flex-1 rounded-full bg-gradient-to-r from-[#e0a06a] to-[#b8763f] font-bold text-primary-foreground disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            onClick={() => buy(false)}
            disabled={buyDisabled}
            aria-label="Adicionar ao carrinho"
            className="grid size-14 place-items-center rounded-full border border-border text-brand disabled:opacity-50"
          >
            <ShoppingCart className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}

/** "Mais desta coleção": busca pela coleção e rola horizontalmente com indicadores. */
function MoreFromCollection({ nft }: { nft: NftDetail }) {
  const { data, isPending } = useCatalog({ q: nft.collection })
  const items = data?.items.filter((i) => i.id !== nft.id).slice(0, 5) ?? []
  if (!isPending && items.length === 0) return null
  return (
    <section aria-labelledby="more-title" className="mt-16 md:mt-20">
      <h2 id="more-title" className="border-b border-border pb-2 font-bold text-brand">
        Mais desta coleção
      </h2>
      <ul className="mt-6 grid auto-cols-[60%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[35%] md:grid-flow-row md:grid-cols-5 md:overflow-visible">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((item) => (
              <li key={item.id}>
                <NftCard nft={item} />
              </li>
            ))}
      </ul>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <Container className="pt-6" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="hidden h-4 w-40 md:block" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,575px)_1fr]">
        <div className="grid gap-4 md:grid-cols-[100px_1fr]">
          <div className="order-2 flex gap-3 md:order-1 md:flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-16 md:size-[100px]" />
            ))}
          </div>
          <div className="order-1 rounded bg-card md:order-2 md:p-5">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </div>
    </Container>
  )
}
