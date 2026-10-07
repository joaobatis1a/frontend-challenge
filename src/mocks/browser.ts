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

/** Prepara banco, cenário e controles e liga o service worker. */
export async function startMocks(): Promise<void> {
  initScenario()
  await initDb()
  installControls()
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  settleDueOrders()
}
