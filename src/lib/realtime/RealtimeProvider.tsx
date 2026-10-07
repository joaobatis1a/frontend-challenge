import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import {
  SOCKET_EVENTS,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
  type SessionSubscribedPayload,
} from '@/contracts/events'
import { activeToken, cacheOwner, useSession } from '@/lib/session/store'
import { keys } from '@/lib/query/keys'
import { EventGuard, applyNftUpdated, applyOrderUpdated, type RealtimeNotice } from './apply'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting'

interface RealtimeContextValue {
  status: RealtimeStatus
  /** Registra um ouvinte para avisos (carrinho mudou, pedido atualizado). */
  onNotice: (listener: (notice: RealtimeNotice) => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

/**
 * Mantém uma conexão Socket.IO por sessão.
 *
 * Quando o usuário muda (login, logout, troca de conta ou sessão expirada), a
 * conexão antiga é encerrada e uma nova é aberta com o novo token. Assim,
 * eventos da sessão anterior nunca chegam aos dados do usuário atual.
 *
 * Após uma reconexão, os recursos ativos são reconciliados com a API REST
 * (os eventos perdidos durante a queda não são reenviados pelo servidor).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const session = useSession()
  const token = activeToken(session)
  const owner = cacheOwner(session)
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const listeners = useRef(new Set<(n: RealtimeNotice) => void>())

  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false
    const guard = new EventGuard()
    let connectedBefore = false
    const notify = (notice: RealtimeNotice | null) => {
      if (notice) for (const l of listeners.current) l(notice)
    }

    const setup = (s: Socket) => {
      s.on('connect', () => {
        s.emit(SOCKET_EVENTS.subscribe, { token })
        if (connectedBefore) {
          // Reconciliação: busca de novo o que está na tela.
          void qc.invalidateQueries({ queryKey: keys.nfts.all })
          void qc.invalidateQueries({ queryKey: [owner] })
        }
        connectedBefore = true
      })
      s.on(SOCKET_EVENTS.subscribed, (_payload: SessionSubscribedPayload) => setStatus('connected'))
      s.on('disconnect', () => setStatus('reconnecting'))
      s.on(SOCKET_EVENTS.nftUpdated, (event: NftUpdatedEvent) => notify(applyNftUpdated(qc, guard, owner, event)))
      s.on(SOCKET_EVENTS.orderUpdated, (event: OrderUpdatedEvent) =>
        notify(applyOrderUpdated(qc, guard, owner, event)),
      )
    }

    // Import dinâmico: o socket.io-client guarda o WebSocket nativo ao ser
    // avaliado, então só é carregado aqui (depois que o MSW já iniciou). Isso
    // também deixa o restante do app baixar em paralelo com o MSW.
    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      socket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnectionDelay: 500,
        reconnectionDelayMax: 3_000,
      })
      setup(socket)
    })

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
      setStatus('connecting')
    }
  }, [qc, token, owner])

  const onNotice = useCallback((listener: (n: RealtimeNotice) => void) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])
  const value = useMemo<RealtimeContextValue>(() => ({ status, onNotice }), [status, onNotice])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime precisa estar dentro de <RealtimeProvider>')
  return ctx
}

/** Atalho para reagir a avisos de tempo real dentro de um componente. */
export function useRealtimeNotice(listener: (notice: RealtimeNotice) => void): void {
  const { onNotice } = useRealtime()
  const ref = useRef(listener)
  ref.current = listener
  useEffect(() => onNotice((n) => ref.current(n)), [onNotice])
}
