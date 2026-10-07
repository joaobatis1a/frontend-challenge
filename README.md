# Kurio — Marketplace de NFTs

Implementação do [desafio frontend](https://github.com/junglegaming/frontend-challenge): marketplace de NFTs com descoberta, compra e conta do colecionador, em desktop e mobile, seguindo o layout do Figma.

- **Aplicação publicada:** https://frontend-challenge-kurio.vercel.app
- **Repositório:** https://github.com/joaobatis1a/frontend-challenge
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/summary.md](./lighthouse/summary.md)

Não há backend real: API REST e eventos Socket.IO são simulados com **MSW** na camada de rede, inclusive no build publicado.

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface | React 19 + TypeScript |
| Build | Vite |
| Rotas e estado da URL | TanStack Router |
| Estado remoto | TanStack Query |
| HTTP | Axios |
| Tempo real | socket.io-client |
| Estilo | Tailwind CSS v4 + shadcn/ui (Radix) |
| Mocks | MSW (REST) + `@mswjs/socket.io-binding` (Socket.IO) |
| Validação | zod (mesmos schemas no cliente e nos mocks) |
| Valores em ETH | decimal.js (strings decimais, sem `number`) |
| Testes | Playwright (E2E + regressão visual) |
| Auditoria | Lighthouse |

## Como rodar

Requisitos: **Node 20+** e npm.

```bash
npm ci
npm run dev            # http://localhost:5173 (com mocks)
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Verificação de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` | Só a verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Testes Playwright (faz build + preview sozinho) |
| `npm run test:e2e:desktop` | Só o projeto desktop |
| `npm run test:e2e:update` | Regera as baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML (com traces das falhas) |
| `npm run lighthouse` | Auditoria Lighthouse (build + preview + 3 medições por página/perfil) |

Antes do primeiro teste: `npx playwright install chromium`.

### Variáveis de ambiente

Todas são opcionais.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | ligado | `false` desliga o MSW (não há backend real, então só faz sentido com uma API própria em `/api`) |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial da API simulada |
| `PW_CHROMIUM_PATH` | — | Caminho de um Chromium já instalado, para o Playwright |
| `E2E_BASE_URL` | preview local | Roda os testes contra outra URL, sem subir o preview (ex.: o deploy) |
| `CHROME_PATH` | Chromium do Playwright | Navegador usado pelo Lighthouse |
| `LH_BASE_URL` / `LH_RUNS` | preview local / 3 | Auditar outra URL / número de medições |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana (2 carteiras, favoritos) | `ana@example.com` | `Senha@123` |
| Bruno (1 carteira) | `bruno@example.com` | `Senha@456` |

Também dá para criar uma conta nova pelo cadastro. As senhas ficam no banco simulado só como hash PBKDF2 com sal (nunca em texto).

**Cupons:** `WELCOME10` (10%), `ETHER5` (5%), `EXPIRED20` (expirado). Qualquer outro código é inválido.

## Cenários da API simulada

O cenário controla latência, falhas e desfechos da API. Ele pode ser escolhido de quatro formas:

