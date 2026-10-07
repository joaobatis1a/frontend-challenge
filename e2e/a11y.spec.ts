import { test, expect } from '@playwright/test'
import { start } from './helpers'

test.describe('acessibilidade', () => {
  test('11. navegação por teclado, foco em diálogos e validação de formulários', async ({ page }) => {
    await start(page)

    // O link "pular para o conteúdo" é o primeiro da ordem de tabulação (antes do logo)
    await page.getByRole('link', { name: 'Kurio, página inicial' }).focus()
    await page.keyboard.press('Shift+Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()

    // Card acessível por teclado: foco revela as ações
    await page.goto('/nft/nft-01')
    const zoom = page.getByRole('button', { name: 'Ampliar imagem' })
    await zoom.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
    await expect(dialog).toBeVisible()
    // Foco preso no diálogo
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(zoom).toBeFocused() // foco volta ao gatilho

    // Escolha de edição e quantidade só com teclado
    await page.getByRole('radio', { name: '1/50' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('radio', { name: '1/50' })).toHaveAttribute('aria-checked', 'true')

    // Login: foco dentro do modal, validação ligada aos campos, Esc fecha
    await page.goto('/login')
    const login = page.getByRole('dialog')
    await expect(login).toBeVisible()
    expect(await login.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await login.getByRole('button', { name: 'Entrar', exact: true }).press('Enter')
    const email = login.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()
    await expect(email).toHaveAccessibleDescription('E-mail inválido')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
  })
})
