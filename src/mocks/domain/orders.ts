import type { DbOrder } from '../db'
import { commit, getDb } from '../db'
import { fakeTxHash } from '../crypto'
import { getScenario } from '../scenarios'
import { emitNftUpdated, emitOrderUpdated } from '../socket'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function restock(order: DbOrder): void {
  const db = getDb()
  for (const item of order.snapshot.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) continue
    edition.available = Math.min(edition.total, edition.available + item.quantity)
    nft.version += 1
    emitNftUpdated(nft)
  }
}

/**
 * Pedido confirmado: tira do carrinho só os itens e quantidades comprados.
 * Se o usuário adicionou mais unidades enquanto o pedido estava pendente, elas ficam.
 */
function removePurchasedFromCart(order: DbOrder): void {
  const cart = getDb().carts[order.userId]
  if (!cart) return
  for (const item of order.snapshot.items) {
    const line = cart.lines.find((l) => l.editionId === item.editionId)
    if (line) line.quantity -= item.quantity
  }
  cart.lines = cart.lines.filter((l) => l.quantity > 0)
  if (order.snapshot.couponCode && cart.couponCode === order.snapshot.couponCode) cart.couponCode = null
  cart.version += 1
}

/** Leva um pedido pendente ao estado final, conforme o cenário. */
export function settleOrder(order: DbOrder): void {
  if (order.status !== 'pending') return
  const rejected = getScenario().orderOutcome === 'rejected'
  order.status = rejected ? 'rejected' : 'confirmed'
  order.version += 1
  order.updatedAt = new Date().toISOString()
  order.settleAt = null
  if (rejected) {
    order.rejectionReason = 'O pagamento foi recusado pela carteira.'
    restock(order)
  } else {
    const hash = fakeTxHash(order.id)
    order.transaction = { hash, explorerUrl: `https://explorer.example/tx/${hash}` }
    removePurchasedFromCart(order)
  }
  const timer = timers.get(order.id)
  if (timer) clearTimeout(timer)
  timers.delete(order.id)
  commit()
  emitOrderUpdated(order)
}

export function scheduleSettlement(order: DbOrder): void {
  if (order.status !== 'pending' || order.settleAt === null) return
  const wait = Math.max(0, order.settleAt - Date.now())
  const existing = timers.get(order.id)
  if (existing) clearTimeout(existing)
  timers.set(
    order.id,
    setTimeout(() => settleOrder(order), wait),
  )
}

/** Resolve pedidos vencidos (ex.: a aba ficou fechada) e reagenda os demais. */
export function settleDueOrders(): void {
  for (const order of getDb().orders) {
    if (order.status !== 'pending' || order.settleAt === null) continue
    if (order.settleAt <= Date.now()) settleOrder(order)
    else if (!timers.has(order.id)) scheduleSettlement(order)
  }
}
