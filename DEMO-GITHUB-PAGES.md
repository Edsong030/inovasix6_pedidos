# Demo — GitHub Pages

URL pública: **https://edsong030.github.io/inovasix6_pedidos/**

---

## O que é a demo

Versão estática do frontend **Inovasix6 Pedidos** publicada no GitHub Pages.  
Funciona 100% no browser, sem backend, sem banco e sem segredos.

- Login com credenciais demonstrativas (sem API)  
- Todos os dados são locais (memória do browser)  
- Criar pedidos, atualizar status, navegar pelas telas funciona normalmente  
- Os dados voltam ao estado original ao recarregar a página

---

## Credenciais de demonstração

> Slug do restaurante: `restaurante-demo` (qualquer valor funciona no modo demo)

| Perfil      | E-mail                        | Senha          |
|-------------|-------------------------------|----------------|
| Admin       | admin@inovasix.com            | admin123       |
| Gerente     | gerente@inovasix.com          | gerente123     |
| Atendente   | atendente@inovasix.com        | atendente123   |
| Cozinha     | cozinha@inovasix.com          | cozinha123     |
| Entregador  | entregador@inovasix.com       | entregador123  |

---

## Como publicar no GitHub Pages

### 1. Configurar o repositório

```bash
# Na raiz do projeto
git init
git remote add origin https://github.com/Edsong030/inovasix6_pedidos.git
```

### 2. Habilitar GitHub Pages

No repositório GitHub:  
`Settings → Pages → Source → GitHub Actions`

### 3. Push para main

```bash
git add .
git commit -m "feat: deploy demo GitHub Pages"
git push -u origin main
```

O workflow `.github/workflows/deploy-pages.yml` executa automaticamente e publica em 2–3 minutos.

---

## Como rodar a demo localmente

```bash
cd web

# Instalar dependências (uma vez)
npm install

# Rodar em modo demo (sem backend)
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

Acesse **http://localhost:3000**

---

## Como rodar o sistema completo (com backend)

Ver `README.md` na raiz do projeto.  
O modo demo **não interfere** no funcionamento normal quando `NEXT_PUBLIC_DEMO_MODE` não está definido ou é `false`.

---

## Build estático local

```bash
cd web
NEXT_PUBLIC_DEMO_MODE=true npm run build
# Output gerado em web/out/
```

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `web/lib/demo/data.ts`         | Dados demonstrativos (pedidos, produtos, mesas...) |
| `web/lib/demo/store.ts`        | Store em memória — simula CRUD sem API |
| `web/lib/demo/index.ts`        | Flag `IS_DEMO` e re-exports |
| `web/hooks/useApi.ts`          | Abstração que roteia para demo store ou API real |
| `web/hooks/useAuth.tsx`        | Login demo sem chamada de rede |
| `web/next.config.mjs`          | Configuração condicional: `output:'export'` só no modo demo |
| `.github/workflows/deploy-pages.yml` | CI/CD para GitHub Pages |

---

## O que NÃO é publicado

- Backend NestJS (`api/`)
- Banco PostgreSQL
- Arquivos `.env` com senhas ou tokens
- Migrations do Prisma
- `node_modules/`
