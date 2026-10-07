import { z } from 'zod'
import { NETWORKS, type NetworkId } from './cart'

export const MAX_WALLETS = 2 // uma principal e uma secundária

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export interface Wallet {
  id: string
  label: string
  address: string
  network: NetworkId
  provider: WalletProvider
  /** ENS ou identificação secundária opcional (ex.: "nova.kurio.eth"). */
  ensName: string | null
  isPrimary: boolean
}

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais')

export const walletCreateSchema = z.object({
  label: z.string().trim().min(2, 'Dê um nome à carteira').max(30, 'Máximo de 30 caracteres'),
  address: addressSchema,
  network: z.enum(NETWORKS, { error: 'Selecione uma rede' }),
  provider: z.enum(WALLET_PROVIDERS, { error: 'Selecione o tipo de carteira' }),
  /** Vazio remove o ENS. */
  ensName: z.string().trim().max(60, 'Máximo de 60 caracteres').optional(),
  isPrimary: z.boolean().optional(),
})
export type WalletCreateInput = z.infer<typeof walletCreateSchema>

export const walletUpdateSchema = walletCreateSchema.partial()
export type WalletUpdateInput = z.infer<typeof walletUpdateSchema>

export interface WalletConnection {
  walletId: string
  connected: boolean
}
