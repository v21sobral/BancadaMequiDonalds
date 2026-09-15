# Bancada MequiDonalds

Projeto web acadêmico com React/Vite no frontend e Node/Express + PostgreSQL (Supabase) no backend.

## Estrutura

- `Frontend/` — React + Vite, páginas públicas, autenticação e área Bancada/Blog.
- `Backend/` — API Express compatível com Vercel e PostgreSQL/Supabase.
- `Backend/schema.sql` — estrutura do banco para o Supabase.
- `Backend/.env.example` — variáveis necessárias para o backend.

## Arquitetura de produção

`Usuário → Vercel (Frontend) → Vercel (API) → PostgreSQL/Supabase`

## Configuração

### Supabase

1. Abra o SQL Editor do seu projeto Supabase.
2. Execute `Backend/schema.sql`.
3. Copie a Connection String PostgreSQL do projeto.

### Backend

Configure:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=uma-chave-longa-e-aleatoria
FRONTEND_URL=http://localhost:5173,https://seu-frontend.vercel.app
```

### Frontend

Configure:

```env
VITE_API_URL=http://localhost:3000
```

Em produção, substitua pelo endereço da API publicada.
