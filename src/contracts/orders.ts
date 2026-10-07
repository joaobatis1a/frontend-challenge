import { z } from 'zod'
import type { Eth } from './money'
import { NETWORKS, type NetworkId } from './cart'
import type { WalletProvider } from './wallets'

export const ORDER_STATUSES = ['pending', 'confirmed', 'rejected'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Pedidos confirmados ou recusados são terminais: nada mais os altera. */
export const isTerminalOrder = (status: OrderStatus): boolean => status !== 'pending'

/** Campos de "Perfil do colecionador" na tela de pagamento. */
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  note: z.string().trim().max(280, 'Máximo de 280 caracteres').optional(),
})
export type CollectorInput = z.infer<typeof collectorSchema>

export const createOrderSchema = z.object({
  collector: collectorSchema,
  walletId: z.string().min(1, 'Selecione uma carteira'),
  network: z.enum(NETWORKS, { error: 'Selecione uma rede' }),
  /** Impressão digital da cotação que o usuário revisou. */
  quoteFingerprint: z.string().min(1),
  /** Total que o usuário viu na revisão. */
  expectedTotalEth: z.string().regex(/^\d+(\.\d+)?$/),
})
export type CreateOrderInput = z.infer<typeof createOrderSchema>

export interface OrderItemSnapshot {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: string
  editionLabel: string
  quantity: number
  unitPriceEth: Eth
  lineTotalEth: Eth
}

/** Cópia dos valores no momento da compra: mudanças no catálogo não a alteram. */
export interface OrderSnapshot {
  items: OrderItemSnapshot[]
  subtotalEth: Eth
  couponCode: string | null
  discountEth: Eth
  networkFeeEth: Eth
  totalEth: Eth
  network: NetworkId
  walletAddress: string
  walletProvider: WalletProvider
  collector: CollectorInput
}

export interface OrderTransaction {
  /** Hash simulado: não existe em nenhuma blockchain real. */
  hash: string
  /** Link de exploração simulado. */
  explorerUrl: string
}

export interface Order {
  id: string
  status: OrderStatus
  /** Cresce a cada mudança de estado. */
  version: number
  createdAt: string
  updatedAt: string
  snapshot: OrderSnapshot
  transaction: OrderTransaction | null
  rejectionReason: string | null
}
