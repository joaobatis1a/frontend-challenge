import { expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@example.com', password: 'Senha@123', name: 'Ana' },
  bruno: { email: 'bruno@example.com', password: 'Senha@456', name: 'Bruno' },
} as const

/** Controles da API simulada (window.__mock). */
export async function mock<T>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ([path, params]) => {
      const parts = (path as string).split('.')
      let target: any = (window as any).__mock
      let owner: any = target
      for (const p of parts) {
        owner = target
        target = target[p]
      }
      return target.apply(owner, params)
    },
    [fn, args] as const,
  )
}

/**
 * Estado isolado: abre o app, restaura o banco simulado, escolhe o cenário e
 * limpa a sessão/carrinho do navegador. Cada teste começa do zero.
 */
export async function start(page: Page, opts: { scenario?: string; path?: string } = {}) {
  await page.goto('/')
  await page.waitForFunction(() => Boolean((window as any).__mock))
  await page.evaluate(async (scenario) => {
    localStorage.clear()
    sessionStorage.clear()
    await (window as any).__mock.reset()
    ;(window as any).__mock.setScenario(scenario)
  }, opts.scenario ?? 'default')
  await page.goto(opts.path ?? '/')
  await page.waitForFunction(() => Boolean((window as any).__mock))
}

export async function login(page: Page, user: keyof typeof USERS = 'ana') {
  const { email, password } = USERS[user]
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

/** Abre o login direto pela URL e entra. */
export async function loginAt(page: Page, user: keyof typeof USERS = 'ana', redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await login(page, user)
}

/** Adiciona um NFT ao carrinho pela página de detalhe (edição padrão). */
export async function addFromDetail(page: Page, nftId: string, quantity = 1) {
  await page.goto(`/nft/${nftId}`)
  const isMobile = (page.viewportSize()?.width ?? 1440) < 768
  const scope = isMobile ? page.locator('.fixed.bottom-0') : page.locator('main')
  for (let i = 1; i < quantity; i += 1) await scope.getByRole('button', { name: 'Aumentar quantidade' }).first().click()
  await page.getByRole('button', { name: isMobile ? 'Adicionar ao carrinho' : 'COMPRAR', exact: true }).click()
  await expect(page.getByText(/adicionado ao carrinho/)).toBeVisible()
}

export const isMobileProject = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768
