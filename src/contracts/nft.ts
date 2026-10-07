import { z } from 'zod'
import type { Eth } from './money'

export const NFT_CATEGORIES = ['art', 'music', 'photography', 'gaming', 'collectibles'] as const
export type NftCategory = (typeof NFT_CATEGORIES)[number]

export const NFT_SORTS = ['featured', 'newest', 'price_asc', 'price_desc', 'name'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export interface NftCreator {
  id: string
  name: string
}

/** Cada NFT pode ter várias edições, cada uma com preço e estoque próprios. */
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
  collection: string
  category: NftCategory
  creator: NftCreator
  image: string
  /** Menor preço entre as edições disponíveis (ou entre todas, se esgotado). */
  priceFromEth: Eth
  /** Há pelo menos uma edição disponível. */
  inStock: boolean
  featured: boolean
  createdAt: string
  /** Aumenta a cada mudança de preço ou estoque. Usado para ignorar eventos antigos. */
  version: number
}

export interface NftAttribute {
  trait: string
  value: string
}

export interface NftDetail extends NftSummary {
  description: string
  gallery: string[]
  attributes: NftAttribute[]
  editions: NftEdition[]
}

/** Parâmetros de busca do catálogo. Vivem na URL (TanStack Router). */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.array(z.enum(NFT_CATEGORIES)).optional(),
  minPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  inStock: z.boolean().optional(),
  sort: z.enum(NFT_SORTS).optional(),
  page: z.number().int().min(1).optional(),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 12

export interface NftListResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  /** Eco da consulta resolvida pela API: permite conferir qual pedido gerou a resposta. */
  query: {
    q: string
    category: NftCategory[]
    minPrice: string | null
    maxPrice: string | null
    inStock: boolean
    sort: NftSort
    page: number
  }
}

export interface FavoritesResponse {
  nftIds: string[]
}
