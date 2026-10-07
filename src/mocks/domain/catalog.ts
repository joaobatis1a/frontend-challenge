import type { NftDetail, NftSummary } from '@/contracts/nft'
import { ethGt } from '@/contracts/money'
import type { SeedNft } from '../seed'

const imagePath = (n: number, suffix = ''): string => `/images/nft/${n}${suffix}.svg`

export function toSummary(nft: SeedNft): NftSummary {
  const inStock = nft.editions.some((e) => e.available > 0)
  const pool = inStock ? nft.editions.filter((e) => e.available > 0) : nft.editions
  const priceFromEth = pool.reduce(
    (min, e) => (ethGt(min, e.priceEth) ? e.priceEth : min),
    pool[0]?.priceEth ?? '0',
  )
  return {
    id: nft.id,
    name: nft.name,
    collection: nft.collection,
    category: nft.category,
    creator: nft.creator,
    image: imagePath(nft.imageIndex),
    priceFromEth,
    inStock,
    featured: nft.featured,
    createdAt: nft.createdAt,
    version: nft.version,
  }
}

export function toDetail(nft: SeedNft): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    gallery: [imagePath(nft.imageIndex), imagePath(nft.imageIndex, '-2'), imagePath(nft.imageIndex, '-3')],
    attributes: nft.attributes,
    editions: nft.editions,
  }
}

/** Normaliza texto para busca: minúsculas e sem acentos. */
export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
