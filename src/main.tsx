import './index.css'

/**
 * IMPORTANTE: o MSW precisa iniciar ANTES de qualquer código que use WebSocket.
 * O socket.io-client guarda o `WebSocket` nativo quando o módulo é carregado,
 * então o app (que importa o socket.io-client) só é importado depois que o
 * worker trocou essa referência.
 *
 * Os mocks ligam por configuração: `VITE_ENABLE_MOCKS` (padrão: ligado, pois
 * esta entrega não tem backend real).
 */
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }

  const [{ StrictMode }, { createRoot }, { App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./app/App'),
  ])
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
