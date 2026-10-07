import { defineConfig, devices } from '@playwright/test'

// Em ambientes onde o Chromium já está instalado em outro caminho, defina
// PW_CHROMIUM_PATH. Em máquina comum basta rodar `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH

const use = {
  baseURL: 'http://localhost:4173',
  trace: 'retain-on-failure' as const,
  launchOptions: executablePath ? { executablePath } : {},
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use,
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
