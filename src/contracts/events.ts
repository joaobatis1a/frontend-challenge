import type { Eth } from './money'
import type { OrderStatus } from './orders'

/** Nomes dos eventos do Socket.IO, em um só lugar para cliente e mocks. */
export const SOCKET_EVENTS = {
  /** Cliente → servidor: informa o token da sessão para receber eventos privados. */
  subscribe: 'session.subscribe',
  /** Servidor → cliente: confirma a inscrição e a identidade associada. */
  subscribed: 'session.subscribed',
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/**
 * Todo evento carrega identidade estável (`eventId`), o recurso afetado e a
 * `version` do recurso. O cliente descarta eventos repetidos (mesmo eventId)
 * e antigos (version menor ou igual à que já aplicou).
 */
interface BaseEvent {
  eventId: string
  resourceId: string
  version: number
  occurredAt: string
}

export interface NftUpdatedEvent extends BaseEvent {
  resource: 'nft'
  editions: { id: string; priceEth: Eth; available: number }[]
}

export interface OrderUpdatedEvent extends BaseEvent {
  resource: 'order'
  status: OrderStatus
}

export interface SessionSubscribePayload {
  token: string | null
}

export interface SessionSubscribedPayload {
  userId: string | null
}
