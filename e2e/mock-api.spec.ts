import { test, expect, type Page } from '@playwright/test'

/** Chama a API pelo navegador (passa pelo MSW, como o app faz). */
async function api(page: Page, method: string, path: string, opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
  return page.evaluate(
    async ({ method, path, opts }) => {
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
          ...(opts.headers ?? {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      })
      const text = await res.text()
      return { status: res.status, json: text ? JSON.parse(text) : null }
    },
    { method, path, opts },
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => Boolean((window as any).__mock))
  await page.evaluate(() => (window as any).__mock.reset())
})

test('catálogo: paginação, busca sem acento e ordenação por preço', async ({ page }) => {
  const list = await api(page, 'GET', '/api/nfts')
  expect(list.status).toBe(200)
  expect(list.json.items).toHaveLength(12)
  expect(list.json.total).toBe(48)

  const search = await api(page, 'GET', '/api/nfts?q=mare&sort=price_asc')
  expect(search.json.query.q).toBe('mare')
  const prices = search.json.items.map((i: any) => Number(i.priceFromEth))
  expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  expect(search.json.items.every((i: any) => /mar[eé]/i.test(i.name))).toBe(true)
})

test('login, carrinho, cotação e pedido idempotente', async ({ page }) => {
  const login = await api(page, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'Senha@123' } })
  expect(login.status).toBe(200)
  const token = login.json.token

  const bad = await api(page, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'x' } })
  expect(bad.json.code).toBe('invalid_credentials')

  const add = await api(page, 'POST', '/api/cart/items', { token, body: { nftId: 'nft-01', editionId: 'nft-01-std', quantity: 2 } })
  expect(add.status).toBe(201)

  const quote = await api(page, 'POST', '/api/cart/quote', { token, body: { network: 'polygon' } })
  expect(quote.status).toBe(200)
  expect(quote.json.issues).toEqual([])

  const wallets = await api(page, 'GET', '/api/wallets', { token })
  const orderBody = {
    collector: { fullName: 'Ana Colecionadora', email: 'ana@example.com', country: 'Brasil' },
    walletId: wallets.json[0].id,
    network: 'polygon',
    quoteFingerprint: quote.json.fingerprint,
    expectedTotalEth: quote.json.totalEth,
  }
  const headers = { 'Idempotency-Key': 'abc-123' }
  const first = await api(page, 'POST', '/api/orders', { token, body: orderBody, headers })
  expect(first.status).toBe(201)
  expect(first.json.status).toBe('pending')

  const repeat = await api(page, 'POST', '/api/orders', { token, body: orderBody, headers })
  expect(repeat.status).toBe(200)
  expect(repeat.json.id).toBe(first.json.id)

  const conflict = await api(page, 'POST', '/api/orders', { token, body: { ...orderBody, country: 'x', collector: { ...orderBody.collector, country: 'Chile' } }, headers })
  expect(conflict.json.code).toBe('idempotency_conflict')

  // O carrinho foi esvaziado e só existe um pedido.
  const cart = await api(page, 'GET', '/api/cart', { token })
  expect(cart.json.lines).toEqual([])
  const orders = await api(page, 'GET', '/api/orders', { token })
  expect(orders.json).toHaveLength(1)

  // Outro usuário não enxerga o pedido.
  const other = await api(page, 'POST', '/api/auth/login', { body: { email: 'bruno@example.com', password: 'Senha@456' } })
  const peek = await api(page, 'GET', `/api/orders/${first.json.id}`, { token: other.json.token })
  expect(peek.status).toBe(404)

  // Pedido é confirmado depois do tempo do cenário.
  await expect
    .poll(async () => (await api(page, 'GET', `/api/orders/${first.json.id}`, { token })).json.status, { timeout: 5000 })
    .toBe('confirmed')
})

