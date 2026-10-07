# Arquitetura

## Visão geral

```
            ┌──────────────── navegador ────────────────┐
 páginas ─► hooks (TanStack Query) ─► api (Axios) ─► fetch/XHR ─┐
   ▲                ▲                                             │  service worker (MSW)
   │                └── RealtimeProvider ◄─ socket.io-client ◄────┤  + interceptador de WebSocket
   │                                                              ▼
 TanStack Router (URL, rotas privadas)              src/mocks: handlers REST, Socket.IO
                                                    simulado, banco em localStorage
```

- **`src/contracts`**: tipos e schemas zod compartilhados. A interface valida formulários com os mesmos schemas que os mocks usam para validar o corpo das requisições, então uma regra existe num só lugar.
- **`src/mocks`**: o "servidor". Só é carregado pelo `main.tsx` e intercepta na camada de rede. Componentes, hooks e o cliente Axios não sabem que ele existe e não têm respostas fictícias.
- **`src/lib/api`**: instância única do Axios. Injeta `Authorization` (ou `X-Guest-Cart-Id` do visitante), converte qualquer falha em `ApiError` e marca a sessão como expirada ao receber `session_expired`.
- **`src/features/*/hooks.ts`**: consultas e mutations do TanStack Query por domínio.
- **`src/lib/realtime`**: conexão Socket.IO e aplicação dos eventos no cache.

### Ordem de inicialização

O `socket.io-client` guarda a referência ao `WebSocket` nativo quando o módulo é avaliado. Por isso, o MSW precisa iniciar antes de ele ser carregado. No `main.tsx`, o pacote do app começa a baixar em paralelo, mas o React só renderiza depois do `worker.start()`. O `socket.io-client` é importado de forma dinâmica dentro do `RealtimeProvider`.

## Contratos REST

Base `/api`. Corpo e respostas em JSON. Valores em ETH são **strings decimais** (ex.: `"1.19"`) e todo cálculo usa `decimal.js`. Quantidades são inteiras.

Todo erro segue `ApiErrorBody`: `{ code, message, fieldErrors?, details? }`.

| Código | HTTP | Quando |
| --- | --- | --- |
| `validation_error` | 422 | Corpo inválido (`fieldErrors` por campo) |
| `unauthenticated` | 401 | Sem token |
| `session_expired` | 401 | Token expirado/revogado |
| `invalid_credentials` | 401 | E-mail ou senha incorretos |
| `forbidden` / `wallet_connection_refused` | 403 | Sem permissão / carteira recusou |
| `not_found` | 404 | Recurso inexistente (ou de outro usuário) |
| `email_taken` / `wallet_address_taken` | 409 | Conflito de cadastro |
| `availability_conflict` | 409 | Quantidade acima do estoque (`details.quote` no pedido) |
| `quote_outdated` | 409 | Preço/taxa/cupom mudou desde a cotação (`details.quote`) |
| `idempotency_conflict` | 409 | Mesma chave com outro conteúdo |
| `coupon_invalid` / `coupon_expired` | 422 | Cupom |
| `transient_failure` / `server_error` | 503 / 500 | Falhas transitórias |

### Sessão e conta

| Método e rota | Auth | Corpo | Resposta |
| --- | --- | --- | --- |
| `POST /auth/signup` | — | `{ name, username?, email, password, guestCartId? }` | 201 `{ user, token, expiresAt }` · 409 `email_taken` · 422 |
| `POST /auth/login` | — | `{ email, password, guestCartId? }` | `{ user, token, expiresAt }` · 401 `invalid_credentials` |
| `GET /auth/session` | ✔ | — | `{ user, expiresAt }` · 401 `session_expired` |
| `POST /auth/logout` | ✔ | — | 204 |
| `GET /profile` | ✔ | — | `User` |
| `PATCH /profile` | ✔ | `{ name?, username?, email?, ensName?, bio? }` | `User` · 422 · 409 `email_taken` |
| `PUT /profile/avatar` | ✔ | `{ dataUrl }` (PNG/JPEG/WEBP/GIF ≤ 512 KB) | `User` |
| `DELETE /profile/avatar` | ✔ | — | `User` |
| `POST /profile/password` | ✔ | `{ currentPassword, newPassword }` | 204 · 422 (`currentPassword`) |

