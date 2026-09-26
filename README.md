# Inovasix6 Pedidos

Plataforma de gestão de pedidos para **restaurantes, lanchonetes e confeitarias** — multicanal, multiempresa, tema escuro premium.

**Demo online:** https://edsong030.github.io/inovasix6_pedidos/ (sem backend e sem banco; veja [Demo](#demo-github-pages))

## URLs e Portas

| Serviço        | URL                                  |
|----------------|--------------------------------------|
| **Frontend**   | http://localhost:3000                |
| **API**        | http://localhost:3001/api            |
| **Swagger**    | http://localhost:3001/api/docs       |
| **PostgreSQL** | localhost:5432                       |

---

## Stack

| Camada   | Tecnologia                                          |
|----------|-----------------------------------------------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS              |
| Backend  | NestJS 11 + Prisma 5.22 + PostgreSQL                |
| Auth     | JWT (Bearer) + bcryptjs                             |
| Docs API | Swagger (`/api/docs`)                               |

---

## Pré-requisitos

- **Node.js** ≥ 18 (testado com v24)
- **PostgreSQL** 14+ OU **Docker** (recomendado para desenvolvimento local)
- **npm** ≥ 9

---

## Subir com Docker (recomendado)

```bash
# 1. Banco de dados
docker run -d \
  --name inovasix_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=inovasix_pedidos \
  -p 5432:5432 \
  postgres:16-alpine
```

> No Windows PowerShell use uma linha só sem `\`:
> ```powershell
> docker run -d --name inovasix_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inovasix_pedidos -p 5432:5432 postgres:16-alpine
> ```

---

## 1. Backend (API)

```bash
cd api

# Instalar dependências
npm install

# Copiar variáveis de ambiente
copy .env.example .env
# (o .env já vem preenchido para desenvolvimento local)

# Gerar Prisma Client  ← obrigatório na primeira vez
npm run db:generate

# Criar tabelas no banco
npm run db:migrate

# Popular com dados de demonstração
npm run db:seed

# Iniciar em modo desenvolvimento (hot reload)
npm run start:dev
```

A API responde em **http://localhost:3001/api**

---

## 2. Frontend (Web)

Abra um novo terminal:

```bash
cd web

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

O frontend responde em **http://localhost:3000**

### Atualizando uma instalação existente

Depois de um `git pull`, aplique as migrations novas e gere o Prisma Client **com a API parada**:

```bash
cd api
npm run db:migrate      # aplica, por exemplo, 20260926120000_business_types
npm run db:generate
npm run build
```

As migrations só adicionam colunas com valores padrão: os dados existentes continuam como **Restaurante**, com produtos vendidos por unidade.

---

## Credenciais de Demonstração

> **Estabelecimento (slug):** `restaurante-demo`

| Perfil            | E-mail                        | Senha          |
|-------------------|-------------------------------|----------------|
| Admin             | admin@inovasix.com            | admin123       |
| Gerente           | gerente@inovasix.com          | gerente123     |
| Atendente         | atendente@inovasix.com        | atendente123   |
| Cozinha/Produção  | cozinha@inovasix.com          | cozinha123     |
| Entregador        | entregador@inovasix.com       | entregador123  |

> Essas credenciais aparecem na tela de login **somente no modo demo**.

---

## Demo (GitHub Pages)

URL pública: **https://edsong030.github.io/inovasix6_pedidos/**

A demo roda 100% no navegador: sem API, sem banco e sem segredos. No login, escolha a demonstração e entre com as credenciais acima. Dá para trocar depois pelo seletor no menu lateral.

| Demonstração         | O que mostra                                                                 |
|----------------------|------------------------------------------------------------------------------|
| **Restaurante Demo** | Entradas, Pratos principais, Pizzas, Lanches, Bebidas e Sobremesas            |
| **Lanchonete Demo**  | Hambúrgueres, Hot dogs, Porções, Combos, Açaí, Bebidas e Sobremesas, com adicionais e observações (ponto da carne, sem cebola, molho extra) |
| **Confeitaria Demo** | Bolos, Tortas, Doces, Salgados, Kits e Bebidas, com venda por kg e por cento e encomendas com prazo mínimo |
| **Japonês Demo**     | Entradas, Sushis e sashimis, Temakis, Combinados, Pratos quentes, Bebidas e Sobremesas, com adicionais (cream cheese, tarê) e observações (sem cebolinha, shoyu light) |

Cada demonstração tem cardápio, pedidos do dia, Dashboard e Relatórios próprios (histórico de 120 dias gerado localmente). A escolha fica salva só no navegador de quem está vendo. As fotos dos produtos são arquivos locais em `web/public/demo/products/images/`.

O deploy é automático a cada push na `main` (`.github/workflows/deploy-pages.yml`, com `NEXT_PUBLIC_DEMO_MODE=true`).

### Rodar a demo localmente

