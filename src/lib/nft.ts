import { ethGt } from '@/contracts/money'
import type { Eth } from '@/contracts/money'

interface EditionLike {
  priceEth: Eth
  available: number
}

/**
 * Resumo de preço/estoque a partir das edições, com a mesma regra do contrato
 * `NftSummary`: menor preço entre as edições disponíveis (ou entre todas, se
 * esgotado). Usado para atualizar o card do catálogo quando chega `nft.updated`.
 */
export function summarizeEditions(editions: EditionLike[]): { priceFromEth: Eth; inStock: boolean } {
  const inStock = editions.some((e) => e.available > 0)
  const pool = inStock ? editions.filter((e) => e.available > 0) : editions
  const priceFromEth = pool.reduce<Eth>(
    (min, e) => (ethGt(min, e.priceEth) ? e.priceEth : min),
    pool[0]?.priceEth ?? '0',
  )
  return { priceFromEth, inStock }
}
