# CM4STORE — iPhone 18 Pro | iPhone 18 Pro Max

Plataforma completa de venda (landing page 3D + API REST + painel administrativo + checkout com pagamento e agendamento), pronta para deploy na Vercel.

**Marca:** CM4STORE · Verde `#7FD000` · Cinza escuro · Branco — foco total no lançamento do iPhone 18 Pro

**Design:** linguagem visual inspirada na Apple — fundo cinza claro (`#F5F5F7`), tipografia do sistema (`-apple-system` / Helvetica Neue), espaçamento generoso (escala 8/16/24/32/48/64/96), cards claros e animações discretas — mantendo o verde CM4STORE como cor de ação.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript puro (sem build step, sem webfonts externas) |
| 3D | Three.js (r128 local, CDN como fallback) — iPhone gerado proceduralmente, iluminado para fundo claro |
| Backend | Node.js + Express 4 |
| Banco | MongoDB (Mongoose) **ou** repositório em memória (fallback automático) |
| Auth | JWT + bcrypt |
| Pagamento | Gateway plugável — placeholder pronto para MercadoPago / Stripe |
| Deploy | Vercel (`@vercel/node` + estáticos) |

> **Sem `MONGODB_URI` a aplicação sobe normalmente** usando um repositório em memória com dados de demonstração. Basta preencher a variável para migrar para o MongoDB sem alterar uma linha de código.

---

## Como rodar

```bash
npm install
cp .env.example .env     # opcional
npm run dev              # ou: npm start
```

- Loja: http://localhost:3000
- Checkout: http://localhost:3000/checkout
- Painel: http://localhost:3000/admin
- Health: http://localhost:3000/api/health

**Acesso admin do esboço:** `admin@cm4store.com` / `cm4store123` (altere via `.env`).

---

## Estrutura

```
cm4store/
├─ api/index.js              # entry point serverless (Vercel)
├─ server.js                 # entry point local
├─ vercel.json               # rotas e builds
├─ src/
│  ├─ app.js                 # Express app
│  ├─ config/                # env + conexão do banco
│  ├─ models/                # schemas Mongoose (Product, Order, Appointment, User)
│  ├─ repositories/          # camada única: Mongo OU memória
│  ├─ controllers/           # regras de cada recurso
│  ├─ services/              # disponibilidade de agenda
│  ├─ routes/                # rotas REST
│  ├─ middleware/            # auth JWT + tratamento de erros
│  └─ utils/                 # seed, helpers
└─ public/
   ├─ index.html             # landing (hero, seletor de cores + 3D, specs, modelos)
   ├─ checkout.html          # checkout + agendamento + pagamento
   ├─ confirmacao.html       # nº do pedido, pagamento e dados do agendamento
   ├─ admin/index.html       # painel administrativo
   ├─ css/ (main.css, admin.css)
   └─ js/ (api.js, cart.js, iphone3d.js, main.js, checkout.js, admin.js)
```

---

## API REST

Base: `/api`

### Público
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | status da API e modo de persistência |
| GET | `/config` | marca, cor e preço padrão |
| GET | `/products` | lista o catálogo (`?modelo=`, `?todos=1`) |
| GET | `/products/:id` | produto por id ou slug |
| POST | `/orders` | cria pedido (checkout) + agendamento opcional |
| GET | `/orders/:id` | consulta por id **ou** número do pedido |
| GET | `/appointments/disponibilidade?dias=14` | agenda com vagas por horário |
| POST | `/appointments` | cria agendamento avulso |
| POST | `/auth/registrar` · `/auth/login` | cadastro e login de cliente |
| POST | `/payments/checkout` | abre a sessão de pagamento no gateway |
| POST | `/payments/confirmar` | confirma a cobrança (**apenas** no modo placeholder) |
| GET | `/payments/status/:orderId` | status do pagamento de um pedido |
| POST | `/payments/webhook` | callback do gateway (MercadoPago / Stripe) |

### Restrito (JWT admin — header `Authorization: Bearer <token>`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/stats` | métricas do dashboard |
| GET | `/orders` | lista pedidos (`?status=`, `?email=`) |
| PATCH | `/orders/:id/status` | muda status (cancelar devolve estoque) |
| DELETE | `/orders/:id` | remove pedido e agendamento vinculado |
| GET/PATCH/DELETE | `/appointments…` | gestão da agenda |
| POST/PATCH/DELETE | `/products…` | CRUD de produtos |
| PATCH | `/products/:id/estoque` | ajusta estoque por SKU |