1. **Painel "Cenários"** no canto inferior esquerdo da aplicação (também no deploy): escolha e clique em **Aplicar**.
2. **URL:** `?scenario=<id>` (ex.: https://frontend-challenge-kurio.vercel.app/?scenario=slow). Fica salvo na aba (sessionStorage).
3. **Variável** `VITE_MOCK_SCENARIO` no build.
4. **Console/testes:** `window.__mock.setScenario('<id>')`.

| Cenário | Efeito |
| --- | --- |
| `default` | Tudo funciona, latência baixa (40–120 ms) |
| `empty` | Catálogo vazio |
| `slow` | Respostas de ~2 s (skeletons) |
| `variable-latency` | Latência entre 50 ms e 1,8 s, reproduzível |
| `out-of-order` | Buscas mais longas respondem antes (respostas fora de ordem) |
| `offline` | Queda de conexão em toda requisição `/api` |
| `server-error` | Toda requisição `/api` responde 500 |
| `unavailable` | Toda requisição `/api` responde 503 |
| `expired-session` | Rotas autenticadas respondem 401 `session_expired` |
| `price-changed` | O preço do 1º item sobe entre a revisão e a confirmação |
| `sold-out` | A edição do 1º item esgota entre a revisão e a confirmação |
| `order-timeout` | O pedido é criado, mas a 1ª resposta nunca chega |
| `payment-rejected` | Pagamento recusado |
| `slow-payment` | Pedido fica pendente por 6 s |
| `favorite-fails` | Favoritar/desfavoritar responde 503 |
| `wallet-refused` | A carteira recusa a conexão |

**Reset:** botão **Restaurar dados** no painel (restaura banco simulado, sessão e carrinho) ou `await window.__mock.reset()`.

### Controles do "servidor" simulado (`window.__mock`)

Usados pelos testes e úteis para demonstrar o tempo real. Eles só acionam o servidor simulado; os eventos chegam ao app pelo `socket.io-client`.

```js
__mock.updateEdition('nft-01', 'nft-01-std', { priceEth: '1.5' }) // muda preço/estoque e emite nft.updated
__mock.updateEdition('nft-02', 'nft-02-std', { available: 0 })    // esgota a edição
__mock.socket.replayLast()        // reenvia o último evento (duplicado)
__mock.socket.emitStale('nft-03') // evento com versão antiga (deve ser ignorado)
__mock.socket.disconnect()        // derruba o socket (o cliente reconecta e reconcilia)
__mock.socket.connections()       // conexões abertas
__mock.expireSession()            // expira as sessões agora
__mock.scenarios()                // lista os cenários
```

## Como reproduzir os fluxos de falha

Entre como Ana (`ana@example.com` / `Senha@123`), adicione um NFT ao carrinho e siga:

| Fluxo | Passos | Resultado esperado |
| --- | --- | --- |
| Pagamento recusado | Cenário `payment-rejected` → Pagamento → conectar carteira → Confirmar compra → Confirmar e pagar | Tela "Pagamento recusado"; os itens continuam no carrinho |
| Timeout com idempotência | Cenário `order-timeout` → confirmar a compra | Após ~8 s o app reenvia com a mesma `Idempotency-Key` e abre o mesmo pedido; só 1 pedido em Perfil → Atividade |
| Clique repetido | Clicar várias vezes em "Confirmar e pagar" | Um único pedido |
| Preço alterado no checkout | Cenário `price-changed` → confirmar | Aviso "Os valores mudaram", com o novo total; é preciso confirmar de novo |
| Esgotado no checkout | Cenário `sold-out` → confirmar | Aviso de indisponibilidade; o pedido não é criado |
| Mudança em tempo real | Com o carrinho aberto, no console: `__mock.updateEdition('nft-01','nft-01-std',{priceEth:'2'})` | Toast + aviso na linha + resumo recalculado pela API |
| Queda do socket com pedido pendente | Cenário `slow-payment` → confirmar → `__mock.socket.disconnect()` → recarregar | Continua no mesmo pedido pendente e depois mostra o recibo, sem nova compra |
| Sessão expirada no checkout | No pagamento: `__mock.expireSession()` e confirmar (ou cenário `expired-session`) | Vai para o login com aviso; ao entrar, volta ao pagamento com os campos preenchidos |
| Carteira recusada | Cenário `wallet-refused` → Conectar carteira | Mensagem de recusa; dá para tentar de novo ou escolher outra carteira |
| Falha ao favoritar | Cenário `favorite-fails` → favoritar | O coração volta ao estado anterior (rollback) com aviso |
| Catálogo fora do ar | Cenário `offline` ou `server-error` → início | Erro com "Tentar novamente"; voltar ao `default` e tentar recupera |
| Carregamento lento | Cenário `slow` | Skeletons com shimmer no catálogo, detalhe e resumo do carrinho |
| Respostas fora de ordem | Cenário `out-of-order` → digitar uma busca rapidamente | A tela mostra o resultado da última busca, não da mais lenta |

## Testes

`npm run test:e2e` roda 40 testes (desktop 1440×900 e mobile Pixel 7) contra o build de produção com MSW. Cada teste parte de um estado isolado (`__mock.reset()`, armazenamento limpo e cenário explícito).

| # | Cenário do desafio | Arquivo |
| --- | --- | --- |
| 1 | Busca, filtros combinados, ordenação, paginação e histórico | `e2e/catalog.spec.ts` |
| 2 | Acesso direto ao detalhe e recurso inexistente | `e2e/catalog.spec.ts` |
| 3 | Cadastro, login, expiração de sessão, logout e troca de usuário | `e2e/auth.spec.ts` |
| 4 | Favoritos, falha da mutation e recuperação | `e2e/cart.spec.ts` |
| 5 | Carrinho, quantidades, remoção, cupom e persistência após refresh/login | `e2e/cart.spec.ts` |
| 6 | Compra completa até o recibo confirmado | `e2e/purchase.spec.ts` |
| 7 | Pagamento recusado, clique repetido e timeout com o mesmo pedido | `e2e/purchase.spec.ts` |
| 8 | Perfil, avatar, senha e carteiras com erros de validação | `e2e/account.spec.ts` |
| 9 | Preço/disponibilidade via Socket.IO durante o checkout | `e2e/realtime.spec.ts` |
| 10 | Eventos duplicados/antigos, desconexão e pedido pendente | `e2e/realtime.spec.ts` |
| 11 | Teclado, foco em diálogos e validação de formulários | `e2e/a11y.spec.ts` |
| 12 | Skeletons, falha e nova tentativa | `e2e/catalog.spec.ts` |
| — | Regressão visual: início, detalhe, carrinho e pagamento | `e2e/visual.spec.ts` |
| — | Contratos da API simulada | `e2e/mock-api.spec.ts` |

- Os testes de tempo real passam pelo `socket.io-client` do app; os de REST, pelos handlers do MSW.
- Latência e desfechos são controlados por cenário; os eventos, por `window.__mock`.
- Relatório HTML em `playwright-report/`, com trace e screenshot das falhas em `test-results/`.
- As baselines visuais estão em `e2e/__screenshots__/`. Elas foram geradas no Windows; em outro sistema, o antialiasing das fontes muda, então gere de novo com `npm run test:e2e:update`.

## Lighthouse

Mediana de 3 medições por página e perfil (build de produção, cenário padrão). Detalhes, ambiente e relatórios HTML/JSON em [`lighthouse/`](./lighthouse/summary.md).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 75 | 100 | 100 | 100 | 4.24 s | 0.015 | 265 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0.78 s | 0.002 | 27 ms |
| Detalhe | mobile | 80 | 100 | 100 | 100 | 4.16 s | 0.000 | 180 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 0.93 s | 0.000 | 0 ms |

**Abaixo da meta: Performance no perfil mobile (75–80).** O elemento de LCP é a primeira imagem do catálogo (ou a do NFT, no detalhe), que depende de dados da API. Antes da primeira resposta, o navegador precisa baixar e executar a camada de mocks (MSW + interceptador de WebSocket + base simulada, ~170 KB gzip) e registrar o service worker. Na emulação mobile (CPU 4× mais lenta, 4G lento), esse trabalho domina o LCP. Com uma API real, esse custo não existiria. O que já foi feito: o app baixa em paralelo com o MSW, as rotas são carregadas sob demanda, a imagem do LCP tem `preload` + `fetchpriority`, as imagens são WebP de ~15–25 KB com dimensões fixas (CLS ≈ 0) e a fonte é servida localmente. Nada foi desligado para a auditoria: ela carrega as mesmas imagens, fontes, mocks e tempo real da entrega.

## Deploy

Publicado na Vercel: **https://frontend-challenge-kurio.vercel.app** (deploy automático a cada push na `main`).

Configuração em `vercel.json`: build `npm run build`, saída `dist/`, rewrite de SPA (acesso direto e refresh funcionam em qualquer rota) e `mockServiceWorker.js` sem cache. Os mocks e o tempo real ficam ativos no build publicado.

Para rodar os testes contra o deploy:

```bash
E2E_BASE_URL=https://frontend-challenge-kurio.vercel.app npx playwright test --project=desktop
```

## Estrutura

```
src/
  contracts/   Tipos e schemas zod compartilhados (transporte ↔ estado ↔ interface)
  mocks/       MSW: handlers REST, Socket.IO simulado, banco, cenários, painel de demonstração
  lib/         Axios, sessão, chaves/cliente do TanStack Query, tempo real, formatação
  features/    Hooks por domínio (catálogo, carrinho, pedidos, conta) e componentes
  components/  Layout, formulários e componentes shadcn/ui
  pages/       Uma página por rota
  app/         Router, providers e layout raiz
e2e/           Testes Playwright e baselines visuais
scripts/       Auditoria Lighthouse e extração dos assets do Figma
design/        Frames do Figma usados como referência
```

## Uso de IA

Usei ferramentas de IA como apoio durante o desenvolvimento, conforme permitido pelo desafio. As decisões de arquitetura e o código foram revisados e entendidos por mim.
