import { useEffect, useState } from 'react'
import type { NetworkId } from '@/contracts/cart'
import type { User } from '@/contracts/auth'

export interface CheckoutDraft {
  displayName: string
  username: string
  email: string
  note: string
  network: NetworkId | ''
  walletId: string
}

const key = (userId: string) => `checkout-draft:${userId}`

function load(userId: string): Partial<CheckoutDraft> {
  try {
    return JSON.parse(sessionStorage.getItem(key(userId)) ?? '{}') as Partial<CheckoutDraft>
  } catch {
    return {}
  }
}

/**
 * Rascunho do formulário de pagamento no sessionStorage (por usuário).
 * Se a sessão expirar no meio do checkout, o usuário entra de novo e
 * encontra tudo preenchido. Nenhum dado sensível é guardado aqui.
 */
export function useCheckoutDraft(user: User) {
  const [draft, setDraft] = useState<CheckoutDraft>(() => ({
    displayName: user.name,
    username: user.username,
    email: user.email,
    note: '',
    network: '',
    walletId: '',
    ...load(user.id),
  }))

  useEffect(() => {
    try {
      sessionStorage.setItem(key(user.id), JSON.stringify(draft))
    } catch {
      // sem sessionStorage: o rascunho vale só enquanto a página estiver aberta
    }
  }, [draft, user.id])

  const update = (patch: Partial<CheckoutDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const clear = () => {
    try {
      sessionStorage.removeItem(key(user.id))
    } catch {
      // ignorado
    }
  }
  return { draft, update, clear }
}
