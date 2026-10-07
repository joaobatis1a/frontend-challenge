import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import {
  SOCKET_EVENTS,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  type SessionSubscribePayload,
} from '@/contracts/events'
import type { DbOrder } from './db'
import { getDb, nextId, commit } from './db'
import { findSession } from './http-utils'
import type { SeedNft } from './seed'

type ServerEvent = NftUpdatedEvent | OrderUpdatedEvent

interface Client {
  id: number
  io: ReturnType<typeof toSocketIo>
  userId: string | null
}

const clients = new Map<number, Client>()
let clientSeq = 0
/** Últimos eventos emitidos, para os controles de teste repetirem (replay). */
const history: { event: ServerEvent; ownerId: string | null }[] = []
const PING_EVERY_MS = 20_000

function send(client: Client, event: ServerEvent): void {
  const name = event.resource === 'nft' ? SOCKET_EVENTS.nftUpdated : SOCKET_EVENTS.orderUpdated
  try {
    client.io.client.emit(name, event)
  } catch {
    clients.delete(client.id)
  }
}

function dispatch(event: ServerEvent, ownerId: string | null): void {
  history.push({ event, ownerId })
  if (history.length > 50) history.shift()
  for (const client of clients.values()) {
    // Eventos de pedido só vão para o dono; os de NFT são públicos.
    if (ownerId && client.userId !== ownerId) continue
    send(client, event)
  }
}

export function emitNftUpdated(nft: SeedNft): void {
  const event: NftUpdatedEvent = {
    eventId: `evt-${nextId('event')}`,
    resource: 'nft',
    resourceId: nft.id,
    version: nft.version,
    occurredAt: new Date().toISOString(),
    editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available })),
  }
  commit()
  dispatch(event, null)
}

export function emitOrderUpdated(order: DbOrder): void {
  const event: OrderUpdatedEvent = {
    eventId: `evt-${nextId('event')}`,
    resource: 'order',
    resourceId: order.id,
    version: order.version,
    occurredAt: new Date().toISOString(),
    status: order.status,
  }
  commit()
  dispatch(event, order.userId)
}

/** Repete o último evento emitido (mesmo eventId): o cliente precisa ignorar. */
export function replayLastEvent(): boolean {
  const last = history[history.length - 1]
  if (!last) return false
  dispatch(last.event, last.ownerId)
  return true
}

/**
 * Emite um evento de NFT com versão antiga (menor ou igual à atual), mas com
 * eventId novo: o cliente precisa descartar por versão.
 */
export function emitStaleNftEvent(nftId: string): boolean {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  if (!nft) return false
  const event: NftUpdatedEvent = {
    eventId: `evt-${nextId('event')}`,
    resource: 'nft',
    resourceId: nft.id,
    version: Math.max(0, nft.version - 1),
    occurredAt: new Date().toISOString(),
    editions: nft.editions.map((e) => ({ id: e.id, priceEth: '999', available: 0 })),
  }
  commit()
  dispatch(event, null)
  return true
}

/** Fecha todas as conexões abertas (simula queda do servidor). */
export function disconnectAll(): number {
  const count = clients.size
  for (const client of clients.values()) {
    try {
      client.io.rawClient.close()
    } catch {
      // já fechada
    }
  }
  clients.clear()
  return count
}

export function connectedCount(): number {
  return clients.size
}

export const socketLink = ws.link('*')

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    // Só o Socket.IO é simulado; qualquer outro WebSocket (como o HMR do Vite) segue normal.
    if (!connection.client.url.pathname.startsWith('/socket.io')) {
      connection.server.connect()
      return
    }
    const io = toSocketIo(connection)
    clientSeq += 1
    const client: Client = { id: clientSeq, io, userId: null }
    clients.set(client.id, client)

    io.client.on(SOCKET_EVENTS.subscribe, (_event, payload: SessionSubscribePayload | undefined) => {
      const found = findSession(payload?.token ?? null)
      const expired = found && new Date(found.session.expiresAt).getTime() <= Date.now()
      client.userId = found && !expired ? found.user.id : null
      io.client.emit(SOCKET_EVENTS.subscribed, { userId: client.userId })
    })

    // Engine.IO v4: o servidor envia ping ("2") e o cliente responde pong ("3").
    const ping = setInterval(() => {
      try {
        io.rawClient.send('2')
      } catch {
        clearInterval(ping)
      }
    }, PING_EVERY_MS)

    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      clients.delete(client.id)
    })
  }),
]
