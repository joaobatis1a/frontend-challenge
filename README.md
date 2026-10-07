# Kurio — Marketplace de NFTs

- **Aplicação publicada:** https://frontend-challenge-kurio.vercel.app
- **Repositório:** https://github.com/joaobatis1a/frontend-challenge
- **Arquitetura, contratos REST e eventos, sessão, carrinho, cache, reconciliação, desvios do Figma e limitações:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/summary.md](./lighthouse/summary.md) (análise em [ARCHITECTURE.md](./ARCHITECTURE.md#performance-e-lighthouse))

Não há backend real: a API REST e os eventos Socket.IO são simulados com MSW, inclusive no build publicado.

## Setup

Requisitos: **Node 20+** e npm.

```bash
npm ci
npx playwright install chromium   # só para os testes e o Lighthouse
npm run dev                       # http://localhost:5173, com os mocks ativos
```

## Variáveis de ambiente

Todas são opcionais.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | ligado | `false` desliga o MSW |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial da API simulada |
| `PW_CHROMIUM_PATH` | — | Caminho de um Chromium já instalado, para o Playwright |
| `E2E_BASE_URL` | preview local | Roda os testes contra outra URL (ex.: o deploy) |
| `CHROME_PATH` | Chromium do Playwright | Navegador usado pelo Lighthouse |
| `LH_BASE_URL` / `LH_RUNS` | preview local / 3 | URL auditada / número de medições |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build de produção (`dist/`) |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Testes Playwright, desktop e mobile (faz build + preview sozinho) |
| `npm run test:e2e:update` | Regera as baselines de regressão visual |
| `npm run test:e2e:report` | Relatório HTML, com traces das falhas |
| `npm run lighthouse` | Auditoria Lighthouse (3 medições por página e perfil) |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana | `ana@example.com` | `Senha@123` |
| Bruno | `bruno@example.com` | `Senha@456` |

Cupons: `WELCOME10` (10%), `ETHER5` (5%), `EXPIRED20` (expirado). Qualquer outro código é inválido.

## Seleção e reset dos cenários

Formas de escolher o cenário:

1. **Painel "Cenários"**, no canto inferior esquerdo da aplicação (também no deploy): escolha e clique em **Aplicar**.
2. **URL:** `?scenario=<id>`, ex.: https://frontend-challenge-kurio.vercel.app/?scenario=slow (fica salvo na aba).
3. **Build:** variável `VITE_MOCK_SCENARIO`.
4. **Console:** `window.__mock.setScenario('<id>')`.

**Reset:** botão **Restaurar dados** no painel ou `await window.__mock.reset()`. Os dois restauram banco simulado, sessão e carrinho.

| Cenário | Efeito |
| --- | --- |
| `default` | Tudo funciona, latência baixa |
| `empty` | Catálogo vazio |
| `slow` | Respostas de ~2 s |
| `variable-latency` | Latência entre 50 ms e 1,8 s, reproduzível |
| `out-of-order` | Buscas mais longas respondem antes |
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

## Como reproduzir os fluxos de falha

Entre como Ana, adicione um NFT ao carrinho e siga:

| Fluxo | Passos | Resultado esperado |
| --- | --- | --- |
| Pagamento recusado | Cenário `payment-rejected` → Pagamento → conectar carteira → Confirmar compra → Confirmar e pagar | "Pagamento recusado"; os itens continuam no carrinho |
| Timeout com idempotência | Cenário `order-timeout` → confirmar a compra | Após ~8 s o app reenvia com a mesma chave e abre o mesmo pedido; só 1 pedido em Perfil → Atividade |
| Clique repetido | Clicar várias vezes em "Confirmar e pagar" | Um único pedido |
| Preço alterado | Cenário `price-changed` → confirmar | Aviso "Os valores mudaram" com o novo total; é preciso confirmar de novo |
| Esgotado | Cenário `sold-out` → confirmar | Aviso de indisponibilidade; o pedido não é criado |
| Tempo real | Com o carrinho aberto, no console: `__mock.updateEdition('nft-01','nft-01-std',{priceEth:'2'})` | Aviso + resumo recalculado pela API |
| Queda do socket com pedido pendente | Cenário `slow-payment` → confirmar → `__mock.socket.disconnect()` → recarregar | Mesmo pedido pendente e depois o recibo, sem nova compra |
| Eventos duplicados ou antigos | No detalhe de um NFT: `__mock.socket.replayLast()` e `__mock.socket.emitStale('nft-03')` | Nada muda na tela |
| Sessão expirada | No pagamento: `__mock.expireSession()` e confirmar (ou cenário `expired-session`) | Vai ao login com aviso; ao entrar, volta ao pagamento com os campos preenchidos |
| Carteira recusada | Cenário `wallet-refused` → Conectar carteira | Mensagem de recusa; dá para tentar de novo |
| Falha ao favoritar | Cenário `favorite-fails` → favoritar | O favorito volta ao estado anterior, com aviso |
| API fora do ar | Cenário `offline` ou `server-error` → início | Erro com "Tentar novamente"; voltar ao `default` e tentar recupera |
| Carregamento lento | Cenário `slow` | Skeletons no catálogo, detalhe e resumo do carrinho |
| Respostas fora de ordem | Cenário `out-of-order` → digitar uma busca rapidamente | A tela mostra o resultado da última busca |

## Uso de IA

Usei ferramentas de IA como apoio durante o desenvolvimento. As decisões de arquitetura e o código foram revisados e entendidos por mim.
