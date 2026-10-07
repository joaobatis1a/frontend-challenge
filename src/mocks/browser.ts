import { setupWorker } from 'msw/browser'
import { installControls } from './controls'
import { initDb } from './db'
import { settleDueOrders } from './domain/orders'
import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { orderHandlers } from './handlers/orders'
import { initScenario } from './scenarios'
import { socketHandlers } from './socket'

export const worker = setupWorker(
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...socketHandlers,
)

/** Prepara banco e cenário, liga o service worker e só então expõe os controles. */
export async function startMocks(): Promise<void> {
  initScenario()
  await initDb()
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // window.__mock só existe depois que o worker intercepta as requisições:
  // quem espera por ele (testes, painel) pode chamar a API com segurança.
  installControls()
  settleDueOrders()
}
