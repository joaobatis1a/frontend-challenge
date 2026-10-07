import { z } from 'zod'
import type { Eth } from './money'

export const NETWORKS = ['ethereum', 'polygon', 'arbitrum'] as const
export type NetworkId = (typeof NETWORKS)[number]

export const NETWORK_LABELS: Record<NetworkId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
}

export const MAX_QUANTITY_PER_LINE = 10

export interface CartLine {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: string
  collection: string
  editionLabel: string
  quantity: number
  unitPriceEth: Eth
  /** Estoque atual da edição, para limitar a quantidade na interface. */
  available: number
}

export interface Cart {
  /** Identificador do carrinho: do usuário logado ou do visitante. */
  id: string
  lines: CartLine[]
  couponCode: string | null
  version: number
}

export const addCartItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
})
export type AddCartItemInput = z.infer<typeof addCartItemSchema>

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
})
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>

export const couponSchema = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })
export type CouponInput = z.infer<typeof couponSchema>

export const quoteRequestSchema = z.object({
  network: z.enum(NETWORKS),
})
export type QuoteRequest = z.infer<typeof quoteRequestSchema>

export interface QuoteLine {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: string
  editionLabel: string
  quantity: number
  unitPriceEth: Eth
  lineTotalEth: Eth
  available: number
}

export type QuoteIssueType = 'unavailable' | 'quantity_exceeds_stock'

export interface QuoteIssue {
  type: QuoteIssueType
  nftId: string
  editionId: string
  message: string
}

/**
 * A cotação é a referência para finalizar o pedido. O `fingerprint` resume
 * tudo que influencia o valor (preços, quantidades, cupom, rede e taxa): se
 * mudar entre a cotação e o pedido, a API recusa com `quote_outdated`.
 */
export interface Quote {
  fingerprint: string
  network: NetworkId
  lines: QuoteLine[]
  subtotalEth: Eth
  couponCode: string | null
  couponPercent: number | null
  discountEth: Eth
  networkFeeEth: Eth
  totalEth: Eth
  issues: QuoteIssue[]
  createdAt: string
}
