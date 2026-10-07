import { test, expect } from '@playwright/test'
import { loginAt, logout, start } from './helpers'

// PNG 1×1 transparente
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('perfil e carteiras', () => {
  test('8. edição de perfil, avatar, senha e carteiras, com erros de validação @mobile', async ({ page }) => {
    await start(page)
    await loginAt(page, 'ana', '/profile')
    const form = page.getByRole('form', { name: 'Dados do perfil' })

    // Validação no cliente e erro da API (nome de usuário em uso)
    await form.getByLabel('Nome de exibição').fill('A')
    await form.getByLabel('Nome de usuário').fill('bruno_c')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('Informe seu nome')).toBeVisible()
    await form.getByLabel('Nome de exibição').fill('Ana Souza')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('Este nome de usuário já está em uso')).toBeVisible()

    // Sucesso e persistência após refresh
    await form.getByLabel('Nome de usuário').fill('ana_souza')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado')).toBeVisible()
    await page.reload()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana Souza')

    // Avatar
    await page.getByLabel('Escolher imagem de avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

    // Senha: confirmação diferente, senha atual errada e sucesso
    await form.getByLabel('Senha atual').fill('errada')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await form.getByLabel('Confirmar nova senha').fill('Outra123')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('As senhas não coincidem')).toBeVisible()
    await form.getByLabel('Confirmar nova senha').fill('NovaSenha1')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('Senha atual incorreta')).toBeVisible()
    await form.getByLabel('Senha atual').fill('Senha@123')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil e senha atualizados')).toBeVisible()

    // Carteiras (Bruno só tem a principal)
    await logout(page)
    await loginAt(page, 'bruno', '/wallets')
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const newWallet = page.getByRole('form', { name: 'Nova carteira' })
    await newWallet.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(newWallet.getByText('Dê um nome à carteira')).toBeVisible()
    await expect(newWallet.getByText(/Endereço inválido/)).toBeVisible()
    await expect(newWallet.getByRole('combobox', { name: 'Rede' })).toHaveAccessibleDescription('Selecione uma rede')

    await newWallet.getByLabel('Apelido da carteira').fill('Reserva')
    await newWallet.getByLabel('Endereço da carteira').fill('0x2222222222222222222222222222222222222222') // já é da Ana
    await newWallet.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Polygon' }).click()
    await newWallet.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await newWallet.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(newWallet.getByText('Este endereço já está cadastrado')).toBeVisible()

    await newWallet.getByLabel('Endereço da carteira').fill('0x' + 'b'.repeat(40))
    await newWallet.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira cadastrada')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('form', { name: 'Editar Reserva' })).toBeVisible()
  })
})
