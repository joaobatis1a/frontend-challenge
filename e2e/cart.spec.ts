import { test, expect } from '@playwright/test'
import { addFromDetail, login, mock, start } from './helpers'

test.describe('favoritos e carrinho', () => {
  test('4. favoritos: persistência, falha da mutation com rollback e recuperação', async ({ page }) => {
    await start(page)
    await page.goto('/login?redirect=/nft/nft-01')
    await login(page, 'ana')
    await expect(page).toHaveURL(/nft-01/)

    const fav = page.getByRole('button', { name: 'Favoritar', exact: true })
    await fav.click()
    await expect(page.getByText('Adicionado aos favoritos')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')

    // Falha: o estado otimista volta ao anterior
    await mock(page, 'setScenario', 'favorite-fails')
    await page.getByRole('button', { name: 'Favoritado' }).click()
    await expect(page.getByText(/O favorito voltou ao estado anterior/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute('aria-pressed', 'true')

    // Recuperação
    await mock(page, 'setScenario', 'default')
    await page.getByRole('button', { name: 'Favoritado' }).click()
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toBeVisible()
  })

  test('5. carrinho: quantidades, remoção, cupom e persistência após refresh e login @mobile', async ({ page }) => {
    await start(page)
    await addFromDetail(page, 'nft-01', 2)
    await addFromDetail(page, 'nft-05')
    await page.goto('/cart')

    const total = page.locator('dd[aria-live="polite"]:visible')
    await expect(total).toHaveText('3.786 ETH') // 2 × 1.19 + 1.39 + taxa 0.016

    // Alterar quantidade → nova cotação da API
    await page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(total).toHaveText('4.976 ETH')

    // Remover item
    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click()
    await expect(page.getByText('Violet Nomad #314')).toHaveCount(0)
    await expect(total).toHaveText('3.586 ETH')

    // Cupom inválido, expirado e válido
    const coupon = page.getByRole('textbox', { name: 'Código promocional' })
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom inválido')).toBeVisible()
    await coupon.fill('EXPIRED20')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom expirado')).toBeVisible()
    await coupon.fill('welcome10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('WELCOME10', { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(total).toHaveText('3.229 ETH') // 3.57 − 10% + 0.016

    // Persistência após refresh
    await page.reload()
    await expect(total).toHaveText('3.229 ETH')

    // Login mescla o carrinho do visitante
    await page.goto('/login?redirect=/cart')
    await login(page, 'bruno')
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByText('Emerald Ape #042').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).locator('output')).toHaveText('3')
  })
})
