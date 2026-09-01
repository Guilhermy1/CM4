# CM4STORE — Pré-venda iPhone 18

Plataforma completa de pré-venda (landing page 3D + API REST + painel administrativo + checkout com agendamento), pronta para deploy na Vercel.

**Marca:** CM4STORE · Verde Neon `#7FD000` · Preto/Grafite · Branco — Apple | JBL | Xiaomi

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript puro (sem build step) |
| 3D | Three.js (r128 via CDN) — iPhone gerado proceduralmente |
| Backend | Node.js + Express 4 |
| Banco | MongoDB (Mongoose) **ou** repositório em memória (fallback automático) |
| Auth | JWT + bcrypt |
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
   ├─ index.html             # landing (hero 3D, features, modelos, FAQ)
   ├─ checkout.html          # checkout + agendamento
   ├─ confirmacao.html       # confirmação do pedido
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
| POST | `/payments/checkout` · `/payments/webhook` | **placeholder** do gateway |

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
- **Catálogo:** iPhone 18, 18 Pro e 18 Pro Max, cada um com 4 cores × 3–4 capacidades (SKU único por variante).
- **Estoque:** baixa automática na criação do pedido e devolução ao cancelar.
- **Agenda:** seg–sáb, 16 horários (09:00–17:30), **2 vagas por horário** (`CAPACIDADE_POR_SLOT` em `src/utils/helpers.js`). Slots lotados são bloqueados no front e validados no back.
- **Entrega:** retirada agendada ou entrega na região (endereço validado quando aplicável). Sem segmentação geográfica no site — fica a cargo do Meta Ads.

---

## Deploy na Vercel

1. Suba o projeto para um repositório Git.
2. Importe na Vercel (framework: **Other**; build command vazio; output vazio).
3. Configure as variáveis de ambiente:
   - `MONGODB_URI` (Atlas — recomendado em produção)
   - `JWT_SECRET` (obrigatório trocar)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `PRECO_PADRAO` (opcional)
4. Deploy. O `vercel.json` já roteia `/api/*` para a função Node e o restante para os estáticos.

---

## Próximos passos (pós-lançamento)

- Plugar MercadoPago ou Stripe em `src/routes/payments.js` (contrato e webhook já prontos).
- Atualizar specs, fotos e tabela de preços reais em `src/utils/seedData.js`.
- Disparo de e-mail/WhatsApp na confirmação do pedido e lembrete de agendamento.
- Área do cliente reaproveitando `/api/auth` (já implementada).
