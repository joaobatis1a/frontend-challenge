import { delay, http, HttpResponse } from 'msw'
import { ethMul } from '@/contracts/money'
import { createOrderSchema, type OrderItemSnapshot } from '@/contracts/orders'
import { commit, getDb, nextId, type DbOrder } from '../db'
import { fnv1a } from '../crypto'
import { buildQuote } from '../domain/pricing'
import { scheduleSettlement, settleDueOrders } from '../domain/orders'
import { apiError, gate, parseBody, readJson, requireAuth } from '../http-utils'
import { getScenario } from '../scenarios'
import { emitNftUpdated, emitOrderUpdated } from '../socket'

/** Cenários "de primeira vez" disparam uma única vez por cenário ativo. */
const oneShots = new Set<string>()
export const resetOneShots = (): void => oneShots.clear()
const once = (key: string): boolean => {
  if (oneShots.has(key)) return false
  oneShots.add(key)
  return true
}

const stripOwner = ({ userId: _u, settleAt: _s, ...order }: DbOrder) => order

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    settleDueOrders()

    const key = request.headers.get('Idempotency-Key')
    if (!key) {
      return apiError('validation_error', 'Cabeçalho Idempotency-Key obrigatório.', {
        fieldErrors: { form: 'Requisição sem chave de idempotência' },
      })
    }
    const raw = await readJson(request)
    const parsed = parseBody(createOrderSchema, raw)
    if (!parsed.ok) return parsed.response
    const input = parsed.data

    const db = getDb()
    const requestHash = fnv1a(JSON.stringify(input))
    const idemKey = `${auth.user.id}:${key}`
    const previous = db.idempotency[idemKey]
    if (previous) {
      if (previous.requestHash !== requestHash) {
        return apiError('idempotency_conflict', 'Esta chave já foi usada com outro conteúdo.')
      }
      const original = db.orders.find((o) => o.id === previous.orderId)
      if (original) return HttpResponse.json(stripOwner(original), { status: 200 })
    }

    const wallet = (db.wallets[auth.user.id] ?? []).find((w) => w.id === input.walletId)
    if (!wallet) {
      return apiError('validation_error', 'Carteira inválida.', {
        fieldErrors: { walletId: 'Selecione uma carteira sua' },
      })
    }
    const cart = db.carts[auth.user.id]
    if (!cart || cart.lines.length === 0) {
      return apiError('validation_error', 'Seu carrinho está vazio.', {
        fieldErrors: { form: 'Carrinho vazio' },
      })
    }

    // Mudanças de mercado simuladas entre a revisão e a confirmação (uma vez só).
    const firstLine = cart.lines[0]
    const firstNft = db.nfts.find((n) => n.id === firstLine?.nftId)
    const firstEdition = firstNft?.editions.find((e) => e.id === firstLine?.editionId)
    if (firstNft && firstEdition) {
      const scenario = getScenario()
      if (scenario.priceChangesAtCheckout && once('price')) {
        firstEdition.priceEth = ethMul(firstEdition.priceEth, '1.1')
        firstNft.version += 1
        emitNftUpdated(firstNft)
      }
      if (scenario.soldOutAtCheckout && once('soldout')) {
        firstEdition.available = 0
        firstNft.version += 1
        emitNftUpdated(firstNft)
      }
    }

    const quote = buildQuote(cart, input.network)
    if (quote.issues.length > 0) {
      return apiError('availability_conflict', 'Alguns itens não estão mais disponíveis.', {
        details: { quote },
      })
    }
    if (quote.fingerprint !== input.quoteFingerprint || quote.totalEth !== input.expectedTotalEth) {
      return apiError('quote_outdated', 'Os valores mudaram. Revise a nova cotação.', {
        details: { quote },
      })
    }

    const items: OrderItemSnapshot[] = quote.lines.map((l) => {
      const nft = db.nfts.find((n) => n.id === l.nftId)
      return {
        nftId: l.nftId,
        editionId: l.editionId,
        name: l.name,
        image: `/images/nft/${nft?.imageIndex ?? 1}.svg`,
        editionLabel: l.editionLabel,
        quantity: l.quantity,
        unitPriceEth: l.unitPriceEth,
        lineTotalEth: l.lineTotalEth,
      }
    })

    // Baixa de estoque e evento de cada NFT afetado.
    for (const item of items) {
      const nft = db.nfts.find((n) => n.id === item.nftId)
      const edition = nft?.editions.find((e) => e.id === item.editionId)
      if (!nft || !edition) continue
      edition.available -= item.quantity
      nft.version += 1
      emitNftUpdated(nft)
    }

    const now = new Date().toISOString()
    const order: DbOrder = {
      id: `ord-${String(nextId('order')).padStart(4, '0')}`,
      userId: auth.user.id,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      snapshot: {
        items,
        subtotalEth: quote.subtotalEth,
        couponCode: quote.couponCode,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        network: input.network,
        walletAddress: wallet.address,
        collector: input.collector,
      },
      transaction: null,
      rejectionReason: null,
      settleAt: Date.now() + getScenario().orderSettleMs,
    }
    db.orders.unshift(order)
    db.idempotency[idemKey] = { requestHash, orderId: order.id }
    cart.lines = []
    cart.couponCode = null
    cart.version += 1
    commit()
    scheduleSettlement(order)
    emitOrderUpdated(order)

    // A resposta nunca chega ao cliente (timeout), mas o pedido existe.
    if (getScenario().orderTimeoutAfterCreate && once('timeout')) await delay('infinite')

    return HttpResponse.json(stripOwner(order), { status: 201 })
  }),

  http.get('/api/orders', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    settleDueOrders()
    const mine = getDb().orders.filter((o) => o.userId === auth.user.id).map(stripOwner)
    return HttpResponse.json(mine)
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    settleDueOrders()
    const order = getDb().orders.find((o) => o.id === params.id)
    // Pedido de outra pessoa é tratado como inexistente: não revela que existe.
    if (!order || order.userId !== auth.user.id) return apiError('not_found', 'Pedido não encontrado.')
    return HttpResponse.json(stripOwner(order))
  }),
]