test('cotação desatualizada devolve 409 quote_outdated', async ({ page }) => {
  const login = await api(page, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'Senha@123' } })
  const token = login.json.token
  await api(page, 'POST', '/api/cart/items', { token, body: { nftId: 'nft-01', editionId: 'nft-01-std', quantity: 1 } })
  const quote = await api(page, 'POST', '/api/cart/quote', { token, body: { network: 'ethereum' } })
  await page.evaluate(() => (window as any).__mock.updateEdition('nft-01', 'nft-01-std', { priceEth: '9.5' }))
  const wallets = await api(page, 'GET', '/api/wallets', { token })
  const res = await api(page, 'POST', '/api/orders', {
    token,
    headers: { 'Idempotency-Key': 'k1' },
    body: {
      collector: { fullName: 'Ana Colecionadora', email: 'ana@example.com', country: 'Brasil' },
      walletId: wallets.json[0].id,
      network: 'ethereum',
      quoteFingerprint: quote.json.fingerprint,
      expectedTotalEth: quote.json.totalEth,
    },
  })
  expect(res.status).toBe(409)
  expect(res.json.code).toBe('quote_outdated')
  expect(res.json.details.quote.lines[0].unitPriceEth).toBe('9.5')
})

test('carrinho de visitante é mesclado no login', async ({ page }) => {
  const guest = { 'X-Guest-Cart-Id': 'guest-1' }
  await api(page, 'POST', '/api/cart/items', { headers: guest, body: { nftId: 'nft-02', editionId: 'nft-02-std', quantity: 3 } })
  const login = await api(page, 'POST', '/api/auth/login', {
    body: { email: 'bruno@example.com', password: 'Senha@456', guestCartId: 'guest-1' },
  })
  const cart = await api(page, 'GET', '/api/cart', { token: login.json.token })
  expect(cart.json.lines[0].quantity).toBe(3)
  const gone = await api(page, 'GET', '/api/cart', { headers: guest })
  expect(gone.json.lines).toEqual([])
})

test('limites de estoque e validações', async ({ page }) => {
  const login = await api(page, 'POST', '/api/auth/login', { body: { email: 'ana@example.com', password: 'Senha@123' } })
  const token = login.json.token
  const over = await api(page, 'POST', '/api/cart/items', { token, body: { nftId: 'nft-11', editionId: 'nft-11-std', quantity: 3 } })
  expect(over.status).toBe(409)
  expect(over.json.code).toBe('availability_conflict')
  const soldOut = await api(page, 'POST', '/api/cart/items', { token, body: { nftId: 'nft-07', editionId: 'nft-07-std', quantity: 1 } })
  expect(soldOut.json.code).toBe('availability_conflict')
  const invalid = await api(page, 'POST', '/api/auth/signup', { body: { name: 'A', email: 'x', password: '123' } })
  expect(invalid.status).toBe(422)
  expect(Object.keys(invalid.json.fieldErrors)).toEqual(expect.arrayContaining(['name', 'email', 'password']))
  const coupon = await api(page, 'PUT', '/api/cart/coupon', { token, body: { code: 'expired20' } })
  expect(coupon.json.code).toBe('coupon_expired')
})

test('socket: o app mantém uma única conexão Socket.IO e reconecta após queda', async ({ page }) => {
  const connections = () => page.evaluate(() => (window as any).__mock.socket.connections())
  await expect.poll(connections).toBe(1)
  expect(await page.evaluate(() => (window as any).__mock.socket.disconnect())).toBe(1)
  await expect.poll(connections, { timeout: 5000 }).toBe(1)
})

test('carteiras: limite de 2 e endereço duplicado', async ({ page }) => {
  const login = await api(page, 'POST', '/api/auth/login', { body: { email: 'bruno@example.com', password: 'Senha@456' } })
  const token = login.json.token
  const addr = '0x' + 'a'.repeat(40)
  const ok = await api(page, 'POST', '/api/wallets', { token, body: { label: 'Segunda', address: addr, network: 'ethereum' } })
  expect(ok.status).toBe(201)
  const dup = await api(page, 'POST', '/api/wallets', { token, body: { label: 'Outra', address: addr, network: 'ethereum' } })
  expect(dup.json.code === 'wallet_address_taken' || dup.status === 422).toBe(true)
  const limit = await api(page, 'POST', '/api/wallets', { token, body: { label: 'Terceira', address: '0x' + 'b'.repeat(40), network: 'ethereum' } })
  expect(limit.status).toBe(422)
})
