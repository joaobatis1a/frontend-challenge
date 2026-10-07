import { test, expect } from '@playwright/test'
import { addFromDetail, loginAt, start } from './helpers'

test.describe('compra', () => {
  test('6. compra completa: catálogo → detalhe → carrinho → pagamento → recibo confirmado', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana')

    // Catálogo → detalhe
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await addFromDetail(page, 'nft-01', 2)

    // Carrinho (COMPRAR leva ao carrinho no desktop; no mobile navegamos)
    await page.goto('/cart')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).first().click()

    // Pagamento
    await expect(page).toHaveURL(/\/checkout/)
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('Principal conectada')).toBeVisible()
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
})