### Catálogo e favoritos

| Método e rota | Auth | Parâmetros | Resposta |
| --- | --- | --- | --- |
| `GET /nfts` | — | `q`, `category` (repetível), `network` (repetível), `minPrice`, `maxPrice`, `inStock`, `featured`, `sort` (`newest`·`featured`·`price_asc`·`price_desc`·`name`), `page` | `{ items, page, pageSize, total, totalPages, facets, query }` |
| `GET /nfts/featured` | — | — | `NftSummary[]` |
| `GET /nfts/:id` | — | — | `NftDetail` (edições, galeria, avaliações) · 404 |
| `GET /favorites` | ✔ | — | `{ nftIds }` |
| `PUT /favorites/:nftId` | ✔ | — | `{ nftIds }` (idempotente) |
| `DELETE /favorites/:nftId` | ✔ | — | `{ nftIds }` |

`query` devolve a consulta que a API resolveu, e `facets` traz as contagens de cada filtro e a faixa de preço do catálogo.

### Carrinho e cotação

O carrinho é da conta (`Authorization`) ou do visitante (`X-Guest-Cart-Id`).

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /cart` | — | `Cart` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | 201 `Cart` · 409 `availability_conflict` |
| `PATCH /cart/items/:editionId` | `{ quantity }` | `Cart` · 409 |
| `DELETE /cart/items/:editionId` | — | `Cart` |
| `PUT /cart/coupon` | `{ code }` | `Cart` · 422 `coupon_invalid`/`coupon_expired` |
| `DELETE /cart/coupon` | — | `Cart` |
| `POST /cart/quote` | `{ network }` | `Quote` |

`Quote` = linhas, `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`, `issues` (esgotado / acima do estoque) e um **`fingerprint`**, que resume tudo o que define o valor (preços, quantidades, cupom, rede, taxa e problemas).

### Pedidos

| Método e rota | Cabeçalhos / corpo | Resposta |
| --- | --- | --- |
| `POST /orders` | `Idempotency-Key` + `{ collector, walletId, network, quoteFingerprint, expectedTotalEth }` | 201 `Order` (pendente) · 200 mesmo pedido (repetição) · 409 `quote_outdated`/`availability_conflict` (com nova cotação) · 409 `idempotency_conflict` |
| `GET /orders` | — | `Order[]` do usuário |
| `GET /orders/:id` | — | `Order` · 404 (inclusive para pedido de outro usuário) |

`Order.snapshot` congela itens, valores, carteira e colecionador no momento da compra. O recibo mostra só o snapshot, então mudanças no catálogo não o alteram.

### Carteiras

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /wallets` | — | `(Wallet & { connected })[]` |
| `POST /wallets` | `{ label, address, network, provider, ensName?, isPrimary? }` | 201 `Wallet` · 409 `wallet_address_taken` · 422 (limite de 2) |
| `PATCH /wallets/:id` | campos parciais | `Wallet` |
| `DELETE /wallets/:id` | — | 204 |
| `POST /wallets/:id/connect` | — | `{ walletId, connected: true }` · 403 `wallet_connection_refused` |
| `DELETE /wallets/:id/connection` | — | `{ walletId, connected: false }` |

## Eventos Socket.IO

Transporte: Socket.IO v4 sobre WebSocket (`transports: ['websocket']`), simulado por `ws.link` do MSW + `@mswjs/socket.io-binding`.

