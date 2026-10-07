import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { NETWORK_LABELS } from '@/contracts/cart'
import { CATEGORY_LABELS, NFT_SORTS, SORT_LABELS, type CatalogSearch, type NftSort } from '@/contracts/nft'
import { Container } from '@/components/layout/Container'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCatalog } from '@/features/catalog/hooks'
import { CatalogFilters, type FilterPatch } from '@/features/catalog/components/CatalogFilters'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { Pagination } from '@/features/catalog/components/Pagination'
import {
  FeaturedSpotlight,
  HeroDesktop,
  HeroMobile,
  MintJournal,
  PromoBanners,
} from '@/features/catalog/components/HomeSections'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'new' | 'trending'

/** As abas do layout são atalhos para combinações de filtros da URL. */
const tabOf = (s: CatalogSearch): Tab => (s.featured ? 'trending' : s.sort === 'newest' ? 'new' : 'all')
const TABS: { id: Tab; label: string; patch: Partial<CatalogSearch> }[] = [
  { id: 'all', label: 'Todos os NFTs', patch: { featured: undefined, sort: undefined } },
  { id: 'new', label: 'Novos lançamentos', patch: { featured: undefined, sort: 'newest' } },
  { id: 'trending', label: 'Em alta', patch: { featured: true } },
]

export function HomePage() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const catalog = useCatalog(search)
  const data = catalog.data
  const [filtersOpen, setFiltersOpen] = useState(false)
  // A busca fica na barra lateral no desktop e na barra de ferramentas no tablet (um só campo com id="busca").
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const searchBox = (
    <DesktopSearch value={search.q ?? ''} onSearch={(q) => update({ q: q || undefined }, { replace: true })} />
  )

  /** Toda mudança de filtro reinicia a paginação. */
  const update = (patch: FilterPatch | Partial<CatalogSearch>, opts: { replace?: boolean } = {}) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: undefined }),
      replace: opts.replace,
      resetScroll: false,
    })

  const clearAll = () => void navigate({ search: {}, resetScroll: false })
  const activeChips = [
    ...(search.category ?? []).map((c) => ({ key: `c-${c}`, label: CATEGORY_LABELS[c], remove: () => update({ category: search.category?.filter((x) => x !== c) }) })),
    ...(search.network ?? []).map((n) => ({ key: `n-${n}`, label: NETWORK_LABELS[n], remove: () => update({ network: search.network?.filter((x) => x !== n) }) })),
    ...(search.minPrice || search.maxPrice
      ? [{ key: 'price', label: `${search.minPrice ?? '0'} – ${search.maxPrice ?? '∞'} ETH`, remove: () => update({ minPrice: undefined, maxPrice: undefined }) }]
      : []),
    ...(search.inStock ? [{ key: 'stock', label: 'Somente disponíveis', remove: () => update({ inStock: undefined }) }] : []),
    ...(search.q ? [{ key: 'q', label: `“${search.q}”`, remove: () => update({ q: undefined }) }] : []),
  ]

  return (
    <Container>
      <MobileSearchBar
        value={search.q ?? ''}
        onSearch={(q) => update({ q: q || undefined }, { replace: true })}
        filterTrigger={
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#e0a06a] to-[#a8683a] text-primary-foreground lg:hidden"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] overflow-y-auto bg-card">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
              </SheetHeader>
              <div className="px-1 pb-8">
                <CatalogFilters search={search} facets={data?.facets} onChange={update} />
              </div>
            </SheetContent>
          </Sheet>
        }
      />
      <HeroDesktop />
      <HeroMobile />

      <section id="mercado" aria-labelledby="catalog-title" className="mt-6 scroll-mt-4 md:mt-16 lg:grid lg:grid-cols-[310px_1fr] lg:gap-12">
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <div className="hidden lg:block">
          <div className="rounded bg-card py-4">
            {isDesktop && <div className="mb-6 px-3">{searchBox}</div>}
            <CatalogFilters search={search} facets={data?.facets} onChange={update} />
          </div>
          <FeaturedSpotlight />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border">
            <div role="group" aria-label="Visualização do catálogo" className="flex gap-4 overflow-x-auto md:gap-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tabOf(search) === t.id}
                  onClick={() => update(t.patch)}
                  className="border-b-2 border-transparent py-2 text-sm whitespace-nowrap aria-pressed:border-primary aria-pressed:font-semibold aria-pressed:text-brand"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-4 pb-2 md:flex">
              {!isDesktop && searchBox}
              <label className="flex items-center gap-1 text-sm">
                <span id="sort-label">Ordenar por:</span>
                <Select value={search.sort ?? 'newest'} onValueChange={(v) => v && update({ sort: v as NftSort })}>
                  <SelectTrigger aria-labelledby="sort-label" className="h-8 border-0 bg-transparent px-1 text-sm shadow-none dark:bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NFT_SORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SORT_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/60 px-3 py-1 text-xs text-brand hover:bg-secondary"
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  {chip.label} <X className="size-3" aria-hidden />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="text-xs text-muted-foreground underline hover:text-brand">
                Limpar filtros
              </button>
            </div>
          )}

          {/* Anuncia a quantidade de resultados para leitores de tela. */}
          <p className="sr-only" role="status" aria-live="polite">
            {catalog.isFetching ? 'Carregando NFTs…' : data ? `${data.total} NFTs encontrados` : ''}
          </p>

          <div aria-busy={catalog.isFetching} className={cn('relative mt-6 transition-opacity', catalog.isPlaceholderData && 'opacity-60')}>
            {catalog.isPending ? (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12" aria-label="Carregando NFTs">
                {Array.from({ length: 9 }, (_, i) => (
                  <li key={i}>
                    <NftCardSkeleton offset={i % 2 === 1} />
                  </li>
                ))}
              </ul>
            ) : catalog.isError && !data ? (
              <div role="alert" className="rounded border border-destructive/60 bg-card p-8 text-center">
                <p className="font-semibold">Não foi possível carregar o catálogo.</p>
                <p className="mt-2 text-sm text-muted-foreground">{errorMessage(catalog.error)}</p>
                <button
                  type="button"
                  onClick={() => void catalog.refetch()}
                  className="mt-4 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <RotateCcw className="size-4" aria-hidden /> Tentar novamente
                </button>
              </div>
            ) : data && data.items.length === 0 ? (
              <div className="rounded bg-card p-8 text-center">
                <p className="font-semibold">Nenhum NFT encontrado.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.page > data.totalPages
                    ? 'Esta página não existe para os filtros atuais.'
                    : 'Tente outros termos ou remova alguns filtros.'}
                </p>
                <button type="button" onClick={clearAll} className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Limpar filtros
                </button>
              </div>
            ) : data ? (
              <>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12" aria-label={`${data.total} NFTs`}>
                  {data.items.map((nft, i) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} priority={i < 3} offset={i % 2 === 1} />
                    </li>
                  ))}
                </ul>
                {catalog.isError && (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    Falha ao atualizar: {errorMessage(catalog.error)}{' '}
                    <button type="button" className="underline" onClick={() => void catalog.refetch()}>
                      Tentar novamente
                    </button>
                  </p>
                )}
                <Pagination page={data.page} totalPages={data.totalPages} />
              </>
            ) : null}
          </div>
        </div>
      </section>

      <PromoBanners />
      <MintJournal />
    </Container>
  )
}

