const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',').map((item) => item.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não autorizada pelo CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) console.warn('Supabase não configurado: defina SUPABASE_URL e SUPABASE_SECRET_KEY.');
if (!JWT_SECRET) console.warn('JWT_SECRET não configurado.');

const attempts = new Map();
function authRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = attempts.get(key) || { count: 0, reset: now + 15 * 60 * 1000 };
  if (now > current.reset) { current.count = 0; current.reset = now + 15 * 60 * 1000; }
  current.count += 1; attempts.set(key, current);
  if (current.count > 20) return res.status(429).json({ mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  next();
}

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase não configurado.');
}

async function supabase(path, options = {}) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || 'Erro no Supabase.');
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ mensagem: 'Token não fornecido.' });
  if (!JWT_SECRET) return res.status(500).json({ mensagem: 'Autenticação não configurada no servidor.' });
  try { req.usuario = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ mensagem: 'Sessão expirada ou token inválido.' }); }
}

function validarCredenciais({ nome, email, senha }) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Informe um e-mail válido.';
  if (!senha || senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  if (nome !== undefined && (!nome || nome.trim().length < 2)) return 'Informe seu nome completo.';
  return null;
}

app.get('/', (_req, res) => res.json({ nome: 'Bancada MequiDonalds API', status: 'online' }));

app.get('/health', async (_req, res) => {
  try { await supabase('usuarios?select=id&limit=1'); res.json({ status: 'ok', banco: 'Supabase conectado' }); }
  catch (error) { console.error('Health:', error.message); res.status(503).json({ status: 'erro', banco: 'Supabase indisponível' }); }
});

app.post('/auth/cadastrar', authRateLimit, async (req, res) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const validation = validarCredenciais({ nome, email, senha });
    if (validation) return res.status(400).json({ mensagem: validation });
    const hash = await bcrypt.hash(senha, 12);
    const data = await supabase('usuarios', { method: 'POST', body: JSON.stringify({ nome, email, senha: hash }) });
    return res.status(201).json({ usuario: data[0] });
  } catch (error) {
    if (error.status === 409 || error.details?.code === '23505') return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    console.error('Cadastro:', error.details || error);
    return res.status(500).json({ mensagem: 'Não foi possível concluir o cadastro.' });
  }
});

app.post('/auth/login', authRateLimit, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    if (!email || !senha) return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    const data = await supabase(`usuarios?select=id,nome,email,senha&email=eq.${encodeURIComponent(email)}&limit=1`);
    const usuario = data[0];
    if (!usuario) return res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });

    let senhaValida = false;
    try { senhaValida = await bcrypt.compare(senha, usuario.senha); } catch { senhaValida = false; }
    if (!senhaValida && usuario.senha === senha) {
      senhaValida = true;
      await supabase(`usuarios?id=eq.${usuario.id}`, { method: 'PATCH', body: JSON.stringify({ senha: await bcrypt.hash(senha, 12) }) });
    }
    if (!senhaValida) return res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
    if (!JWT_SECRET) return res.status(500).json({ mensagem: 'JWT_SECRET não configurado.' });

    const payload = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, usuario: payload });
  } catch (error) {
    console.error('Login:', error.details || error);
    res.status(500).json({ mensagem: 'Erro ao fazer login.' });
  }
});

app.get('/auth/me', autenticarToken, async (req, res) => {
  try {
    const data = await supabase(`usuarios?select=id,nome,email,criado_em&id=eq.${req.usuario.id}&limit=1`);
    if (!data[0]) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    res.json({ usuario: data[0] });
  } catch (error) { console.error('Me:', error.details || error); res.status(500).json({ mensagem: 'Erro ao consultar usuário.' }); }
});

app.get('/mensagens', async (_req, res) => {
  try {
    const data = await supabase('mensagens?select=id,titulo,texto,data_hora,criado_em,autor_id,usuarios(id,nome)&order=data_hora.desc,id.desc');
    res.json(data.map((m) => ({
      id: m.id, titulo: m.titulo, texto: m.texto,
      dataHora: new Date(m.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      criadoEm: m.criado_em, autorId: m.autor_id, autorNome: m.usuarios?.nome || 'Equipe',
    })));
  } catch (error) { console.error('Listar:', error.details || error); res.status(500).json({ mensagem: 'Erro ao buscar publicações.' }); }
});

app.post('/mensagens', autenticarToken, async (req, res) => {
  try {
    const titulo = String(req.body.titulo || '').trim(); const texto = String(req.body.texto || '').trim();
    if (!titulo || !texto) return res.status(400).json({ mensagem: 'Título e texto são obrigatórios.' });
    if (titulo.length > 120) return res.status(400).json({ mensagem: 'O título deve ter no máximo 120 caracteres.' });
    if (texto.length > 5000) return res.status(400).json({ mensagem: 'O texto deve ter no máximo 5000 caracteres.' });
    const data = await supabase('mensagens', { method: 'POST', body: JSON.stringify({ titulo, texto, autor_id: req.usuario.id }) });
    const item = data[0];
    res.status(201).json({ id:item.id, titulo:item.titulo, texto:item.texto, dataHora:new Date(item.data_hora).toLocaleString('pt-BR', { timeZone:'America/Bahia', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }), criadoEm:item.criado_em, autorId:req.usuario.id, autorNome:req.usuario.nome });
  } catch (error) { console.error('Criar:', error.details || error); res.status(500).json({ mensagem: 'Erro ao criar publicação.' }); }
});

app.put('/mensagens/:id', autenticarToken, async (req, res) => {
  try {
    const id = Number(req.params.id); const titulo = String(req.body.titulo || '').trim(); const texto = String(req.body.texto || '').trim();
    if (!Number.isInteger(id) || !titulo || !texto) return res.status(400).json({ mensagem: 'Dados da publicação inválidos.' });
    const data = await supabase(`mensagens?id=eq.${id}&autor_id=eq.${req.usuario.id}`, { method: 'PATCH', body: JSON.stringify({ titulo, texto, atualizado_em: new Date().toISOString() }) });
    if (!data[0]) return res.status(404).json({ mensagem: 'Publicação não encontrada ou sem permissão.' });
    const item = data[0]; res.json({ ...item, autorId:req.usuario.id, autorNome:req.usuario.nome, dataHora:new Date(item.data_hora).toLocaleString('pt-BR', { timeZone:'America/Bahia', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) });
  } catch (error) { console.error('Editar:', error.details || error); res.status(500).json({ mensagem: 'Erro ao editar publicação.' }); }
});

app.delete('/mensagens/:id', autenticarToken, async (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ mensagem: 'Publicação inválida.' });
    const data = await supabase(`mensagens?id=eq.${id}&autor_id=eq.${req.usuario.id}`, { method: 'DELETE' });
    if (!data[0]) return res.status(404).json({ mensagem: 'Publicação não encontrada ou sem permissão.' });
    res.json({ mensagem: 'Publicação removida com sucesso.' });
  } catch (error) { console.error('Excluir:', error.details || error); res.status(500).json({ mensagem: 'Erro ao apagar publicação.' }); }
});

app.use((error, _req, res, _next) => { console.error('Erro não tratado:', error); res.status(500).json({ mensagem: 'Erro interno do servidor.' }); });

if (require.main === module) app.listen(port, () => console.log(`API Bancada MequiDonalds na porta ${port}`));
module.exports = app;
