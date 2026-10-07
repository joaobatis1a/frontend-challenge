import { test, expect } from '@playwright/test'
import { login, loginAt, logout, mock, start } from './helpers'

test.describe('conta e sessão', () => {
  test('3. cadastro (com conflito), login, expiração de sessão, logout e troca de usuário', async ({ page }) => {
    await start(page)

    // Cadastro com e-mail já usado → erro da API no campo
    await page.goto('/signup')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome de usuário').fill('carla_c')
    await dialog.getByLabel('E-mail').fill('ana@example.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('Senha@789')
    await dialog.getByLabel('Confirmar senha').fill('Senha@789')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado')).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')

    await dialog.getByLabel('E-mail').fill('carla@example.com')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('link', { name: 'carla_c' })).toBeVisible()

    // Sessão recuperada após refresh
    await page.reload()
    await expect(page.getByRole('link', { name: 'carla_c' })).toBeVisible()

    // Logout
    await logout(page)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

    // Login com retorno ao fluxo anterior
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Colecionadora')

    // Expiração durante a navegação → login preservando o destino
    await mock(page, 'expireSession')
    await page.goto('/wallets')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets|\/login\?redirect=\/wallets/)
    await expect(page.getByText(/Sua sessão expirou/).first()).toBeVisible()
    await login(page, 'ana')
    await expect(page).toHaveURL(/\/wallets$/)

    // Troca de usuário: dados privados do anterior não aparecem
    await page.goto('/profile#favoritos')
    await expect(page.getByText('Neon Vessel #552')).toBeVisible() // favorito da Ana
    await logout(page)
    await loginAt(page, 'bruno', '/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Bruno Colecionador')
    await expect(page.getByText('Violet Nomad #314')).toBeVisible() // favorito do Bruno
    await expect(page.getByText('Neon Vessel #552')).toHaveCount(0)
  })

  test('3c. sessão expira pela passagem do tempo (relógio controlado)', async ({ page }) => {
    // O relógio da página é controlado: a sessão simulada dura 1 h.
    await page.clock.install()
    await start(page)
    await loginAt(page, 'ana', '/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Colecionadora')

    await page.clock.fastForward('01:01:00')
    // A próxima requisição autenticada recebe session_expired. Ela pode vir da
    // própria reconciliação do app (o socket reconecta ao avançar o relógio) ou
    // da navegação abaixo, se o app ainda estiver na mesma tela.
    const walletsLink = page.getByRole('link', { name: 'Carteiras', exact: true }).first()
    if (await walletsLink.isVisible()) await walletsLink.click().catch(() => undefined)
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await expect(page.getByText(/Sua sessão expirou/).first()).toBeVisible()
    await login(page, 'ana')
    // Volta para onde estava quando a sessão expirou.
    await expect(page).toHaveURL(/\/(profile|wallets)$/)
  })

  test('3b. credenciais inválidas mostram erro sem sair do login @mobile', async ({ page }) => {
    await start(page, { path: '/login' })
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('ana@example.com')
    await dialog.getByLabel('Senha', { exact: true }).fill('errada')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
    await expect(page).toHaveURL(/\/login/)
  })
})
