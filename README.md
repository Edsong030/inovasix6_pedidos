# Inovasix6 Pedidos

Plataforma de gestão de pedidos para restaurantes — multicanal, multiempresa, tema escuro premium.

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

---

## Credenciais de Demonstração

> **Slug do restaurante:** `restaurante-demo`

| Perfil      | E-mail                        | Senha          |
|-------------|-------------------------------|----------------|
| Admin       | admin@inovasix.com            | admin123       |
| Gerente     | gerente@inovasix.com          | gerente123     |
| Atendente   | atendente@inovasix.com        | atendente123   |
| Cozinha     | cozinha@inovasix.com          | cozinha123     |
| Entregador  | entregador@inovasix.com       | entregador123  |

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
│   │   ├── tables/               # Mesas e comandas
│   │   ├── kitchen/              # Fila da cozinha
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
    │       ├── kitchen/          # Fila da cozinha
    │       ├── tables/           # Mesas e comandas
    │       ├── menu/             # Cardápio
    │       ├── reports/          # Relatórios
    │       └── users/            # Usuários
    ├── components/
    │   ├── layout/               # Sidebar, Header
    │   ├── orders/               # OrderCard, NewOrderModal
    │   └── ui/                   # Badge, Modal, Spinner
    ├── hooks/
    │   └── useAuth.tsx           # Context de autenticação
    ├── lib/
    │   ├── api.ts                # Axios com interceptors JWT
    │   ├── auth.ts               # Helpers cookie/token
    │   └── utils.ts              # Formatadores e constantes
    └── types/
        └── index.ts              # Tipos TypeScript globais
```

---

## Canais de Pedido

| Canal      | Descrição                      |
|------------|--------------------------------|
| `DELIVERY` | Entrega no endereço do cliente |
| `DINE_IN`  | Consumo no salão / mesa        |
| `COUNTER`  | Balcão (consumo imediato)      |
| `TAKEOUT`  | Retirada pelo cliente          |

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
| ADMIN       | Acesso total                                    |
| MANAGER     | Tudo exceto operações destrutivas               |
| ATTENDANT   | Criar pedidos, mesas, cardápio (leitura)        |
| KITCHEN     | Fila da cozinha, atualizar status               |
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
