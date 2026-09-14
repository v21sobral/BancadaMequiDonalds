-- Bancada MequiDonalds - PostgreSQL / Supabase
-- Execute este script no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensagens (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(120) NOT NULL,
  texto TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autor_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_data_hora ON mensagens (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_autor_id ON mensagens (autor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- O backend usa a conexão PostgreSQL do Supabase e mantém as regras de acesso na API.
-- Se você também acessar essas tabelas diretamente pelo cliente Supabase, configure RLS
-- e policies específicas para esse cenário.
