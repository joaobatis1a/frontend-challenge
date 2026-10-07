import { http, HttpResponse } from 'msw'
import {
  MAX_QUANTITY_PER_LINE,
  addCartItemSchema,
  couponSchema,
  quoteRequestSchema,
  updateCartItemSchema,
} from '@/contracts/cart'
import { commit, getDb, type DbCart } from '../db'
import { buildQuote, couponStatus, toCart } from '../domain/pricing'
import { apiError, gate, parseBody, readJson, readToken, requireAuth } from '../http-utils'

type CartResult = { ok: true; cart: DbCart } | { ok: false; response: Response }

/** Carrinho da conta (Bearer) ou do visitante (cabeçalho X-Guest-Cart-Id). */
export function resolveCart(request: Request): CartResult {
  const db = getDb()
  let id: string
  if (readToken(request)) {
    const auth = requireAuth(request)
    if (!auth.ok) return auth
    id = auth.user.id
  } else {
    const guest = request.headers.get('X-Guest-Cart-Id')
    if (!guest) {
      return { ok: false, response: apiError('unauthenticated', 'Identifique o carrinho do visitante.') }
    }
    id = guest
  }
  const cart = (db.carts[id] ??= { id, lines: [], couponCode: null, version: 1 })
  return { ok: true, cart }
}

const bump = (cart: DbCart): void => {
  cart.version += 1
  commit()
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    return HttpResponse.json(toCart(r.cart))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    const parsed = parseBody(addCartItemSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const { nftId, editionId, quantity } = parsed.data

    const nft = getDb().nfts.find((n) => n.id === nftId)
    const edition = nft?.editions.find((e) => e.id === editionId)
    if (!nft || !edition) return apiError('not_found', 'Edição não encontrada.')
    if (edition.available === 0) {
      return apiError('availability_conflict', 'Esta edição está esgotada.', {
        details: { available: 0 },
      })
    }
    const existing = r.cart.lines.find((l) => l.editionId === editionId)
    const wanted = (existing?.quantity ?? 0) + quantity
    const limit = Math.min(edition.available, MAX_QUANTITY_PER_LINE)
    if (wanted > limit) {
      return apiError('availability_conflict', `Você pode levar no máximo ${limit} desta edição.`, {
        details: { available: edition.available, limit },
      })
    }
    if (existing) existing.quantity = wanted
    else r.cart.lines.push({ nftId, editionId, quantity })
    bump(r.cart)
    return HttpResponse.json(toCart(r.cart), { status: 201 })
  }),

  http.patch('/api/cart/items/:editionId', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    const parsed = parseBody(updateCartItemSchema, await readJson(request))
    if (!parsed.ok) return parsed.response

    const line = r.cart.lines.find((l) => l.editionId === params.editionId)
    if (!line) return apiError('not_found', 'Item não está no carrinho.')
    const edition = getDb()
      .nfts.find((n) => n.id === line.nftId)
      ?.editions.find((e) => e.id === line.editionId)
    const limit = Math.min(edition?.available ?? 0, MAX_QUANTITY_PER_LINE)
    if (parsed.data.quantity > limit) {
      return apiError('availability_conflict', `Disponível: ${limit}.`, {
        details: { available: edition?.available ?? 0, limit },
      })
    }
    line.quantity = parsed.data.quantity
    bump(r.cart)
    return HttpResponse.json(toCart(r.cart))
  }),

  http.delete('/api/cart/items/:editionId', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    r.cart.lines = r.cart.lines.filter((l) => l.editionId !== params.editionId)
    bump(r.cart)
    return HttpResponse.json(toCart(r.cart))
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    const parsed = parseBody(couponSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const code = parsed.data.code.toUpperCase()
    const status = couponStatus(code)
    if (status === 'invalid') {
      return apiError('coupon_invalid', 'Cupom inválido.', { fieldErrors: { code: 'Cupom inválido' } })
    }
    if (status === 'expired') {
      return apiError('coupon_expired', 'Este cupom expirou.', { fieldErrors: { code: 'Cupom expirado' } })
    }
    r.cart.couponCode = code
    bump(r.cart)
    return HttpResponse.json(toCart(r.cart))
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    r.cart.couponCode = null
    bump(r.cart)
    return HttpResponse.json(toCart(r.cart))
  }),

  http.post('/api/cart/quote', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const r = resolveCart(request)
    if (!r.ok) return r.response
    const parsed = parseBody(quoteRequestSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    return HttpResponse.json(buildQuote(r.cart, parsed.data.network))
  }),
]
