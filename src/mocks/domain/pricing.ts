import type { Cart, CartLine, NetworkId, Quote, QuoteIssue, QuoteLine } from '@/contracts/cart'
import { ethAdd, ethMul, ethPercent, ethSub, ZERO_ETH } from '@/contracts/money'
import type { DbCart } from '../db'
import { getDb } from '../db'
import { fnv1a } from '../crypto'
import { COUPONS, NETWORK_FEES } from '../seed'

function findEdition(nftId: string, editionId: string) {
  const nft = getDb().nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export function toCart(cart: DbCart): Cart {
  const lines: CartLine[] = []
  for (const line of cart.lines) {
    const found = findEdition(line.nftId, line.editionId)
    if (!found) continue
    lines.push({
      nftId: line.nftId,
      editionId: line.editionId,
      name: found.nft.name,
      image: `/images/nft/${found.nft.imageIndex}.svg`,
      collection: found.nft.collection,
      editionLabel: found.edition.label,
      quantity: line.quantity,
      unitPriceEth: found.edition.priceEth,
      available: found.edition.available,
    })
  }
  return { id: cart.id, lines, couponCode: cart.couponCode, version: cart.version }
}

export function couponStatus(code: string | null): 'none' | 'valid' | 'expired' | 'invalid' {
  if (!code) return 'none'
  const coupon = COUPONS[code.toUpperCase()]
  if (!coupon) return 'invalid'
  return coupon.expired ? 'expired' : 'valid'
}

/** Calcula a cotação do carrinho para uma rede. Sempre a partir dos preços atuais. */
export function buildQuote(cart: DbCart, network: NetworkId): Quote {
  const lines: QuoteLine[] = []
  const issues: QuoteIssue[] = []

  for (const line of toCart(cart).lines) {
    lines.push({
      nftId: line.nftId,
      editionId: line.editionId,
      name: line.name,
      editionLabel: line.editionLabel,
      quantity: line.quantity,
      unitPriceEth: line.unitPriceEth,
      lineTotalEth: ethMul(line.unitPriceEth, line.quantity),
      available: line.available,
    })
    if (line.available === 0) {
      issues.push({
        type: 'unavailable',
        nftId: line.nftId,
        editionId: line.editionId,
        message: `${line.name} (${line.editionLabel}) está esgotado.`,
      })
    } else if (line.quantity > line.available) {
      issues.push({
        type: 'quantity_exceeds_stock',
        nftId: line.nftId,
        editionId: line.editionId,
        message: `${line.name} (${line.editionLabel}): só há ${line.available} disponível(is).`,
      })
    }
  }

  const subtotalEth = lines.reduce((sum, l) => ethAdd(sum, l.lineTotalEth), ZERO_ETH)
  const valid = couponStatus(cart.couponCode) === 'valid'
  const couponPercent = valid && cart.couponCode ? (COUPONS[cart.couponCode.toUpperCase()]?.percent ?? null) : null
  const discountEth = couponPercent ? ethPercent(subtotalEth, couponPercent) : ZERO_ETH
  const networkFeeEth = lines.length ? NETWORK_FEES[network] : ZERO_ETH
  const totalEth = ethAdd(ethSub(subtotalEth, discountEth), networkFeeEth)

  const fingerprint = fnv1a(
    JSON.stringify({
      l: lines.map((l) => [l.editionId, l.quantity, l.unitPriceEth]),
      c: valid ? cart.couponCode?.toUpperCase() : null,
      n: network,
      f: networkFeeEth,
      t: totalEth,
      i: issues.map((i) => `${i.type}:${i.editionId}`),
    }),
  )

  return {
    fingerprint,
    network,
    lines,
    subtotalEth,
    couponCode: valid ? (cart.couponCode?.toUpperCase() ?? null) : null,
    couponPercent,
    discountEth,
    networkFeeEth,
    totalEth,
    issues,
    createdAt: new Date().toISOString(),
  }
}