```bash
# Bash
cd web
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

```powershell
# PowerShell
cd web
$env:NEXT_PUBLIC_DEMO_MODE = "true"; npm run dev
```

Acesse **http://localhost:3000/inovasix6_pedidos/login** (no modo demo o endereço tem o prefixo `/inovasix6_pedidos`, igual ao GitHub Pages). Para voltar ao modo normal no PowerShell: `Remove-Item Env:NEXT_PUBLIC_DEMO_MODE`.

> A demo com os três negócios existe só no modo demo. No modo normal (frontend + API) os dados vêm do banco, e cada estabelecimento tem o próprio cardápio.

---

## Tipos de Negócio

Cada estabelecimento tem um **tipo de negócio** (`businessType`). O padrão é Restaurante.

| Tipo            | Valor           | Área de preparo | Destaques                                                   |
|-----------------|-----------------|-----------------|-------------------------------------------------------------|
| Restaurante     | `RESTAURANT`    | Cozinha         | Salão com mesas, delivery e cozinha                          |
| Lanchonete      | `SNACK_BAR`     | Cozinha         | Combos, adicionais pagos e observações rápidas               |
| Confeitaria     | `CONFECTIONERY` | **Produção**    | Venda por kg e por cento, produtos sob encomenda             |
| Japonês         | `JAPANESE`      | Cozinha         | Sushi, temaki, combinados e pratos quentes com adicionais    |

O tipo muda os textos do sistema (menu lateral, Dashboard, fila de preparo, Relatórios) e a ordem das origens no Novo Pedido. Ele **não** troca o cardápio: produtos e categorias continuam sendo os cadastrados no estabelecimento.

**Como alterar:** pelo seletor no menu lateral (somente **ADMIN**) ou pela API:

```http
GET   /api/restaurants/settings
PATCH /api/restaurants/settings   { "businessType": "CONFECTIONERY" }
```

### Cardápio: unidade, encomenda, adicionais e observações

No cadastro de produto (Cardápio → Novo/Editar produto):

| Campo                  | Uso                                                                  |
|------------------------|----------------------------------------------------------------------|
| **Vendido por**        | `UNIT` (unidade), `KG` (quilo, aceita 1,5 kg) ou `HUNDRED` (cento)   |
| **Sob encomenda**      | Exige data/hora de retirada ou entrega no pedido                      |
| **Prazo mínimo**       | Antecedência mínima da encomenda, em horas (ex.: 48)                 |
| **Adicionais**         | Itens pagos, ex.: Bacon extra R$ 5,00, Topo personalizado R$ 25,00   |
| **Observações rápidas**| Atalhos no pedido, ex.: Sem cebola, Ponto: ao ponto, Molho à parte   |

No pedido, o preço dos adicionais vem sempre do cadastro (a API ignora valores enviados pelo cliente), e quantidades fracionadas só são aceitas em produtos vendidos por quilo.

### Encomendas

Pedidos podem ter **data/hora de retirada ou entrega** (`isPreorder`, `scheduledFor`). A API recusa encomendas que não respeitem o maior prazo mínimo entre os produtos do pedido. Na fila de preparo, encomendas aparecem pela data combinada ("em 2h", "em 50h") e só ficam urgentes a menos de 1 hora do horário; no Dashboard, não disparam o alerta de pedido atrasado.

---

## Scripts completos

### Backend (`api/`)

| Script                    | Descrição                                      |
|---------------------------|------------------------------------------------|
| `npm run start:dev`       | Inicia API em modo watch (desenvolvimento)     |
| `npm run build`           | Compila TypeScript → `dist/`                   |
| `npm run start:prod`      | Inicia a build compilada (produção)            |
| `npm run db:generate`     | Gera Prisma Client (rodar após mudar schema)   |
| `npm run db:migrate`      | Cria migration e aplica (dev)                  |
| `npm run db:migrate:prod` | Aplica migrations sem criar novas (produção)   |
| `npm run db:seed`         | Popula banco com dados de demonstração         |
| `npm run db:studio`       | Abre Prisma Studio GUI em localhost:5555       |
| `npm run db:reset`        | Reseta banco completo ⚠️ apaga todos os dados  |

### Frontend (`web/`)

| Script          | Descrição                            |
|-----------------|--------------------------------------|
| `npm run dev`   | Inicia em modo desenvolvimento       |
| `npm run build` | Gera build de produção               |
| `npm run start` | Inicia servidor de produção          |

Com `NEXT_PUBLIC_DEMO_MODE=true`, `dev` roda a demo sem API e `build` gera o site estático em `web/out/` (ver [Demo](#demo-github-pages)).

---

## Estrutura do Projeto

```
Inovasix Pedidos/
├── api/                          # Backend NestJS
│   ├── prisma/
│   │   ├── schema.prisma         # Schema Prisma 5
│   │   ├── seed.ts               # Dados de demonstração
│   │   └── migrations/           # Migrations geradas
│   ├── src/
│   │   ├── auth/                 # JWT + estratégias passport
│   │   ├── users/                # CRUD de usuários
│   │   ├── categories/           # Categorias do cardápio
│   │   ├── products/             # Produtos do cardápio
│   │   ├── orders/               # Pedidos + Dashboard KPIs
│   │   ├── restaurants/          # Configurações (tipo de negócio)
│   │   ├── tables/               # Mesas e comandas
│   │   ├── kitchen/              # Fila da cozinha / produção
│   │   ├── reports/              # Relatórios de vendas
│   │   ├── integrations/
│   │   │   └── anota-ai/         # Módulo integração Anota AI
│   │   ├── common/
│   │   │   ├── decorators/       # @CurrentUser, @Roles
│   │   │   └── guards/           # JwtAuthGuard, RolesGuard
│   │   └── prisma/               # PrismaService global
│   ├── .env                      # Variáveis de ambiente (dev)
│   └── .env.example              # Template de variáveis
│
└── web/                          # Frontend Next.js 14
    ├── app/
    │   ├── (auth)/login/         # Tela de login
    │   └── (dashboard)/
    │       ├── dashboard/        # KPIs e gráficos
    │       ├── orders/           # Gestão de pedidos
    │       ├── kitchen/          # Fila da cozinha / produção
    │       ├── tables/           # Mesas e comandas
    │       ├── menu/             # Cardápio
    │       ├── reports/          # Relatórios
    │       └── users/            # Usuários
    ├── components/
    │   ├── layout/               # Sidebar, Header, fundo tecnológico
    │   ├── orders/               # OrderCard, NewOrderModal
    │   └── ui/                   # Badge, Modal, Spinner
    ├── hooks/
    │   ├── useAuth.tsx           # Context de autenticação + troca de tipo de negócio
    │   ├── useBusiness.ts        # Perfil do tipo de negócio atual
    │   └── useApi.ts             # Roteia chamadas para a API ou para a demo
    ├── lib/
    │   ├── api.ts                # Axios com interceptors JWT
    │   ├── auth.ts               # Helpers cookie/token
    │   ├── business.ts           # Textos por tipo de negócio, unidades de venda
    │   ├── demo/                 # Dados e store da demo (3 tipos de negócio)
    │   └── utils.ts              # Formatadores e constantes
    └── types/
        └── index.ts              # Tipos TypeScript globais
