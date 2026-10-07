import { delay, http, HttpResponse } from 'msw'
import {
  avatarSchema,
  passwordChangeSchema,
  profileUpdateSchema,
} from '@/contracts/auth'
import {
  MAX_WALLETS,
  walletCreateSchema,
  walletUpdateSchema,
  type Wallet,
  type WalletConnection,
} from '@/contracts/wallets'
import { commit, getDb, nextId, publicUser } from '../db'
import { hashPassword } from '../crypto'
import { apiError, gate, parseBody, readJson, requireAuth } from '../http-utils'
import { getScenario } from '../scenarios'

function userWallets(userId: string): Wallet[] {
  const db = getDb()
  return (db.wallets[userId] ??= [])
}

export const accountHandlers = [
  http.get('/api/profile', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const parsed = parseBody(profileUpdateSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const { name, username, bio, email, ensName } = parsed.data
    const others = getDb().users.filter((u) => u.id !== auth.user.id)
    if (username && others.some((u) => u.username === username)) {
      return apiError('validation_error', 'Nome de usuário já em uso.', {
        fieldErrors: { username: 'Este nome de usuário já está em uso' },
      })
    }
    if (email && others.some((u) => u.email === email)) {
      return apiError('email_taken', 'Este e-mail já está cadastrado.', {
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      })
    }
    if (name !== undefined) auth.user.name = name
    if (username !== undefined) auth.user.username = username
    if (bio !== undefined) auth.user.bio = bio
    if (email !== undefined) auth.user.email = email
    if (ensName !== undefined) auth.user.ensName = ensName || null
    commit()
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.put('/api/profile/avatar', async ({ request }) => {
    const blocked = await gate({ latencyMs: 700 }) // upload simulado
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const parsed = parseBody(avatarSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    auth.user.avatarUrl = parsed.data.dataUrl
    commit()
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.delete('/api/profile/avatar', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    auth.user.avatarUrl = null
    commit()
    return HttpResponse.json(publicUser(auth.user))
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const parsed = parseBody(passwordChangeSchema, await readJson(request))
    if (!parsed.ok) return parsed.response
    const current = await hashPassword(parsed.data.currentPassword, auth.user.salt)
    if (current !== auth.user.passwordHash) {
      return apiError('validation_error', 'Senha atual incorreta.', {
        fieldErrors: { currentPassword: 'Senha atual incorreta' },
      })
    }
    auth.user.salt = `salt-${nextId('guest')}-${Date.now()}`
    auth.user.passwordHash = await hashPassword(parsed.data.newPassword, auth.user.salt)
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/wallets', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const connected = getDb().connectedWallets[auth.user.id] ?? []
    return HttpResponse.json(
      userWallets(auth.user.id).map((w) => ({ ...w, connected: connected.includes(w.id) })),
    )
  }),

  http.post('/api/wallets', async ({ request }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const parsed = parseBody(walletCreateSchema, await readJson(request))
    if (!parsed.ok) return parsed.response

    const list = userWallets(auth.user.id)
    if (list.length >= MAX_WALLETS) {
      return apiError('validation_error', `Você pode cadastrar até ${MAX_WALLETS} carteiras.`, {
        fieldErrors: { form: `Limite de ${MAX_WALLETS} carteiras atingido` },
      })
    }
    const address = parsed.data.address.toLowerCase()
    const taken = Object.values(getDb().wallets)
      .flat()
      .some((w) => w.address.toLowerCase() === address)
    if (taken) {
      return apiError('wallet_address_taken', 'Esta carteira já está cadastrada.', {
        fieldErrors: { address: 'Este endereço já está cadastrado' },
      })
    }
    const makePrimary = list.length === 0 || parsed.data.isPrimary === true
    if (makePrimary) for (const w of list) w.isPrimary = false
    const wallet: Wallet = {
      id: `wallet-${nextId('wallet')}`,
      label: parsed.data.label,
      address: parsed.data.address,
      network: parsed.data.network,
      provider: parsed.data.provider,
      ensName: parsed.data.ensName || null,
      isPrimary: makePrimary,
    }
    list.push(wallet)
    commit()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.patch('/api/wallets/:id', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const parsed = parseBody(walletUpdateSchema, await readJson(request))
    if (!parsed.ok) return parsed.response

    const list = userWallets(auth.user.id)
    const wallet = list.find((w) => w.id === params.id)
    if (!wallet) return apiError('not_found', 'Carteira não encontrada.')
    const { label, address, network, isPrimary, provider, ensName } = parsed.data
    if (address && address.toLowerCase() !== wallet.address.toLowerCase()) {
      const taken = Object.values(getDb().wallets)
        .flat()
        .some((w) => w.id !== wallet.id && w.address.toLowerCase() === address.toLowerCase())
      if (taken) {
        return apiError('wallet_address_taken', 'Esta carteira já está cadastrada.', {
          fieldErrors: { address: 'Este endereço já está cadastrado' },
        })
      }
      wallet.address = address
    }
    if (label !== undefined) wallet.label = label
    if (network !== undefined) wallet.network = network
    if (provider !== undefined) wallet.provider = provider
    if (ensName !== undefined) wallet.ensName = ensName || null
    if (isPrimary === true) for (const w of list) w.isPrimary = w.id === wallet.id
    commit()
    return HttpResponse.json(wallet)
  }),

  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const db = getDb()
    const list = userWallets(auth.user.id)
    const wallet = list.find((w) => w.id === params.id)
    if (!wallet) return apiError('not_found', 'Carteira não encontrada.')
    db.wallets[auth.user.id] = list.filter((w) => w.id !== wallet.id)
    const remaining = db.wallets[auth.user.id] ?? []
    if (wallet.isPrimary && remaining[0]) remaining[0].isPrimary = true
    db.connectedWallets[auth.user.id] = (db.connectedWallets[auth.user.id] ?? []).filter(
      (id) => id !== wallet.id,
    )
    commit()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/wallets/:id/connect', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const wallet = userWallets(auth.user.id).find((w) => w.id === params.id)
    if (!wallet) return apiError('not_found', 'Carteira não encontrada.')
    await delay(800) // aprovação na carteira
    if (getScenario().walletConnectionRefused) {
      return apiError('wallet_connection_refused', 'A carteira recusou a conexão.')
    }
    const db = getDb()
    const connected = (db.connectedWallets[auth.user.id] ??= [])
    if (!connected.includes(wallet.id)) connected.push(wallet.id)
    commit()
    return HttpResponse.json({ walletId: wallet.id, connected: true } satisfies WalletConnection)
  }),

  http.delete('/api/wallets/:id/connection', async ({ request, params }) => {
    const blocked = await gate()
    if (blocked) return blocked
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const db = getDb()
    db.connectedWallets[auth.user.id] = (db.connectedWallets[auth.user.id] ?? []).filter(
      (id) => id !== params.id,
    )
    commit()
    return HttpResponse.json({ walletId: String(params.id), connected: false } satisfies WalletConnection)
  }),
]
