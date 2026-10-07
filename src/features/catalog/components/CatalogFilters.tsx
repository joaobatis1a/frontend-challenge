import { useEffect, useState } from 'react'
import { NETWORK_LABELS, NETWORKS, type NetworkId } from '@/contracts/cart'
import { CATEGORY_LABELS, NFT_CATEGORIES, type CatalogFacets, type CatalogSearch, type NftCategory } from '@/contracts/nft'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type FilterPatch = Partial<Pick<CatalogSearch, 'category' | 'network' | 'minPrice' | 'maxPrice' | 'inStock'>>

interface CatalogFiltersProps {
  search: CatalogSearch
  facets: CatalogFacets | undefined
  onChange: (patch: FilterPatch) => void
}

const toggle = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const optionBtn =
  'flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground aria-pressed:text-brand'

/** Filtros combináveis. Cada mudança vai para a URL (e reinicia a paginação). */
export function CatalogFilters({ search, facets, onChange }: CatalogFiltersProps) {
  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-2 px-3 font-semibold">Coleções</legend>
        <ul className="flex flex-col">
          {NFT_CATEGORIES.map((c: NftCategory) => (
            <li key={c}>
              <button
                type="button"
                className={optionBtn}
                aria-pressed={Boolean(search.category?.includes(c))}
                onClick={() => onChange({ category: toggle(search.category, c) })}
              >
                <span>{CATEGORY_LABELS[c]}</span>
                <span className="tabular-nums">({facets ? facets.category[c] : '–'})</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <PriceRange search={search} facets={facets} onChange={onChange} />

      <fieldset>
        <legend className="mb-2 px-3 font-semibold">Rede</legend>
        <ul className="flex flex-col">
          {NETWORKS.map((n: NetworkId) => (
            <li key={n}>
              <button
                type="button"
                className={optionBtn}
                aria-pressed={Boolean(search.network?.includes(n))}
                onClick={() => onChange({ network: toggle(search.network, n) })}
              >
                <span>{NETWORK_LABELS[n]}</span>
                <span className="tabular-nums">({facets ? facets.network[n] : '–'})</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex items-center gap-3 px-3">
        <Checkbox
          id="filter-in-stock"
          checked={Boolean(search.inStock)}
          onCheckedChange={(v) => onChange({ inStock: v === true ? true : undefined })}
        />
        <label htmlFor="filter-in-stock" className="text-sm">
          Somente disponíveis
        </label>
      </div>
    </div>
  )
}

function PriceRange({ search, facets, onChange }: CatalogFiltersProps) {
  const min = facets ? Math.floor(Number(facets.priceRange.min) * 100) / 100 : 0
  const max = facets ? Math.ceil(Number(facets.priceRange.max) * 100) / 100 : 0
  const fromUrl = (): [number, number] => [
    search.minPrice ? Number(search.minPrice) : min,
    search.maxPrice ? Number(search.maxPrice) : max,
  ]
  const [value, setValue] = useState<[number, number]>(fromUrl)

  // Mantém o controle em sincronia com a URL (voltar no histórico, limpar filtros).
  useEffect(() => {
    setValue(fromUrl())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.minPrice, search.maxPrice, min, max])

  const apply = () =>
    onChange({
      minPrice: value[0] > min ? value[0].toFixed(2) : undefined,
      maxPrice: value[1] < max ? value[1].toFixed(2) : undefined,
    })

  return (
    <fieldset className="px-3">
      <legend className="mb-4 font-semibold">Faixa de preço</legend>
      {facets ? (
        <>
          <Slider
            min={min}
            max={max}
            step={0.01}
            value={value}
            minStepsBetweenThumbs={1}
            onValueChange={(v) => setValue([v[0] ?? min, v[1] ?? max])}
            thumbLabels={['Preço mínimo', 'Preço máximo']}
          />
          <p className="mt-4 text-sm" aria-live="polite">
            Preço: {fmt(value[0])} - {fmt(value[1])} ETH
          </p>
        </>
      ) : (
        <Skeleton className="h-12 w-full" />
      )}
      <button
        type="button"
        onClick={apply}
        disabled={!facets}
        className={cn('mt-3 rounded bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground hover:bg-primary/90')}
      >
        Aplicar
      </button>
    </fieldset>
  )
}
