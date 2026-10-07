import type { NftDetail, NftSummary } from '@/contracts/nft'
import { ethGt } from '@/contracts/money'
import type { SeedNft } from '../seed'

export const imagePath = (nft: Pick<SeedNft, 'persona'>, suffix = ''): string =>
  `/images/nft/${nft.persona}${suffix}.webp`

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
    tokenId: nft.tokenId,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    rarity: nft.rarity,
    creator: nft.creator,
    image: imagePath(nft),
    priceFromEth,
    originalPriceEth: nft.originalPriceEth,
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
    gallery: [imagePath(nft), imagePath(nft, '-2'), imagePath(nft, '-3'), imagePath(nft)],
    attributes: nft.attributes,
    editions: nft.editions,
    contractAddress: nft.contractAddress,
    royaltyPercent: nft.royaltyPercent,
    rating: nft.rating,
    reviewCount: 16 + (Number.parseInt(nft.id.slice(4), 10) % 9),
    reviews: nft.reviews,
  }
}

/** Normaliza texto para busca: minúsculas e sem acentos. */
export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