/** Campo de busca que atualiza a URL depois de uma pausa na digitação (debounce). */
function useDebouncedSearch(value: string, onSearch: (q: string) => void) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (text.trim() === value) return
    const id = setTimeout(() => onSearch(text.trim()), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return [text, setText] as const
}

function DesktopSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useDebouncedSearch(value, onSearch)
  return (
    <div className="relative">
      <label htmlFor="busca" className="sr-only">
        Buscar NFTs, coleções ou criadores
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="busca"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar NFTs, coleções..."
        className="h-9 w-full min-w-44 rounded border border-input bg-transparent pr-2 pl-8 text-sm placeholder:text-subtle focus:border-primary"
      />
    </div>
  )
}

function MobileSearchBar({
  value,
  onSearch,
  filterTrigger,
}: {
  value: string
  onSearch: (q: string) => void
  filterTrigger: React.ReactNode
}) {
  const [text, setText] = useDebouncedSearch(value, onSearch)
  return (
    <div className="flex items-center gap-2 pt-6 md:pt-6 lg:hidden">
      <div className="relative flex-1 md:hidden">
        <label htmlFor="busca-mobile" className="sr-only">
          Explorar coleções
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="busca-mobile"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Explorar coleções"
          className="h-11 w-full rounded-xl bg-card pr-3 pl-11 text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div className="hidden flex-1 md:block" />
      {filterTrigger}
    </div>
  )
}
