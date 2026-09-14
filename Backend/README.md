# Backend — Bancada MequiDonalds

API Node.js/Express preparada para Vercel e Supabase.

## Variáveis de ambiente

- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key do Supabase. **Somente no backend.**
- `JWT_SECRET`: segredo longo e aleatório para os tokens de sessão.
- `FRONTEND_URL`: URL do frontend Vercel; múltiplas URLs podem ser separadas por vírgula.

## Banco

Execute `schema.sql` no SQL Editor do Supabase antes de usar cadastro/login.

## Rodar localmente

Na pasta `Backend`, crie `.env` baseado em `.env.example` e execute:

```bash
npm install
npm start
```

A API ficará em `http://localhost:3000`.

## Vercel

Importe a pasta `Backend` como um projeto separado no Vercel e cadastre as variáveis de ambiente. O `vercel.json` já encaminha as rotas para `server.js`.
