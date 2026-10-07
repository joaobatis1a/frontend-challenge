import type { QueryClient } from '@tanstack/react-query'
import type { Cart } from '@/contracts/cart'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/events'
import { ethEquals } from '@/contracts/money'
import type { NftDetail, NftListResponse, NftSummary } from '@/contracts/nft'
import { isTerminalOrder, type Order } from '@/contracts/orders'
import { summarizeEditions } from '@/lib/nft'
import { keys } from '@/lib/query/keys'

/**
 * Filtro de eventos: descarta repetidos (mesmo eventId) e antigos (versão
 * menor ou igual à maior já vista para o recurso). Um por conexão de socket.
 */
export class EventGuard {
  private seen = new Set<string>()
  private versions = new Map<string, number>()

  accept(event: { eventId: string; resourceId: string; version: number; resource: string }, cachedVersion = 0): boolean {
    if (this.seen.has(event.eventId)) return false
    this.seen.add(event.eventId)
    if (this.seen.size > 500) {
      const oldest = this.seen.values().next().value
      if (oldest) this.seen.delete(oldest)
    }
    const key = `${event.resource}:${event.resourceId}`
    const known = Math.max(this.versions.get(key) ?? 0, cachedVersion)
    if (event.version <= known) return false
    this.versions.set(key, event.version)
    return true
  }
}

export type RealtimeNotice =
  | { kind: 'cart-changed'; names: string[] }
  | { kind: 'order-updated'; orderId: string; status: Order['status'] }

/** Maior versão do NFT que já está em cache (detalhe ou listas). */
function cachedNftVersion(qc: QueryClient, nftId: string): number {
  let version = qc.getQueryData<NftDetail>(keys.nfts.detail(nftId))?.version ?? 0
  for (const [, data] of qc.getQueriesData<NftListResponse>({ queryKey: keys.nfts.lists() })) {
    const item = data?.items.find((i) => i.id === nftId)
    if (item) version = Math.max(version, item.version)
  }
  return version
}

function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.resourceId || item.version >= event.version) return item
  return { ...item, ...summarizeEditions(event.editions), version: event.version }
}

/**
 * Aplica `nft.updated` no catálogo, no detalhe e no carrinho do dono atual.
 * Devolve um aviso quando algum item do carrinho mudou.
 */
export function applyNftUpdated(
  qc: QueryClient,
  guard: EventGuard,
  owner: string,
  event: NftUpdatedEvent,
): RealtimeNotice | null {
  if (!guard.accept(event, cachedNftVersion(qc, event.resourceId))) return null

  qc.setQueryData<NftDetail>(keys.nfts.detail(event.resourceId), (detail) => {
    if (!detail || detail.version >= event.version) return detail
    const editions = detail.editions.map((ed) => {
      const next = event.editions.find((e) => e.id === ed.id)
      return next ? { ...ed, priceEth: next.priceEth, available: next.available } : ed
    })
    return { ...detail, ...summarizeEditions(editions), editions, version: event.version }
  })

  qc.setQueriesData<NftListResponse>({ queryKey: keys.nfts.lists() }, (list) =>
    list ? { ...list, items: list.items.map((i) => patchSummary(i, event)) } : list,
  )
  qc.setQueryData<NftSummary[]>(keys.nfts.featured(), (items) => items?.map((i) => patchSummary(i, event)))

  // Carrinho: atualiza preço e estoque das linhas afetadas.
  const changed: string[] = []
  qc.setQueryData<Cart>(keys.cart(owner), (cart) => {
    if (!cart) return cart
    const lines = cart.lines.map((line) => {
      const next = line.nftId === event.resourceId ? event.editions.find((e) => e.id === line.editionId) : undefined
      if (!next) return line
      if (ethEquals(next.priceEth, line.unitPriceEth) && next.available === line.available) return line
      changed.push(`${line.name} (${line.editionLabel})`)
      return { ...line, unitPriceEth: next.priceEth, available: next.available }
    })
    return changed.length ? { ...cart, lines } : cart
  })

  if (changed.length) {
    // A cotação da API é a referência: pede uma nova em vez de calcular aqui.
    void qc.invalidateQueries({ queryKey: keys.quotes(owner) })
    return { kind: 'cart-changed', names: changed }
  }
  return null
}

/** Aplica `order.updated`: novo estado do pedido, sem regredir um estado terminal. */
export function applyOrderUpdated(
  qc: QueryClient,
  guard: EventGuard,
  owner: string,
  event: OrderUpdatedEvent,
): RealtimeNotice | null {
  const cached = qc.getQueryData<Order>(keys.order(owner, event.resourceId))
  if (!guard.accept(event, cached?.version ?? 0)) return null
  if (cached && isTerminalOrder(cached.status)) return null

  if (cached) {
    qc.setQueryData<Order>(keys.order(owner, event.resourceId), {
      ...cached,
      status: event.status,
      version: event.version,
      updatedAt: event.occurredAt,
    })
  }
  // Busca o pedido completo (hash da transação, motivo da recusa) na API.
  void qc.invalidateQueries({ queryKey: keys.order(owner, event.resourceId) })
  void qc.invalidateQueries({ queryKey: keys.orders(owner), exact: true })
  if (isTerminalOrder(event.status)) void qc.invalidateQueries({ queryKey: keys.cart(owner) })

  return { kind: 'order-updated', orderId: event.resourceId, status: event.status }
}
