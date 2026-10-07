import { test, expect, type Page } from '@playwright/test'
import { addFromDetail, loginAt, start } from './helpers'

/**
 * Regressão visual com dados estáveis (seed determinístico, cenário default).
 * Baselines em e2e/__screenshots__. Para atualizar: npm run test:e2e -- --update-snapshots
 * (o antialiasing de fontes varia entre sistemas; gere as baselines no mesmo SO do CI).
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  // Toasts não fazem parte da tela
  await page.evaluate(() => document.querySelectorAll('[data-sonner-toaster]').forEach((t) => t.remove()))
  // Carrega as imagens lazy antes do print de página inteira
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 30))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
}

test.describe('regressão visual', () => {
  test('início @mobile', async ({ page }) => {
    await start(page)
    await expect(page.locator('#mercado article h3').first()).toHaveText('Emerald Ape #042')
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe @mobile', async ({ page }) => {
    await start(page, { path: '/nft/nft-01' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emerald Ape #042')
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho @mobile', async ({ page }) => {
    await start(page)
    await addFromDetail(page, 'nft-01', 2)
    await addFromDetail(page, 'nft-05')
    await page.goto('/cart')
    await expect(page.locator('dd[aria-live="polite"]:visible')).toHaveText('3.786 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento @mobile', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana')
    await addFromDetail(page, 'nft-01', 2)
    await page.goto('/checkout')
    await expect(page.getByRole('radio', { name: /Principal/ })).toBeVisible()
    await expect(page.locator('dd[aria-live="polite"]:visible')).toHaveText('2.396 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
