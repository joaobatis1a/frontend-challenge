/**
 * Cenários da API simulada.
 *
 * Cada cenário é um conjunto de chaves que o MSW consulta a cada requisição.
 * Seleção, em ordem de prioridade:
 *   1. `?scenario=<id>` na URL (guardado em sessionStorage para sobreviver a navegação e refresh);
 *   2. sessionStorage (`mock:scenario`);
 *   3. variável de ambiente `VITE_MOCK_SCENARIO`;
 *   4. `default`.
 */
export interface Scenario {
  id: string
  description: string
  /** Latência de cada resposta, em ms. A escolha dentro da faixa é determinística. */
  latency: { min: number; max: number }
  /** A listagem do catálogo volta vazia. */
  catalogEmpty: boolean
  /** Buscas com termo maior respondem mais rápido: respostas chegam fora de ordem. */
  outOfOrderSearch: boolean
  /** Toda requisição /api falha como queda de conexão (sem resposta HTTP). */
  networkDown: boolean
  /** Toda requisição /api responde com este status HTTP de erro. */
  httpFailureStatus: 429 | 500 | 502 | 503 | null
  /** Rotas autenticadas respondem 401 `session_expired`. */
  sessionExpired: boolean
  /** O desfecho do pagamento simulado. */
  orderOutcome: 'confirmed' | 'rejected'
  /** Tempo, em ms, até um pedido pendente ser resolvido. */
  orderSettleMs: number
  /** No primeiro pedido, o preço do primeiro item sobe entre a revisão e a confirmação. */
  priceChangesAtCheckout: boolean
  /** No primeiro pedido, a edição do primeiro item esgota entre a revisão e a confirmação. */
  soldOutAtCheckout: boolean
  /** O primeiro pedido é criado, mas a resposta nunca chega (timeout no cliente). */
  orderTimeoutAfterCreate: boolean
  /** Adicionar ou remover favoritos falha com 503. */
  favoriteMutationFails: boolean
  /** A carteira recusa a conexão simulada. */
  walletConnectionRefused: boolean
}

const BASE: Scenario = {
  id: 'default',
  description: 'Tudo funciona, com latência baixa e estável.',
  latency: { min: 40, max: 120 },
  catalogEmpty: false,
  outOfOrderSearch: false,
  networkDown: false,
  httpFailureStatus: null,
  sessionExpired: false,
  orderOutcome: 'confirmed',
  orderSettleMs: 1200,
  priceChangesAtCheckout: false,
  soldOutAtCheckout: false,
  orderTimeoutAfterCreate: false,
  favoriteMutationFails: false,
  walletConnectionRefused: false,
}

const define = (id: string, description: string, overrides: Partial<Scenario>): Scenario => ({
  ...BASE,
  ...overrides,
  id,
  description,
})

export const SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  [
    BASE,
    define('empty', 'O catálogo não retorna nenhum NFT.', { catalogEmpty: true }),
    define('slow', 'Respostas lentas (cerca de 2 s), para ver os skeletons.', {
      latency: { min: 1800, max: 2200 },
    }),
    define('variable-latency', 'Latência variável entre 50 ms e 1,8 s, de forma reproduzível.', {
      latency: { min: 50, max: 1800 },
    }),
    define('out-of-order', 'Buscas mais longas respondem mais rápido: respostas fora de ordem.', {
      outOfOrderSearch: true,
    }),
    define('offline', 'Queda de conexão: nenhuma requisição /api recebe resposta.', {
      networkDown: true,
    }),
    define('server-error', 'Toda requisição /api responde 500.', { httpFailureStatus: 500 }),
    define('unavailable', 'Toda requisição /api responde 503.', { httpFailureStatus: 503 }),
    define('expired-session', 'Rotas autenticadas respondem sessão expirada (401).', {
      sessionExpired: true,
    }),
    define('price-changed', 'O preço do primeiro item sobe durante o checkout.', {
      priceChangesAtCheckout: true,
    }),
    define('sold-out', 'A edição do primeiro item esgota durante o checkout.', {
      soldOutAtCheckout: true,
    }),
    define('order-timeout', 'O pedido é criado, mas a resposta nunca chega.', {
      orderTimeoutAfterCreate: true,
    }),
    define('payment-rejected', 'O pagamento simulado é recusado.', { orderOutcome: 'rejected' }),
    define('slow-payment', 'O pedido fica pendente por 6 s antes de ser resolvido.', {
      orderSettleMs: 6000,
    }),
    define('favorite-fails', 'Favoritar e desfavoritar falham com 503.', {
      favoriteMutationFails: true,
    }),
    define('wallet-refused', 'A conexão simulada da carteira é recusada.', {
      walletConnectionRefused: true,
    }),
  ].map((s) => [s.id, s]),
)

export const DEFAULT_SCENARIO_ID = 'default'
const STORAGE_KEY = 'mock:scenario'

let currentId = DEFAULT_SCENARIO_ID

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(id: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, id)
  } catch {
    // sessionStorage indisponível (modo privado, por exemplo): o cenário vale só nesta aba.
  }
}

/** Resolve o cenário inicial e o guarda. Chamado uma vez na inicialização. */
export function initScenario(): Scenario {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  const fromEnv = import.meta.env.VITE_MOCK_SCENARIO as string | undefined
  const candidate = fromUrl ?? readStored() ?? fromEnv ?? DEFAULT_SCENARIO_ID
  setScenario(SCENARIOS[candidate] ? candidate : DEFAULT_SCENARIO_ID)
  return getScenario()
}

export function getScenario(): Scenario {
  return SCENARIOS[currentId] ?? BASE
}

export function setScenario(id: string): void {
  if (!SCENARIOS[id]) throw new Error(`Cenário desconhecido: ${id}`)
  currentId = id
  writeStored(id)
}

/** Número pseudoaleatório determinístico (mulberry32) a partir de uma semente. */
export function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
