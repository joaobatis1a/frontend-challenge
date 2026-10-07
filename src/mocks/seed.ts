import type { NftAttribute, NftCategory, NftEdition } from '@/contracts/nft'
import { NFT_CATEGORIES } from '@/contracts/nft'
import { ethMul } from '@/contracts/money'
import type { Wallet } from '@/contracts/wallets'
import { seeded } from './scenarios'

export interface SeedNft {
  id: string
  name: string
  collection: string
  category: NftCategory
  creator: { id: string; name: string }
  /** Número do arquivo em /images/nft/<n>.svg */
  imageIndex: number
  description: string
  attributes: NftAttribute[]
  editions: NftEdition[]
  featured: boolean
  createdAt: string
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
    bio: 'Coleciono arte digital e música on-chain.',
  },
  {
    id: 'user-bruno',
    name: 'Bruno Colecionador',
    email: 'bruno@example.com',
    username: 'bruno_c',
    password: 'Senha@456',
    bio: 'Fotografia e itens de jogos.',
  },
] as const

const NOUNS = ['Aurora', 'Farol', 'Maré', 'Eclipse', 'Fragmento', 'Horizonte', 'Pulso', 'Mirante']
const ADJECTIVES = ['Neon', 'Cristal', 'Quântico', 'Solar', 'Lunar', 'Analógico']
const COLLECTIONS = [
  'Neon Atlântico',
  'Cristais do Mangue',
  'Quântica Lo-fi',
  'Sol de Pixel',
  'Órbita Lunar',
  'Analógico Digital',
]
const CREATORS = [
  'Luna Prado',
  'Caio Ferreira',
  'Marina Alves',
  'Tiago Mota',
  'Bia Cordeiro',
  'Rafa Lima',
  'Duda Nogueira',
  'Iago Barros',
]
const PALETTES = ['Magenta e índigo', 'Verde-água', 'Âmbar', 'Azul profundo', 'Rosa quente', 'Grafite']
const RARITIES = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário']

export const NFT_COUNT = 48
const SOLD_OUT_INDEXES = new Set([6, 18, 30, 42])
const FEATURED_INDEXES = new Set([0, 5, 11, 17, 26, 39])
const BASE_DATE = Date.UTC(2026, 8, 20)

export const pad2 = (n: number): string => String(n).padStart(2, '0')
export const nftId = (index: number): string => `nft-${pad2(index + 1)}`

export function buildSeedNfts(): SeedNft[] {
  return Array.from({ length: NFT_COUNT }, (_, i) => {
    const rand = (k: number) => seeded(i * 101 + k)
    const noun = NOUNS[i % NOUNS.length] ?? 'Aurora'
    const adjective = ADJECTIVES[Math.floor(i / NOUNS.length)] ?? 'Neon'
    const creatorIndex = (i * 3 + 1) % CREATORS.length
    const id = nftId(i)
    const basePrice = (0.05 + rand(1) * 3.5).toFixed(3)

    const standardTotal = 80 + Math.floor(rand(2) * 120)
    const limitedTotal = 10 + Math.floor(rand(3) * 20)
    const soldOut = SOLD_OUT_INDEXES.has(i)

    const editions: NftEdition[] = [
      {
        id: `${id}-std`,
        label: 'Standard',
        priceEth: basePrice,
        total: standardTotal,
        available: soldOut ? 0 : standardTotal - Math.floor(rand(4) * standardTotal * 0.6),
      },
      {
        id: `${id}-ltd`,
        label: 'Limitada',
        priceEth: ethMul(basePrice, '1.8'),
        total: limitedTotal,
        available: soldOut ? 0 : Math.floor(rand(5) * limitedTotal),
      },
    ]
    if (i % 3 === 0) {
      editions.push({
        id: `${id}-fnd`,
        label: 'Fundador',
        priceEth: ethMul(basePrice, '4'),
        total: 3,
        available: soldOut ? 0 : 1 + Math.floor(rand(6) * 3),
      })
    }

    // Casos de borda determinísticos para testes de limite de quantidade.
    if (i === 10) {
      const std = editions[0]
      if (std) std.available = 2
    }
    if (i === 12) {
      const ltd = editions[1]
      if (ltd) ltd.available = 0 // edição indisponível com outra disponível
    }

    return {
      id,
      name: `${noun} ${adjective}`,
      collection: COLLECTIONS[Math.floor(i / NOUNS.length)] ?? COLLECTIONS[0] ?? '',
      category: NFT_CATEGORIES[(i * 3 + 1) % NFT_CATEGORIES.length] ?? 'art',
      creator: { id: `creator-${creatorIndex + 1}`, name: CREATORS[creatorIndex] ?? '' },
      imageIndex: i + 1,
      description: `${noun} ${adjective} é uma obra digital da coleção ${
        COLLECTIONS[Math.floor(i / NOUNS.length)] ?? ''
      }. Cada edição é única e registrada em sua carteira.`,
      attributes: [
        { trait: 'Paleta', value: PALETTES[(i * 5) % PALETTES.length] ?? '' },
        { trait: 'Raridade', value: RARITIES[Math.floor(rand(7) * RARITIES.length)] ?? 'Comum' },
        { trait: 'Série', value: `#${pad2((i % 12) + 1)}` },
      ],
      editions,
      featured: FEATURED_INDEXES.has(i),
      createdAt: new Date(BASE_DATE - i * 1.5 * 86_400_000).toISOString(),
      version: 1,
    }
  })
}

export const SEED_WALLETS: Record<string, Wallet[]> = {
  'user-ana': [
    {
      id: 'wallet-ana-1',
      label: 'Carteira principal',
      address: '0x1111111111111111111111111111111111111111',
      network: 'ethereum',
      isPrimary: true,
    },
    {
      id: 'wallet-ana-2',
      label: 'Carteira de reserva',
      address: '0x2222222222222222222222222222222222222222',
      network: 'polygon',
      isPrimary: false,
    },
  ],
  'user-bruno': [
    {
      id: 'wallet-bruno-1',
      label: 'Minha carteira',
      address: '0x3333333333333333333333333333333333333333',
      network: 'arbitrum',
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
  ethereum: '0.0021',
  polygon: '0.0002',
  arbitrum: '0.0006',
} as const
