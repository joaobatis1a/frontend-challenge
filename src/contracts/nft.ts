import { z } from 'zod'
import type { Eth } from './money'
import { NETWORKS, type NetworkId } from './cart'

/** Coleções do filtro lateral (mesma lista do layout). */
export const NFT_CATEGORIES = [
  'digital-art',
  'photography',
  'music',
  '3d',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const
export type NftCategory = (typeof NFT_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}

export const NFT_SORTS = ['newest', 'featured', 'price_asc', 'price_desc', 'name'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export const SORT_LABELS: Record<NftSort, string> = {
  newest: 'Listados recentemente',
  featured: 'Destaques',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name: 'Nome (A–Z)',
}

export const RARITIES = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'] as const
export type Rarity = (typeof RARITIES)[number]

export interface NftCreator {
  id: string
  name: string
}

/** Cada NFT pode ter várias edições (1/1, 1/10, 1/50, aberta), com preço e estoque próprios. */
export interface NftEdition {
  id: string
  label: string
  priceEth: Eth
  available: number
  total: number
}

export interface NftSummary {
  id: string
  name: string
  /** Número do token exibido como "#0042". */
  tokenId: string
  collection: string
  category: NftCategory
  network: NetworkId
  rarity: Rarity
  creator: NftCreator
  image: string
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado). */
  priceFromEth: Eth
  /** Preço anterior, quando o NFT está em oferta (exibido riscado). */
  originalPriceEth: Eth | null
  /** Há pelo menos uma edição disponível. */
  inStock: boolean
  /** Edição mais barata disponível: usada no "adicionar ao carrinho" do card. */
  defaultEditionId: string | null
  featured: boolean
  createdAt: string
  /** Aumenta a cada mudança de preço ou estoque. Usado para ignorar eventos antigos. */
  version: number
}

export interface NftAttribute {
  trait: string
  value: string
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface NftDetail extends NftSummary {
  description: string
  gallery: string[]
  attributes: NftAttribute[]
  editions: NftEdition[]
  contractAddress: string
  royaltyPercent: number
  rating: number
  reviewCount: number
  reviews: NftReview[]
}

const booleanParam = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])

/** Parâmetros de busca do catálogo. Vivem na URL (TanStack Router). */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.array(z.enum(NFT_CATEGORIES)).optional().catch(undefined),
  network: z.array(z.enum(NETWORKS)).optional().catch(undefined),
  minPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().catch(undefined),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().catch(undefined),
  inStock: booleanParam.optional().catch(undefined),
  /** Aba "Em alta": só NFTs em destaque. */
  featured: booleanParam.optional().catch(undefined),
  sort: z.enum(NFT_SORTS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

/** Contagens exibidas ao lado de cada filtro. */
export interface CatalogFacets {
  category: Record<NftCategory, number>
  network: Record<NetworkId, number>
  /** Faixa de preço de todo o catálogo, para o controle deslizante. */
  priceRange: { min: Eth; max: Eth }
}

export interface NftListResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: CatalogFacets
  /** Eco da consulta resolvida pela API: permite conferir qual pedido gerou a resposta. */
  query: {
    q: string
    category: NftCategory[]
    network: NetworkId[]
    minPrice: string | null
    maxPrice: string | null
    inStock: boolean
    featured: boolean
    sort: NftSort
    page: number
  }
}

export interface FavoritesResponse {
  nftIds: string[]
}