| Evento | Direção | Payload |
| --- | --- | --- |
| `session.subscribe` | cliente → servidor | `{ token \| null }`, enviado a cada (re)conexão |
| `session.subscribed` | servidor → cliente | `{ userId \| null }` |
| `nft.updated` | servidor → todos | `{ eventId, resource: 'nft', resourceId, version, occurredAt, editions: [{ id, priceEth, available }] }` |
| `order.updated` | servidor → só o dono | `{ eventId, resource: 'order', resourceId, version, occurredAt, status }` |

Garantias no cliente (`src/lib/realtime/apply.ts`):

- **Duplicatas:** um `eventId` já visto é descartado (o conjunto guarda os 500 últimos).
- **Eventos antigos:** um evento é aplicado só se `version` for maior que a maior versão conhecida, seja dos eventos recebidos, seja do que já está no cache vindo do REST. Assim, um evento antigo nunca regride um estado mais recente.
- **Estados terminais:** pedido `confirmed`/`rejected` não volta a mudar.
- **Isolamento:** há uma conexão por sessão. Login, logout, troca de usuário ou expiração fecham o socket anterior e abrem outro com o novo token. Os eventos de pedido só são enviados ao dono, e o cliente só os aplica no cache do dono atual.
- **Ciclo de vida:** listeners removidos e socket desconectado no cleanup do efeito.

### Reconciliação REST × Socket.IO

- `nft.updated` atualiza detalhe, listas, destaques e linhas do carrinho direto no cache. Se o carrinho mudou, as cotações são **invalidadas**: o resumo volta a vir da API, que é a referência de valor.
- `order.updated` atualiza o status em cache e invalida o pedido (para buscar hash ou motivo da recusa), a lista de pedidos e, em estado terminal, o carrinho.
- **Após reconexão:** os eventos perdidos durante a queda não são reenviados, então o cliente invalida as consultas de catálogo e todas as consultas privadas do dono atual. Só as **ativas** são buscadas de novo.
- **Rede de segurança:** enquanto um pedido está pendente, `useOrder` consulta a API a cada 5 s, cobrindo o caso de o socket cair exatamente na confirmação.

## Sessão

- O token e os dados públicos do usuário ficam no `localStorage` (`session:v1`), lidos por uma store fora do React (`useSyncExternalStore`), para que o interceptor do Axios e o socket os usem. A senha nunca é guardada.
- **Recuperação após refresh:** a sessão salva é usada na hora e conferida com `GET /auth/session`.
- **Expiração:** qualquer 401 `session_expired` marca a sessão como expirada. O `RootLayout` leva ao login com `redirect` para a página atual, e o login mostra um aviso fixo. No checkout, o rascunho do formulário fica no `sessionStorage` por usuário e é restaurado ao voltar.
- **Rotas privadas** (`/checkout`, `/orders/:id`, `/profile`, `/wallets`): o `beforeLoad` do TanStack Router redireciona ao login com `redirect`. Um usuário já logado que abre `/login` vai direto ao destino.
- **Logout/troca de usuário:** o cache privado do dono anterior é removido (`removeQueries` pelo prefixo do dono) e o socket é recriado. Um novo id de carrinho de visitante é gerado.

## Carrinho

- O visitante tem um id próprio (`guest-<uuid>` no `localStorage`) enviado em `X-Guest-Cart-Id`. O carrinho fica na API simulada e sobrevive a refresh.
- **Login/cadastro** enviam `guestCartId`. A API soma as quantidades no carrinho da conta (até o limite por linha) e apaga o do visitante.
- **Limites:** estoque da edição e no máximo 10 por linha, conferidos na interface e na API.
- **Valores:** subtotal, desconto, taxa e total sempre vêm de `POST /cart/quote`. A interface não recalcula totais; só mostra o total da linha enquanto a nova cotação chega.
- **Pedido:** o carrinho não é esvaziado ao criar o pedido. Na confirmação, a API remove só os itens e quantidades comprados. Na recusa, nada muda e o estoque reservado volta.

## Checkout e idempotência

