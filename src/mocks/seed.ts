import type { NetworkId } from '@/contracts/cart'
import { NETWORKS } from '@/contracts/cart'
import type { NftAttribute, NftCategory, NftEdition, NftReview, Rarity } from '@/contracts/nft'
import { NFT_CATEGORIES, RARITIES } from '@/contracts/nft'
import { ethMul } from '@/contracts/money'
import type { Wallet } from '@/contracts/wallets'
import { seeded } from './scenarios'

/** Personagens com ilustração extraída do Figma (public/images/nft/<persona>.webp). */
export const PERSONAS = ['emerald', 'nomad', 'baron', 'golden'] as const
export type Persona = (typeof PERSONAS)[number]

export interface SeedNft {
  id: string
  name: string
  tokenId: string
  collection: string
  category: NftCategory
  network: NetworkId
  rarity: Rarity
  creator: { id: string; name: string }
  persona: Persona
  description: string
  attributes: NftAttribute[]
  editions: NftEdition[]
  originalPriceEth: string | null
  featured: boolean
  createdAt: string
  contractAddress: string
  royaltyPercent: number
  rating: number
  reviews: NftReview[]
  version: number
}

/**
 * Credenciais fictícias, documentadas no README. O banco simulado guarda
 * apenas o hash com sal: estas senhas em texto existem só aqui, no seed.
 */
export const SEED_USERS = [
  {
    id: 'user-ana',
    name: 'Ana Colecionadora',
    email: 'ana@example.com',
    username: 'ana_colecionadora',
    password: 'Senha@123',
    ensName: 'ana',
    bio: 'Coleciono arte digital e música on-chain.',
  },
  {
    id: 'user-bruno',
    name: 'Bruno Colecionador',
    email: 'bruno@example.com',
    username: 'bruno_c',
    password: 'Senha@456',
    ensName: null,
    bio: 'Fotografia e itens de jogos.',
  },
] as const

/** Os nove primeiros NFTs reproduzem os cards do layout (nome, personagem e preço). */
const FIGMA_CARDS: { name: string; token: string; persona: Persona; price: string }[] = [
  { name: 'Emerald Ape', token: '042', persona: 'emerald', price: '1.19' },
  { name: 'Sage Nomad', token: '009', persona: 'nomad', price: '1.69' },
  { name: 'Neon Vessel', token: '552', persona: 'baron', price: '1.99' },
  { name: 'Cosmic Bloom', token: '118', persona: 'nomad', price: '1.29' },
  { name: 'Violet Nomad', token: '314', persona: 'nomad', price: '1.39' },
  { name: 'Ivory Baron', token: '088', persona: 'baron', price: '1.79' },
  { name: 'Golden Beat', token: '207', persona: 'golden', price: '0.99' },
  { name: 'Golden Frequency', token: '071', persona: 'golden', price: '0.59' },
  { name: 'Golden Signal', token: '160', persona: 'golden', price: '0.39' },
]

const ADJECTIVES = ['Amber', 'Onyx', 'Lunar', 'Crimson', 'Silver', 'Jade', 'Velvet', 'Copper', 'Solar', 'Mint']
const NOUNS: Record<Persona, string[]> = {
  emerald: ['Ape', 'Captain', 'Racer'],
  nomad: ['Nomad', 'Bloom', 'Drifter'],
  baron: ['Baron', 'Vessel', 'Regent'],
  golden: ['Beat', 'Signal', 'Frequency'],
}
const COLLECTIONS: Record<Persona, string> = {
  emerald: 'Kurio Apes',
  nomad: 'Nomad Club',
  baron: 'Ivory Society',
  golden: 'Golden Frequencies',
}
const ATTRIBUTES: Record<Persona, string[]> = {
  emerald: ['Óculos', 'Esmeralda'],
  nomad: ['Chapéu', 'Moletom'],
  baron: ['Brinco', 'Gola alta'],
  golden: ['Fones', 'Jaqueta'],
}
const CREATORS = ['Nova Sato', 'Luna Prado', 'Caio Ferreira', 'Marina Alves', 'Tiago Mota', 'Bia Cordeiro']
const REVIEWERS = ['Rafa Lima', 'Duda Nogueira', 'Iago Barros', 'Lia Campos', 'Theo Rocha', 'Maya Reis']
const COMMENTS = [
  'Arte impecável, os detalhes em alta resolução valem cada ETH.',
  'Entrega rápida na carteira e procedência verificada. Recomendo.',
  'Uma das melhores peças da coleção. Comunidade muito ativa.',
  'Ótimo custo-benefício para a edição aberta.',
]

export const NFT_COUNT = 48
/** Esgotados em todas as edições (casos de teste). */
export const SOLD_OUT_INDEXES = new Set([9, 18, 30, 42])
const FEATURED_INDEXES = new Set([1, 5, 11, 17, 26, 39])
/** Em oferta: preço anterior exibido riscado. */
const ON_SALE: Record<number, string> = { 2: '2.29', 14: '1.45', 27: '3.10', 35: '0.95' }
const BASE_DATE = Date.UTC(2026, 8, 20)

export const pad2 = (n: number): string => String(n).padStart(2, '0')
export const nftId = (index: number): string => `nft-${pad2(index + 1)}`

const hex = (seed: number, length: number): string => {
  let out = ''
  for (let k = 0; out.length < length; k += 1) out += Math.floor(seeded(seed * 31 + k) * 16).toString(16)
  return out
}

