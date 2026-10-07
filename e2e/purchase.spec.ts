import { test, expect } from '@playwright/test'
import { addFromDetail, apiAsUser, goToReview, loginAt, start } from './helpers'

test.describe('compra', () => {
  test('6. compra completa: catálogo → detalhe → carrinho → pagamento → recibo confirmado @mobile', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana')

    // Catálogo → detalhe
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await addFromDetail(page, 'nft-01', 2)

    // Carrinho
    await page.goto('/cart')
    await expect(page.getByText('Emerald Ape #042').filter({ visible: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()

    // Pagamento
    await expect(page).toHaveURL(/\/checkout/)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    // Revisão e envio
    const review = page.getByRole('dialog', { name: 'Revise sua compra' })
    await expect(review).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

    // Pendente → confirmado (evento order.updated pelo Socket.IO)
    await expect(page.getByText('Aguardando confirmação do pagamento')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('cell', { name: /Emerald Ape #042/ })).toBeVisible()
    await expect(page.getByText('(x 2)')).toBeVisible()

    // Itens comprados saíram do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('7a. pagamento recusado preserva os itens no carrinho', async ({ page }) => {
    await start(page, { scenario: 'payment-rejected' })
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-02')
    const review = await goToReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByText('Sage Nomad #009').filter({ visible: true }).first()).toBeVisible()
  })

  test('7b. clique repetido não duplica o pedido', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-02')
    const review = await goToReview(page)
    const confirm = review.getByRole('button', { name: 'Confirmar e pagar' })
    // Dois cliques seguidos: o botão trava no 1º e a chave de idempotência protege o resto.
    await confirm.dblclick()
    await expect(page).toHaveURL(/\/orders\//, { timeout: 10_000 })
    const orders = await apiAsUser<unknown[]>(page, '/api/orders')
    expect(orders.json).toHaveLength(1)
  })

  test('7c. timeout após criar o pedido: o reenvio recupera o MESMO pedido', async ({ page }) => {
    test.setTimeout(60_000)
    await start(page, { scenario: 'order-timeout' })
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-02')
    const review = await goToReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    // A 1ª resposta nunca chega; o cliente reenvia com a mesma Idempotency-Key.
    await expect(page).toHaveURL(/\/orders\/ord-0001/, { timeout: 25_000 })
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10_000 })
    const orders = await apiAsUser<unknown[]>(page, '/api/orders')
    expect(orders.json).toHaveLength(1)
  })
})
