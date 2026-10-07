import { defineConfig, devices } from '@playwright/test'

// Em ambientes onde o Chromium já está instalado em outro caminho, defina
// PW_CHROMIUM_PATH. Em máquina comum basta rodar `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH
// E2E_BASE_URL roda a suíte contra outro endereço (ex.: o deploy) sem subir o preview local.
const externalBaseUrl = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  // Cada teste reinicia o banco simulado (window.__mock.reset), então rodam em série.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    // Regressão visual: tolera pequenas diferenças de antialiasing.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  // Baselines versionadas, sem o sufixo do sistema operacional.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}-{projectName}{ext}',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseUrl ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173',
        // Sempre um build novo: reaproveitar um preview antigo testaria código desatualizado.
        reuseExistingServer: false,
        timeout: 180_000,
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // No mobile rodam os fluxos principais (marcados com @mobile no título).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
})