1. O formulário é validado com `collectorSchema`; a carteira precisa estar selecionada e **conectada** (conexão simulada na API).
2. "Confirmar compra" abre a **revisão** com a cotação atual. Se chegar um evento de preço enquanto ela está aberta, a revisão mostra os novos valores.
3. "Confirmar e pagar" **busca a cotação de novo**. Se o `fingerprint` mudou, mostra a diferença e exige nova confirmação.
4. `POST /orders` leva `quoteFingerprint` e `expectedTotalEth`. Se a API responder `quote_outdated`/`availability_conflict`, a nova cotação de `details.quote` vai para o cache e o usuário confirma de novo.
5. **Idempotência:** a tentativa (`key` + `payload` + `orderId`) fica no `sessionStorage`. Cliques repetidos são bloqueados pelo estado `pending` da mutation. Timeout ou queda de rede reenviam até 2 vezes **com a mesma chave**, e a API devolve o mesmo pedido. Depois de um refresh no meio do envio, o checkout oferece "Retomar pedido" com a mesma chave. Se o conteúdo mudar, uma nova chave é gerada.
6. A tela do pedido mostra pendente → confirmado (recibo) ou recusado. Ela só mostra o recibo quando a API diz `confirmed`.

## Estratégia de cache (TanStack Query)

- **Chaves** (`src/lib/query/keys.ts`): públicas com prefixo `nfts`; privadas com prefixo do dono, `user:<id>` ou `guest:<id>`. Trocar de usuário muda todas as chaves privadas, então dados de um usuário não aparecem para outro.
- **Catálogo:** cada combinação de filtros é uma chave. O `signal` do Query cancela a requisição anterior, e uma resposta atrasada cai na chave antiga, resolvendo as respostas fora de ordem. Com `keepPreviousData`, a página anterior fica visível (esmaecida) enquanto a nova carrega.
- **`staleTime`** de 30 s no geral e 0 na cotação. Sem refetch ao focar a janela, porque o tempo real cobre preço e estoque.
- **Retries:** consultas repetem até 2 vezes, só em falhas transitórias (rede, timeout, 5xx, 429), com backoff exponencial. Erros 4xx não repetem. Mutations nunca repetem sozinhas; a exceção é o pedido, que reenvia com a mesma chave de idempotência.
- **Atualização otimista:** favoritos (`useToggleFavorite`) mudam na hora e voltam ao estado anterior em caso de falha. As carteiras recebem o estado de conexão da resposta direto no cache.
- **Invalidação:** mutations do carrinho gravam o carrinho devolvido e invalidam as cotações. Mutations de carteira invalidam a lista. Pedido criado invalida carrinho e pedidos.

## Mocks (MSW)

- **Banco** em memória, persistido no `localStorage` (`mock:db:v3`). Por isso catálogo, favoritos, carrinho, perfil, carteiras e pedidos ficam consistentes entre si e após refresh. `reset()` volta ao seed determinístico.
- **Fixtures:** 48 NFTs (9 categorias, 4 coleções, 3 redes, edições 1/1, 1/10, 1/50 e aberta), com casos de borda fixos: `nft-10`, `nft-19`, `nft-31` e `nft-43` esgotados; `nft-11` com só 2 unidades; `nft-13` com uma edição esgotada; e 2 usuários.
- **Determinismo:** a latência dentro da faixa do cenário vem de um gerador pseudoaleatório com semente, e os cenários "de primeira vez" (preço muda, esgota, timeout) disparam uma única vez por cenário.
- **Uma mudança, dois canais:** toda alteração de preço/estoque (controles, pedido criado, pedido recusado) grava no banco **e** emite `nft.updated`, então REST e eventos ficam coerentes.
- **Limitações do transporte simulado:**
  - Só o transporte WebSocket é suportado (sem long-polling).
  - O "servidor" vive na própria aba: o banco é compartilhado entre abas via `localStorage`, mas os eventos de uma aba não chegam a outra.
  - O ping do Engine.IO é simulado a cada 20 s.
  - `disconnect()` fecha a conexão do lado do servidor, e o cliente reconecta pela política padrão do Socket.IO (0,5–3 s).