export function buildSeedNfts(): SeedNft[] {
  return Array.from({ length: NFT_COUNT }, (_, i) => {
    const rand = (k: number) => seeded(i * 101 + k)
    const card = FIGMA_CARDS[i]
    const persona: Persona = card?.persona ?? PERSONAS[i % PERSONAS.length] ?? 'emerald'
    const nouns = NOUNS[persona]
    const name =
      card?.name ?? `${ADJECTIVES[i % ADJECTIVES.length]} ${nouns[Math.floor(i / PERSONAS.length) % nouns.length]}`
    const token = card?.token ?? String(100 + Math.floor(rand(9) * 899))
    const id = nftId(i)
    const basePrice = card?.price ?? (0.05 + rand(1) * 3.5).toFixed(2)
    const soldOut = SOLD_OUT_INDEXES.has(i)
    const rarity = RARITIES[Math.floor(rand(7) * RARITIES.length)] ?? 'Comum'
    const creator = CREATORS[(i * 5) % CREATORS.length] ?? 'Nova Sato'

    // Edição aberta (padrão), 1/50, 1/10 e, em alguns, a peça única 1/1.
    const editions: NftEdition[] = [
      {
        id: `${id}-std`,
        label: 'Aberta',
        priceEth: basePrice,
        total: 500,
        available: soldOut ? 0 : 120 + Math.floor(rand(4) * 300),
      },
      {
        id: `${id}-ltd`,
        label: '1/50',
        priceEth: ethMul(basePrice, '1.5'),
        total: 50,
        available: soldOut ? 0 : 5 + Math.floor(rand(5) * 40),
      },
    ]
    if (i % 3 === 0) {
      editions.splice(1, 0, {
        id: `${id}-fnd`,
        label: '1/10',
        priceEth: ethMul(basePrice, '3'),
        total: 10,
        available: soldOut ? 0 : 1 + Math.floor(rand(6) * 9),
      })
    }
    if (i % 4 === 0) {
      editions.unshift({ id: `${id}-one`, label: '1/1', priceEth: ethMul(basePrice, '10'), total: 1, available: soldOut ? 0 : 1 })
    }

    // Casos de borda determinísticos para testes de limite de quantidade.
    if (i === 10) {
      const std = editions.find((e) => e.label === 'Aberta')
      if (std) std.available = 2
    }
    if (i === 12) {
      const ltd = editions.find((e) => e.label === '1/50')
      if (ltd) ltd.available = 0 // edição indisponível com outra disponível
    }

    const rating = Math.round((4 + rand(8)) * 10) / 10
    const reviews: NftReview[] = Array.from({ length: 3 }, (_, r) => ({
      id: `${id}-review-${r + 1}`,
      author: REVIEWERS[(i + r) % REVIEWERS.length] ?? 'Colecionador',
      rating: Math.min(5, Math.max(3, Math.round(rating - r * 0.4))),
      comment: COMMENTS[(i + r) % COMMENTS.length] ?? '',
      createdAt: new Date(BASE_DATE - (i + r * 3) * 86_400_000).toISOString(),
    }))

    return {
      id,
      name: `${name} #${token}`,
      tokenId: `#0${token}`,
      collection: COLLECTIONS[persona],
      category: NFT_CATEGORIES[i % NFT_CATEGORIES.length] ?? 'digital-art',
      network: NETWORKS[Math.floor(i / 2) % NETWORKS.length] ?? 'ethereum',
      rarity,
      creator: { id: `creator-${(i * 5) % CREATORS.length}`, name: creator },
      persona,
      description: `Um colecionável digital finalizado à mão da coleção ${COLLECTIONS[persona]}, verificado na rede, com arte desbloqueável e acesso para colecionadores.`,
      attributes: [
        ...ATTRIBUTES[persona].map((value) => ({ trait: 'Traço', value })),
        { trait: 'Raridade', value: rarity },
      ],
      editions,
      originalPriceEth: ON_SALE[i] ?? null,
      featured: FEATURED_INDEXES.has(i),
      createdAt: new Date(BASE_DATE - i * 1.5 * 86_400_000).toISOString(),
      contractAddress: `0x${hex(i + 1, 40)}`,
      royaltyPercent: 5,
      rating,
      reviews,
      version: 1,
    }
  })
}

export const SEED_WALLETS: Record<string, Wallet[]> = {
  'user-ana': [
    {
      id: 'wallet-ana-1',
      label: 'Principal',
      address: '0xa91f000000000000000000000000000000e82c',
      network: 'ethereum',
      provider: 'metamask',
      ensName: null,
      isPrimary: true,
    },
    {
      id: 'wallet-ana-2',
      label: 'Reserva',
      address: '0x2222222222222222222222222222222222222222',
      network: 'polygon',
      provider: 'coinbase',
      ensName: 'nova.kurio.eth',
      isPrimary: false,
    },
  ],
  'user-bruno': [
    {
      id: 'wallet-bruno-1',
      label: 'Minha carteira',
      address: '0x3333333333333333333333333333333333333333',
      network: 'arbitrum',
      provider: 'walletconnect',
      ensName: null,
      isPrimary: true,
    },
  ],
}

export const SEED_FAVORITES: Record<string, string[]> = {
  'user-ana': ['nft-03', 'nft-12'],
  'user-bruno': ['nft-05'],
}

export const COUPONS: Record<string, { percent: number; expired: boolean }> = {
  WELCOME10: { percent: 10, expired: false },
  ETHER5: { percent: 5, expired: false },
  EXPIRED20: { percent: 20, expired: true },
}

/** Taxa de rede fixa por pedido, em ETH. */
export const NETWORK_FEES = {
  ethereum: '0.016',
  polygon: '0.002',
  arbitrum: '0.006',
} as const
