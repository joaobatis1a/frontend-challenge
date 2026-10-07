import { ethGt } from '@/contracts/money'
import type { Eth } from '@/contracts/money'

interface EditionLike {
  id: string
  priceEth: Eth
  available: number
}

/**
 * Resumo de preço/estoque a partir das edições, com a mesma regra do contrato
 * `NftSummary`: menor preço entre as edições disponíveis (ou entre todas, se
 * esgotado). Usado para atualizar o card do catálogo quando chega `nft.updated`.
 */
export function summarizeEditions(editions: EditionLike[]): {
  priceFromEth: Eth
  inStock: boolean
  defaultEditionId: string | null
} {
  const inStock = editions.some((e) => e.available > 0)
  const pool = inStock ? editions.filter((e) => e.available > 0) : editions
  const cheapest = pool.reduce<EditionLike | undefined>(
    (min, e) => (!min || ethGt(min.priceEth, e.priceEth) ? e : min),
    undefined,
  )
  return {
    priceFromEth: cheapest?.priceEth ?? '0',
    inStock,
    defaultEditionId: inStock ? (cheapest?.id ?? null) : null,
  }
}

const RARE = new Set(['Épico', 'Lendário'])
/** Selo "RARO" do card. */
export const isRare = (rarity: string): boolean => RARE.has(rarity)