## Interface e acessibilidade

- Tema do Figma em variáveis CSS com os nomes do shadcn/ui (`src/index.css`), então os componentes Radix seguem a identidade sem forks.
- Skeletons com shimmer no catálogo, detalhe, carrinho, resumo, pagamento, perfil e carteiras, com as dimensões do conteúdo (CLS ≈ 0). O shimmer some com `prefers-reduced-motion`.
- Teclado: link "pular para o conteúdo", foco visível global, ações do card visíveis também com foco (não só com hover), diálogos e gavetas do Radix com foco preso e devolvido.
- Formulários: label ligado ao campo, erro em `aria-describedby`, `aria-invalid`, foco no primeiro campo inválido e erros da API mostrados no campo.
- Feedback: toasts do Sonner em região `aria-live`, contagem de resultados anunciada, status de pedido em `role="status"` e indicador "Reconectando ao tempo real".
- Estados não dependem só de cor: edição esgotada riscada e com texto, favorito com `aria-pressed` e ícone preenchido, avisos com ícone e texto.

## Desvios do Figma e decisões de UX

- **Imagens:** as ilustrações foram recortadas dos frames exportados (`scripts/extract-figma-assets.py`) e convertidas para WebP, porque não havia acesso aos assets originais. A galeria usa variações (rosto ampliado e espelhado) da mesma ilustração.
- **Rede "Solana"** no filtro foi trocada por **Arbitrum**, para coincidir com as redes aceitas no pagamento.
- **Pagamento:** o layout repete campos de carteira (endereço, tipo, ENS, código de indicação). O desafio pede o uso das carteiras cadastradas, então o pagamento lista as carteiras do usuário (como no frame mobile) e mostra o endereço da selecionada só para leitura. O cadastro completo fica em Carteiras. "Código de indicação" e "Nome do perfil" foram omitidos por não terem função no fluxo.
- **Carteiras e perfil:** campos que duplicavam o perfil no formulário de carteira (nome de exibição, e-mail, nome ENS) e o "apelido da carteira" no perfil foram omitidos. Cada informação é editada num só lugar.
- **Revisão antes do envio:** diálogo extra (não desenhado), exigido pelo desafio, no mesmo padrão visual do recibo.
- **Busca no desktop:** o layout só tem o ícone de lupa no cabeçalho. O campo foi colocado no topo da barra de filtros, e a lupa leva até ele.
- **Abas do catálogo:** "Todos", "Novos lançamentos" e "Em alta" são atalhos de filtros da URL (`sort=newest` e `featured=true`).
- **Login e cadastro** abrem como modal sobre o hero (desktop) e em tela cheia (mobile), como nos frames, mas têm URL própria (`/login`, `/signup`) para permitir acesso direto e retorno ao fluxo.
- **Ações fora do escopo** (Criadores, Aprenda, artigos, login social, newsletter, ofertas, suporte, leitor de QR) mostram um aviso de "não disponível nesta demonstração" em vez de simular sucesso.
- **Perfil:** "Atividade" (pedidos) e "Lista de interesse" (favoritos) aparecem na própria página de perfil.
- **Telas sem frame** (confirmação, perfil e carteiras no mobile; pedido pendente/recusado; erros e 404) seguem os componentes e cores existentes.

## Limitações

- Não há blockchain, carteira ou pagamento reais: hash e link de explorador são simulados (o link aponta para um domínio fictício, sinalizado na tela).
- O recorte das imagens a partir dos frames limita a resolução (480 px).
- As baselines visuais dependem do sistema operacional (antialiasing de fontes).
- A performance mobile no Lighthouse fica abaixo de 90 pelo custo de iniciar a camada de mocks antes da primeira resposta (análise no README).
