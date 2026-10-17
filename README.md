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
| Auth     | Sessão em cookie HttpOnly (JWT validado no banco) + bcryptjs |
| Docs API | Swagger (`/api/docs`)                               |

---

## Pré-requisitos

- **Node.js** ≥ 18 (testado com v24)
- **PostgreSQL** 14+ OU **Docker** (recomendado para desenvolvimento local)
- **npm** ≥ 9

---

## Banco de dados com Docker (recomendado)

```bash
# 1. Defina a senha do banco local em .env (arquivo não versionado)
cp .env.example .env        # PowerShell: copy .env.example .env
#    edite .env e preencha POSTGRES_PASSWORD (use a mesma senha na DATABASE_URL de api/.env)

# 2. Suba só o PostgreSQL (escuta apenas em 127.0.0.1:5432)
docker compose up -d
```

> Produção usa `docker-compose.prod.yml`: banco sem porta exposta, migrations antes da API e **nenhum seed**.
> Todas as variáveis obrigatórias estão em `.env.example`.

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
| `npm run db:demo-reset -- --confirm` | Recria só os 4 estabelecimentos demo ⚠️ apaga cardápio, mesas e pedidos deles (sem `--confirm` só lista; recusado em produção) |
| `npm run db:studio`       | Abre Prisma Studio GUI em localhost:5555       |
| `npm run db:reset`        | Reseta banco completo ⚠️ apaga todos os dados  |
| `npm test`                | Testes unitários (não usam banco)              |
| `npm run test:e2e:isolated` | Testes HTTP em banco descartável `_test` ⚠️ apaga o schema dele (ver [Testes HTTP (E2E) isolados](#testes-http-e2e-isolados)) |
| `npm run test:e2e`        | Mesmo que `test:e2e:isolated` (mesmas travas)  |
| `npm run platform:create-admin` | Cria/redefine o administrador da plataforma (variáveis `PLATFORM_*`) |

### Frontend (`web/`)

| Script          | Descrição                            |
|-----------------|--------------------------------------|
| `npm run dev`   | Inicia em modo desenvolvimento       |
| `npm run build` | Gera build de produção               |
| `npm run start` | Inicia servidor de produção          |
| `npm test`      | Testes do web (sem API e sem banco)  |

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
    │   ├── auth.ts               # Sessão local da demo estática
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

## Autenticação e sessão (modo API)

- O login grava a sessão no cookie **`inx_session`**: `HttpOnly` (o JavaScript da página não lê), `SameSite=Strict`, `Path=/api` e `Secure` em produção. O token **não** vem no corpo da resposta.
- Cada requisição confere no banco se a sessão continua válida. **Logout** encerra a sessão atual; **desativar o usuário, trocar a senha ou o papel** encerra todas as sessões dele já na requisição seguinte.
- `GET /api/auth/me` devolve o usuário da sessão; `POST /api/auth/logout` encerra a sessão e apaga o cookie.
- **Limite de tentativas:** 5 senhas erradas por IP + e-mail + estabelecimento (e 30 por IP) em 15 min → `429`.
- **Senhas novas:** mínimo de 10 caracteres, com letras e números. As credenciais de demonstração continuam funcionando (a regra vale para senhas criadas ou trocadas).
- Requisições que alteram dados vindas de outra origem (`Origin` fora de `FRONTEND_URL`) → `403`.

**Swagger (desenvolvimento):** abra http://localhost:3001/api/docs, execute `POST /api/auth/login` com as credenciais de demonstração e pronto: o navegador guarda o cookie e as próximas chamadas do Swagger já saem autenticadas.

**Linha de comando:**

```bash
curl -c sessao.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@inovasix.com","password":"admin123","restaurantSlug":"restaurante-demo"}' \
  http://localhost:3001/api/auth/login
curl -b sessao.txt http://localhost:3001/api/auth/me
curl -b sessao.txt -X POST http://localhost:3001/api/auth/logout
```

> O arquivo `sessao.txt` contém a sessão: apague-o depois e nunca o versione.
> A demo estática (GitHub Pages) não usa a API: login local e dados fictícios.

---

## Perfis de Acesso

A regra fica na API (`api/src/common/permissions.ts`); a interface só esconde o que o perfil não pode fazer.

| Ação | ADMIN | MANAGER | ATTENDANT | KITCHEN | DELIVERY |
|---|---|---|---|---|---|
| Criar pedido | sim | sim | sim | não | não |
| Consultar pedidos | sim | sim | sim | sim | só pedidos de delivery |
| Recebido → Em preparo → Pronto | sim | sim | sim | sim | não |
| Pronto → Saiu p/ entrega → Entregue | sim | sim | sim | não | só pedidos de delivery |
| Cancelar pedido | sim | sim | só "Recebido" | não | não |
| Faturamento, relatórios e histórico | sim | sim | não | não | não |
| Cozinha/Produção | sim | sim | sim¹ | sim | não |
| Mesas: consultar | sim | sim | sim | sim | não |
| Mesas: alterar status | sim | sim | sim | não | não |
| Cardápio, cadastro de mesas, configurações | sim | sim | não | não | não |
| Usuários | todos os papéis | só atendente, cozinha e entregador | não | não | não |

¹ O atendente acompanha a produção para coordenar balcão e salão.
Ninguém altera o próprio papel nem se desativa, e o último administrador ativo não pode ser removido.

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
JWT_EXPIRES_IN="8h"          # duração da sessão (cookie e token)
PORT=3001
FRONTEND_URL=http://localhost:3000   # origem(ns) do web (CORS e CSRF), separadas por vírgula
# COOKIE_SAMESITE=strict    # strict (padrão) | lax | none (none exige HTTPS)
# COOKIE_SECURE=true        # força Secure fora de produção (ex.: dev com HTTPS)
# COOKIE_DOMAIN=            # só se web e API usarem subdomínios diferentes
# TRUST_PROXY=1             # atrás de proxy reverso: IP real para o limite de login
PUBLIC_API_URL=             # origem pública da API nas URLs de uploads (vazio = /uploads/... relativa)
NODE_ENV=development
ANOTA_AI_ENABLED=false      # manter false até confirmar com a Anota AI o cabeçalho/formato da assinatura
ANOTA_AI_WEBHOOK_SECRET=
ANOTA_AI_API_KEY=
```

Administrador da plataforma (só para `npm run platform:create-admin`; defina no terminal ao rodar o comando, sem salvar senha em arquivo):

```env
PLATFORM_ADMIN_EMAIL=        # obrigatório: e-mail real de quem administra a plataforma
PLATFORM_ADMIN_PASSWORD=     # obrigatório: 10+ caracteres, com letras e números
PLATFORM_ADMIN_NAME=         # opcional (padrão: Equipe Inovasix6)
PLATFORM_SLUG=               # opcional (padrão: inovasix-plataforma)
```

### `web/.env.local`

Modelo em `web/.env.example` (`copy web\.env.example web\.env.local` no PowerShell):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api   # embutida no build: refaça o build ao mudar
NEXT_PUBLIC_DEMO_MODE=false                     # true = demo estática sem API (GitHub Pages)
```

---

## Testes HTTP (E2E) isolados

Os testes HTTP **apagam e recriam o schema** do banco (`prisma migrate reset`). Por isso o comando só roda quando **todas** as travas passam, antes de qualquer conexão ou escrita:

1. `DATABASE_URL` definida **no terminal** (a do `api/.env` nunca é usada), PostgreSQL, com nome de banco terminando em `_test`;
2. o banco não é `inovasix_pedidos` (desenvolvimento) nem o mesmo banco do `api/.env`;
3. `E2E_CONFIRM_DB_RESET` igual ao **nome exato** do banco de teste.

Use um Postgres descartável, separado do banco de desenvolvimento (porta 55432, dados em memória):

```bash
# 1. Sobe o banco de teste (some ao parar o container)
docker run -d --rm --name inovasix_e2e_pg -e POSTGRES_USER=e2e -e POSTGRES_PASSWORD=e2e \
  -e POSTGRES_DB=inovasix_pedidos_test -p 127.0.0.1:55432:5432 \
  --tmpfs /var/lib/postgresql/data postgres:16-alpine

# 2. Roda os testes HTTP (Bash)
cd api
DATABASE_URL="postgresql://e2e:e2e@127.0.0.1:55432/inovasix_pedidos_test?schema=public" \
E2E_CONFIRM_DB_RESET=inovasix_pedidos_test npm run test:e2e:isolated

# 3. Descarta o banco
docker stop inovasix_e2e_pg
```

> No Git Bash (Windows), rode o passo 1 com `MSYS_NO_PATHCONV=1 docker run ...`: sem isso o caminho do `--tmpfs` é convertido para `C:/...` e o Docker recusa.

No PowerShell, o passo 2 fica:

```powershell
cd api
$env:DATABASE_URL = "postgresql://e2e:e2e@127.0.0.1:55432/inovasix_pedidos_test?schema=public"
$env:E2E_CONFIRM_DB_RESET = "inovasix_pedidos_test"
npm run test:e2e:isolated
Remove-Item Env:DATABASE_URL, Env:E2E_CONFIRM_DB_RESET   # não deixe a URL de teste no terminal
```

No CI (`.github/workflows/ci.yml`) os testes HTTP rodam só contra o Postgres de serviço do próprio job, criado e destruído a cada execução. As travas têm testes em `api/test/e2e-env.spec.ts` (rodam no `npm test`).

---

## Homologação

Fluxo seguro (nada aqui toca o banco de desenvolvimento):

1. **Banco próprio da homologação**, vazio, nunca o `inovasix_pedidos` local. Aplique só as migrations: `npm run db:migrate:prod` (nunca `db:migrate`, `db:reset`, `db:seed` ou `db:demo-reset`).
2. **Administrador da plataforma** com e-mail real: `npm run platform:create-admin` com as variáveis `PLATFORM_*` no terminal.
3. **Variáveis obrigatórias** (sem valores de exemplo; nenhuma pode apontar para `localhost`):

| Variável | Onde | Valor em homologação |
|----------|------|----------------------|
| `NODE_ENV` | API | `production` (ativa cookie `Secure`, recusa `JWT_SECRET` fraco e bloqueia seed/demo-reset) |
| `JWT_SECRET` | API | **Novo**, 64+ caracteres aleatórios: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Nunca reutilize o do dev nem os publicados no repositório |
| `FRONTEND_URL` | API | Origem do web de homologação, ex.: `https://homolog.seudominio.com` (CORS e CSRF; sem ela a API cai em `http://localhost:3000`) |
| `PUBLIC_API_URL` | API | Origem pública da API, ex.: `https://api-homolog.seudominio.com` (URLs dos uploads) |
| `COOKIE_DOMAIN` | API | Vazio quando web e API ficam no mesmo host; `.seudominio.com` só se precisarem compartilhar o cookie entre subdomínios |
| `NEXT_PUBLIC_API_URL` | Web (build) | `https://api-homolog.seudominio.com/api`, com `NEXT_PUBLIC_DEMO_MODE=false`. É embutida no build: gere o build do web já com o valor de homologação |

4. **Validação antes de liberar:** `npm audit`, `npm test` e `npm run build` em `api/` e `web/`, e `npm run test:e2e:isolated` contra um banco descartável `_test` (seção acima).
5. **Swagger** (`/api/docs`) continua exposto em todos os ambientes; veja a decisão pendente na próxima seção antes de publicar a homologação.

### Swagger em homologação/produção (decisão pendente)

Hoje `/api/docs` é público em qualquer `NODE_ENV`. Os endpoints continuam exigindo sessão, mas o documento revela o mapa completo da API. Proposta (ainda não aplicada; exige escolha de produto e, na opção B, credenciais):

- **A. Desligar por variável:** `SWAGGER_ENABLED` (padrão `true` em desenvolvimento) que o deploy de produção/homologação define como `false`. Não exige credenciais.
- **B. Proteger com Basic Auth:** `/api/docs` e `/api/docs-json` pedem usuário/senha de `SWAGGER_USER`/`SWAGGER_PASSWORD`, comparados em tempo constante, só com HTTPS. Exige definir e guardar essas credenciais.
- **C. Restringir no proxy reverso:** liberar `/api/docs` só para IPs/VPN da equipe, sem mudar a API.

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

> ⚠️ Em produção: troque `JWT_SECRET` e todas as senhas. Nunca use as credenciais de demo. Variáveis obrigatórias e fluxo em [Homologação](#homologação).
