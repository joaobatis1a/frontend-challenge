import './index.css'

/**
 * IMPORTANTE: o MSW precisa iniciar ANTES de qualquer código que use WebSocket.
 * O socket.io-client guarda o `WebSocket` nativo quando o módulo é carregado,
 * por isso ele é importado de forma dinâmica no RealtimeProvider, que só monta
 * depois que o worker trocou essa referência.
 *
 * Os mocks ligam por configuração: `VITE_ENABLE_MOCKS` (padrão: ligado, pois
 * esta entrega não tem backend real).
 */
async function bootstrap() {
  // O app começa a baixar já, em paralelo com o MSW (ele não abre WebSocket ao carregar).
  const appModules = Promise.all([import('react'), import('react-dom/client'), import('./app/App')])

  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }

  const [{ StrictMode }, { createRoot }, { App }] = await appModules
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Painel de cenários da demonstração (camada de mocks, raiz React separada do app).
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false' && !navigator.webdriver) {
    const { MockPanel } = await import('./mocks/MockPanel')
    const el = document.createElement('div')
    document.body.appendChild(el)
    createRoot(el).render(<MockPanel />)
  }
}

void bootstrap()
