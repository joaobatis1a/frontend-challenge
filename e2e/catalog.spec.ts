import { test, expect, type Page } from '@playwright/test'
import { isMobileProject, mock, start } from './helpers'

const cardNames = (page: Page) => page.locator('#mercado article h3')
const cardPrices = async (page: Page) =>
  (await page.locator('#mercado article h3 + p').allInnerTexts()).map((t) => Number(t.split(' ')[0]))

test.describe('catálogo', () => {
  test('1. busca, filtros combinados, ordenação, paginação e restauração pelo histórico', async ({ page }) => {
    await start(page)
    await expect(cardNames(page).first()).toHaveText('Emerald Ape #042')

    // Busca (com debounce) vai para a URL e para a API
    const searchRequest = page.waitForRequest((r) => r.url().includes('/api/nfts?') && r.url().includes('q=ivory'))
    await page.getByLabel('Buscar NFTs, coleções ou criadores').fill('ivory')
    await searchRequest
    await expect(page).toHaveURL(/q=ivory/)
    await expect(cardNames(page).first()).toContainText('Ivory')
    for (const name of await cardNames(page).allInnerTexts()) expect(name).toContain('Ivory')

    // Filtros combinados: a consulta enviada reflete todos os parâmetros
    await page.getByLabel('Buscar NFTs, coleções ou criadores').fill('')
    await expect(page).not.toHaveURL(/q=/)
    const comboRequest = page.waitForRequest(
      (r) => r.url().includes('category=music') && r.url().includes('network=polygon'),
    )
    await page.getByRole('button', { name: /^Música/ }).click()
    await page.getByRole('button', { name: /^Polygon/ }).click()
    await comboRequest
    await expect(page).toHaveURL(/category/)
    await expect(page).toHaveURL(/network/)
    await expect(page.getByRole('button', { name: 'Remover filtro Música' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).first().click()

    // Ordenação por menor preço
    await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price_asc/)
    await expect.poll(async () => {
      const prices = await cardPrices(page)
      return prices.length > 0 && prices.every((p, i) => i === 0 || p >= prices[i - 1]!)
    }).toBe(true)

    // Paginação e histórico
    const firstOfPage1 = await cardNames(page).first().innerText()
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(cardNames(page).first()).not.toHaveText(firstOfPage1)
    const firstOfPage2 = await cardNames(page).first().innerText()

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(cardNames(page).first()).toHaveText(firstOfPage1)
    await page.goForward()
    await expect(cardNames(page).first()).toHaveText(firstOfPage2)

    // Sobrevive ao refresh
    await page.reload()
    await expect(page).toHaveURL(/sort=price_asc.*page=2|page=2.*sort=price_asc/)
    await expect(cardNames(page).first()).toHaveText(firstOfPage2)

    // Mudar filtro reinicia a paginação
    await page.getByRole('button', { name: /^Fotografia/ }).click()
    await expect(page).not.toHaveURL(/page=/)
  })

  test('1b. busca no mobile e filtros na gaveta @mobile', async ({ page }) => {
    test.skip(!isMobileProject(page), 'cenário específico do mobile')
    await start(page)
    await page.getByLabel('Explorar coleções').fill('nomad')
    await expect(page).toHaveURL(/q=nomad/)
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/network/)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })

  test('2. acesso direto ao detalhe, NFT inexistente, edição indisponível e limite de quantidade @mobile', async ({ page }) => {
    await start(page, { path: '/nft/nft-05' })
    await expect(page.getByRole('heading', { level: 1, name: 'Violet Nomad #314' })).toBeVisible()

    // Edição esgotada (nft-13 tem a edição 1/50 sem estoque)
    await page.goto('/nft/nft-13')
    await page.getByRole('radio', { name: /1\/50/ }).click()
    await expect(page.getByText('Edição esgotada')).toBeVisible()

    // Limite de quantidade (nft-11, edição aberta, só 2 disponíveis)
    await page.goto('/nft/nft-11')
    // getByRole ignora o controle escondido (desktop x barra mobile): sobra o visível.
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await expect(page.locator('output[aria-label="Quantidade"]:visible')).toHaveText('2')
    await expect(plus).toBeDisabled()

    // Inexistente
    await page.goto('/nft/nft-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('12. skeletons durante carregamento lento, feedback de falha e recuperação @mobile', async ({ page }) => {
    await start(page, { scenario: 'slow' })
    await expect(page.getByRole('list', { name: 'Carregando NFTs' })).toBeVisible()
    await expect(cardNames(page).first()).toBeVisible({ timeout: 10_000 })

    await mock(page, 'setScenario', 'offline')
    await page.reload()
    await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({ timeout: 15_000 })

    await mock(page, 'setScenario', 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cardNames(page).first()).toHaveText('Emerald Ape #042')
  })
})
