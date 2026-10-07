import './index.css'

// IMPORTANTE: o MSW precisa iniciar ANTES de qualquer código que use WebSocket.
// O socket.io-client guarda o `WebSocket` nativo quando o módulo é carregado,
// então ele só pode ser importado depois que o worker trocou essa referência.
// (Provisório: será substituído pelo bootstrap real do app.)
async function bootstrap() {
  const { startMocks } = await import('./mocks/browser')
  await startMocks()

  const { io } = await import('socket.io-client')
  const root = document.getElementById('root')!
  root.innerHTML = '<p id="sock">socket: ...</p><ul id="events"></ul>'

  const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] })
  socket.on('connect', () => {
    document.getElementById('sock')!.textContent = 'socket: connected'
    socket.emit('session.subscribe', { token: null })
  })
  socket.on('session.subscribed', (msg) => {
    document.getElementById('sock')!.textContent = `socket: subscribed ${JSON.stringify(msg)}`
  })
  socket.on('nft.updated', (e) => {
    const li = document.createElement('li')
    li.textContent = `${e.resourceId}@${e.version}`
    document.getElementById('events')!.appendChild(li)
  })
}

bootstrap()