```

---

## Canais de Pedido

| Canal      | Descrição                                            |
|------------|------------------------------------------------------|
| `DELIVERY` | Entrega no endereço do cliente                       |
| `DINE_IN`  | Consumo no salão / mesa                              |
| `COUNTER`  | Balcão (consumo imediato)                            |
| `TAKEOUT`  | Retirada pelo cliente                                |
| `IFOOD`    | Origem iFood — registro manual; integração futura    |
| `WHATSAPP` | Origem WhatsApp — registro manual; integração futura |

`IFOOD` e `WHATSAPP` ainda não têm integração: o pedido é lançado manualmente e o campo `externalRef` fica reservado para o identificador do canal.

---

## Fluxo de Status do Pedido

```
RECEIVED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                         ↓
                      DELIVERED (sem entrega externa)
Qualquer etapa → CANCELLED
```

---

## Perfis de Acesso

| Perfil      | Permissões                                      |
|-------------|-------------------------------------------------|
| ADMIN       | Acesso total, inclusive alterar o tipo de negócio |
| MANAGER     | Tudo exceto operações destrutivas               |
| ATTENDANT   | Criar pedidos, mesas, cardápio (leitura)        |
| KITCHEN     | Fila da cozinha/produção, atualizar status      |
| DELIVERY    | Pedidos delivery, confirmar entrega             |

---

## Integração Anota AI

O módulo está preparado e **desativado por padrão**. Para ativar:

1. No `api/.env`, configure:
   ```env
   ANOTA_AI_ENABLED=true
   ANOTA_AI_WEBHOOK_SECRET=seu_secret
   ANOTA_AI_API_KEY=sua_chave
   ```

2. Endpoints de webhook disponíveis:
   - `POST /api/integrations/anota-ai/webhook/:restaurantId/order-placed`
   - `POST /api/integrations/anota-ai/webhook/:restaurantId/order-updated`
   - `POST /api/integrations/anota-ai/webhook/:restaurantId/order-cancelled`

3. Todos os eventos são registrados na tabela `anota_ai_events` com deduplicação via `externalId`.

---

## Variáveis de Ambiente

### `api/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inovasix_pedidos?schema=public"
JWT_SECRET="troque-por-um-segredo-forte-em-producao"
JWT_EXPIRES_IN="8h"
PORT=3001
NODE_ENV=development
ANOTA_AI_ENABLED=false
ANOTA_AI_WEBHOOK_SECRET=
ANOTA_AI_API_KEY=
```

### `web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Produção

```bash
# Backend
cd api
npm run build
npm run db:migrate:prod
npm run start:prod

# Frontend
cd web
npm run build
npm run start
```

> ⚠️ Em produção: troque `JWT_SECRET` e todas as senhas. Nunca use as credenciais de demo.
