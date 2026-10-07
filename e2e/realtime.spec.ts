import { test, expect } from '@playwright/test'
import { addFromDetail, apiAsUser, goToReview, loginAt, mock, start } from './helpers'

/**
 * Os eventos saem do "servidor" simulado (MSW + @mswjs/socket.io-binding) e
 * chegam pelo socket.io-client do app. Os testes só acionam o servidor
 * (window.__mock) e observam a interface.
 */
test.describe('tempo real (Socket.IO)', () => {
  test('9. alteração de preço e disponibilidade durante o checkout @mobile', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-01')
    await expect.poll(() => mock<number>(page, 'socket.connections')).toBe(1)

    // No carrinho: a interface avisa e atualiza o resumo
    await page.goto('/cart')
    await expect(page.locator('dd[aria-live="polite"]:visible')).toHaveText('1.206 ETH')
    await mock(page, 'updateEdition', 'nft-01', 'nft-01-std', { priceEth: '1.5' })
    await expect(page.getByText(/Preço atualizado: era 1.19 ETH, agora 1.5 ETH/)).toBeVisible()
    await expect(page.locator('dd[aria-live="polite"]:visible')).toHaveText('1.516 ETH')

    // No checkout: a cotação revisada fica desatualizada e exige nova confirmação
    const review = await goToReview(page)
    await mock(page, 'updateEdition', 'nft-01', 'nft-01-std', { priceEth: '1.75' })
    await expect(review.getByText(/Os valores mudaram desde a sua revisão/)).toBeVisible()
    await expect(review.getByText('1.766 ETH').filter({ visible: true }).first()).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar novos valores' }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('1.766 ETH').filter({ visible: true }).first()).toBeVisible()

    // Esgotou: o carrinho mostra o problema e bloqueia a finalização
    await addFromDetail(page, 'nft-02')
    await page.goto('/cart')
    await mock(page, 'updateEdition', 'nft-02', 'nft-02-std', { available: 0 })
    await expect(page.getByText(/está esgotado/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('9b. preço muda no servidor entre a revisão e o envio (cenário price-changed)', async ({ page }) => {
    await start(page, { scenario: 'price-changed' })
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-01')
    const review = await goToReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(review.getByText(/Os valores mudaram/)).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar novos valores' }).click()
    await expect(page).toHaveURL(/\/orders\//, { timeout: 10_000 })
  })

  test('10. eventos duplicados e antigos, desconexão e retomada de pedido pendente', async ({ page }) => {
    test.setTimeout(60_000)
    await start(page, { path: '/nft/nft-03' })
    const price = page.locator('main p.text-2xl')
    await expect(price).toHaveText('1.99 ETH')
    await expect.poll(() => mock<number>(page, 'socket.connections')).toBe(1)

    await mock(page, 'updateEdition', 'nft-03', 'nft-03-std', { priceEth: '2.2' })
    await expect(price).toHaveText('2.2 ETH')

    // Duplicado (mesmo eventId) e antigo (versão menor, preço 999): ignorados
    await mock(page, 'socket.replayLast')
    await mock(page, 'socket.emitStale', 'nft-03')
    await page.waitForTimeout(500)
    await expect(price).toHaveText('2.2 ETH')

    // Desconexão: o evento se perde, mas a reconexão reconcilia com a API REST
    await mock(page, 'socket.disconnect')
    await mock(page, 'updateEdition', 'nft-03', 'nft-03-std', { priceEth: '2.5' })
    await expect.poll(() => mock<number>(page, 'socket.connections'), { timeout: 10_000 }).toBe(1)
    await expect(price).toHaveText('2.5 ETH')

    // Pedido pendente + queda + refresh: recupera o estado sem nova compra
    await mock(page, 'setScenario', 'slow-payment')
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-02')
    const review = await goToReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByText('Aguardando confirmação do pagamento')).toBeVisible()
    const url = page.url()
    await mock(page, 'socket.disconnect')
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByText('Aguardando confirmação do pagamento')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    const orders = await apiAsUser<unknown[]>(page, '/api/orders')
    expect(orders.json).toHaveLength(1)
  })
})
