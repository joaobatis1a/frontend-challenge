import { http, HttpResponse } from 'msw'
import { NETWORKS, type NetworkId } from '@/contracts/cart'
import { ethGt } from '@/contracts/money'
import {
  CATALOG_PAGE_SIZE,
  NFT_CATEGORIES,
  NFT_SORTS,
  type CatalogFacets,
  type FavoritesResponse,
  type NftCategory,
  type NftListResponse,
  type NftSort,
  type NftSummary,
} from '@/contracts/nft'
import { commit, getDb } from '../db'
import { toDetail, toSummary, normalize } from '../domain/catalog'
import { apiError, gate, requireAuth } from '../http-utils'
import { getScenario } from '../scenarios'

const isCategory = (v: string): v is NftCategory => (NFT_CATEGORIES as readonly string[]).includes(v)
const isNetwork = (v: string): v is NetworkId => (NETWORKS as readonly string[]).includes(v)
const isSort = (v: string): v is NftSort => (NFT_SORTS as readonly string[]).includes(v)

const byPrice = (a: NftSummary, b: NftSummary) =>
  ethGt(a.priceFromEth, b.priceFromEth) ? 1 : ethGt(b.priceFromEth, a.priceFromEth) ? -1 : 0

function sortItems(items: NftSummary[], sort: NftSort): NftSummary[] {
  const copy = [...items]
  const byNewest = (a: NftSummary, b: NftSummary) => b.createdAt.localeCompare(a.createdAt)
  switch (sort) {
    case 'featured':
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured) || byNewest(a, b))
    case 'price_asc':
      return copy.sort(byPrice)
    case 'price_desc':
      return copy.sort((a, b) => byPrice(b, a))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return copy.sort(byNewest)
  }
}

/** Conta quantos itens cada opção de filtro teria (sobre o resultado da busca textual). */
function buildFacets(items: NftSummary[], all: NftSummary[]): CatalogFacets {
  const category = Object.fromEntries(NFT_CATEGORIES.map((c) => [c, 0])) as Record<NftCategory, number>
  const network = Object.fromEntries(NETWORKS.map((n) => [n, 0])) as Record<NetworkId, number>
  for (const item of items) {
    category[item.category] += 1
    network[item.network] += 1
  }
  const prices = [...all].sort(byPrice)
  return {
    category,
    network,
    priceRange: { min: prices[0]?.priceFromEth ?? '0', max: prices[prices.length - 1]?.priceFromEth ?? '0' },
  }
}

export const catalogHandlers = [
  http.get('/api/nfts/featured', async () => {
    const blocked = await gate()
    if (blocked) return blocked
    const items = getDb().nfts.filter((n) => n.featured).map(toSummary)
    return HttpResponse.json(items)
  }),

  http.get('/api/nfts', async ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = (params.get('q') ?? '').trim()
    // Cenário "out-of-order": termos mais longos respondem antes dos curtos.
    const latencyMs = getScenario().outOfOrderSearch ? Math.max(30, 1500 - q.length * 350) : undefined
    const blocked = await gate({ latencyMs })
    if (blocked) return blocked

    const category = params.getAll('category').filter(isCategory)
    const network = params.getAll('network').filter(isNetwork)
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const inStock = params.get('inStock') === 'true'
    const featured = params.get('featured') === 'true'
    const sortParam = params.get('sort') ?? ''
    const sort: NftSort = isSort(sortParam) ? sortParam : 'newest'
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

    const all = getScenario().catalogEmpty ? [] : getDb().nfts.map(toSummary)
    let items = all
    if (q) {
      const needle = normalize(q)
      items = items.filter((n) => normalize(`${n.name} ${n.collection} ${n.creator.name}`).includes(needle))
    }
    const facets = buildFacets(items, all)
    if (category.length) items = items.filter((n) => category.includes(n.category))
    if (network.length) items = items.filter((n) => network.includes(n.network))
    if (inStock) items = items.filter((n) => n.inStock)
    if (featured) items = items.filter((n) => n.featured)
    if (minPrice) items = items.filter((n) => !ethGt(minPrice, n.priceFromEth))
    if (maxPrice) items = items.filter((n) => !ethGt(n.priceFromEth, maxPrice))
    items = sortItems(items, sort)

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE))
    const start = (page - 1) * CATALOG_PAGE_SIZE
    const body: NftListResponse = {
      items: items.slice(start, start + CATALOG_PAGE_SIZE),
      page,
      pageSize: CATALOG_PAGE_SIZE,
      total,
      totalPages,
      facets,
      query: { q, category, network, minPrice, maxPrice, inStock, featured, sort, page },
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const nft = getDb().nfts.find((n) => n.id === params.id)
    if (!nft) return apiError('not_found', 'NFT não encontrado.')
    return HttpResponse.json(toDetail(nft))
  }),

  http.get('/api/favorites', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const body: FavoritesResponse = { nftIds: getDb().favorites[auth.user.id] ?? [] }
    return HttpResponse.json(body)
  }),

  http.put('/api/favorites/:nftId', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    if (getScenario().favoriteMutationFails) {
      return apiError('transient_failure', 'Não foi possível atualizar seus favoritos agora.')
    }
    const db = getDb()
    const nftId = String(params.nftId)
    if (!db.nfts.some((n) => n.id === nftId)) return apiError('not_found', 'NFT não encontrado.')
    const list = (db.favorites[auth.user.id] ??= [])
    if (!list.includes(nftId)) list.push(nftId) // idempotente
    commit()
    return HttpResponse.json({ nftIds: list } satisfies FavoritesResponse)
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    if (getScenario().favoriteMutationFails) {
      return apiError('transient_failure', 'Não foi possível atualizar seus favoritos agora.')
    }
    const db = getDb()
    db.favorites[auth.user.id] = (db.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
    commit()
    return HttpResponse.json({ nftIds: db.favorites[auth.user.id] ?? [] } satisfies FavoritesResponse)
  }),
]
