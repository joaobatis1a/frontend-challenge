import { commit, getDb, resetDb } from './db'
import { expireAllSessions } from './http-utils'
import { resetOneShots } from './handlers/orders'
import { SCENARIOS, getScenario, setScenario } from './scenarios'
import { connectedCount, disconnectAll, emitNftUpdated, emitStaleNftEvent, replayLastEvent } from './socket'
import { settleDueOrders } from './domain/orders'

/**
 * Controles de teste expostos em `window.__mock`. Servem para os testes E2E e
 * para quem avalia ver cada cenário. Os eventos em tempo real continuam
 * passando pelo cliente Socket.IO: aqui só se aciona o "servidor" simulado.
 */
export interface MockControls {
  scenarios: () => { id: string; description: string }[]
  scenario: () => string
  setScenario: (id: string) => void
  reset: () => Promise<void>
  expireSession: () => void
  /** Altera o estoque/preço de uma edição e emite `nft.updated` pelo socket. */
  updateEdition: (nftId: string, editionId: string, patch: { available?: number; priceEth?: string }) => boolean
  socket: {
    connections: () => number
    disconnect: () => number
    replayLast: () => boolean
    emitStale: (nftId: string) => boolean
  }
  settleOrders: () => void
}

export function installControls(): void {
  const controls: MockControls = {
    scenarios: () => Object.values(SCENARIOS).map(({ id, description }) => ({ id, description })),
    scenario: () => getScenario().id,
    setScenario: (id) => {
      setScenario(id)
      resetOneShots()
    },
    reset: async () => {
      await resetDb()
      resetOneShots()
    },
    expireSession: expireAllSessions,
    updateEdition: (nftId, editionId, patch) => {
      const nft = getDb().nfts.find((n) => n.id === nftId)
      const edition = nft?.editions.find((e) => e.id === editionId)
      if (!nft || !edition) return false
      if (patch.available !== undefined) edition.available = patch.available
      if (patch.priceEth !== undefined) edition.priceEth = patch.priceEth
      nft.version += 1
      commit()
      emitNftUpdated(nft)
      return true
    },
    socket: {
      connections: connectedCount,
      disconnect: disconnectAll,
      replayLast: replayLastEvent,
      emitStale: emitStaleNftEvent,
    },
    settleOrders: settleDueOrders,
  }
  ;(window as unknown as { __mock: MockControls }).__mock = controls
}