---

## Regras de negócio implementadas

- **Preço fixo de pré-venda:** R$ 14.999,97 em todas as variantes (`PRECO_PADRAO` no `.env`). Os acréscimos por modelo/capacidade já estão preparados em `src/utils/seedData.js`, zerados até o anúncio oficial.
- **Catálogo:** iPhone 18 Pro e 18 Pro Max, cada um nas cores Purple, Coffee, Burgundy e Black × 3–4 capacidades (SKU único por variante).
- **Estoque:** baixa automática na criação do pedido e devolução ao cancelar.
- **Agenda:** seg–sáb, 16 horários (09:00–17:30), **2 vagas por horário** (`CAPACIDADE_POR_SLOT` em `src/utils/helpers.js`). Slots lotados são bloqueados no front e validados no back.
- **Entrega:** retirada agendada ou entrega na região (endereço validado quando aplicável). Sem segmentação geográfica no site — fica a cargo do Meta Ads.
- **Pagamento:** o pedido nasce como `aguardando_pagamento`; `POST /payments/checkout` abre a sessão e marca o pagamento como `processando`; a aprovação (webhook, ou `POST /payments/confirmar` no modo placeholder) move o pedido para `pago`. Confirmar duas vezes é idempotente e um pedido já pago recusa novo checkout com `409`.

---

## Gateway de pagamento

O contrato consumido pelo front **já é o contrato final**. Para ativar a cobrança real basta implementar as funções de `gateway` em `src/routes/payments.js` e configurar as variáveis de ambiente:

```bash
PAYMENT_GATEWAY=placeholder   # placeholder | mercadopago | stripe
PUBLIC_URL=https://sua-loja.vercel.app

MP_ACCESS_TOKEN=              # MercadoPago
MP_WEBHOOK_SECRET=

STRIPE_SECRET_KEY=            # Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

- **`placeholder` (padrão):** nenhuma cobrança real é feita. O checkout simula a aprovação, exibe o overlay *"Processando pagamento…"* e leva à confirmação com o número do pedido.
- **MercadoPago:** criar uma `Preference` e devolver `init_point` como `checkoutUrl` — o front redireciona sozinho quando esse campo vier preenchido.
- **Stripe:** criar um `PaymentIntent` e devolver `client_secret`; o container `#gatewayMount` no `checkout.html` já está reservado para o Payment Element.
- Com gateway real, quem confirma o pagamento é **o webhook** — `/payments/confirmar` passa a responder `409`. Valide a assinatura do webhook antes de confiar no payload.

---

## Deploy na Vercel

1. Suba o projeto para um repositório Git.
2. Importe na Vercel (framework: **Other**; build command vazio; output vazio).
3. Configure as variáveis de ambiente:
   - `MONGODB_URI` (Atlas — recomendado em produção)
   - `JWT_SECRET` (**obrigatório trocar** — veja a nota de segurança abaixo)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `PUBLIC_URL` (usada nas URLs de retorno do gateway)
   - `PAYMENT_GATEWAY` e as chaves do provedor escolhido
   - `PRECO_PADRAO` (opcional)
4. Deploy. O `vercel.json` já roteia `/api/*` para a função Node e o restante para os estáticos.

---

> ⚠️ **Segurança:** o `vercel.json` versionado contém um `JWT_SECRET` de exemplo. Como o repositório é público, esse valor deve ser considerado comprometido: gere um novo segredo, configure-o **apenas** no painel de variáveis de ambiente da Vercel e remova o bloco `env` do `vercel.json`.

---

## Próximos passos (pós-lançamento)

- Implementar as funções de `gateway` em `src/routes/payments.js` para MercadoPago ou Stripe (contrato, webhook e status já prontos).
- Atualizar specs, fotos e tabela de preços reais em `src/utils/seedData.js`.
- Disparo de e-mail/WhatsApp na confirmação do pedido e lembrete de agendamento.
- Área do cliente reaproveitando `/api/auth` (já implementada).
