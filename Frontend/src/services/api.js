const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.mensagem || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }

  return data;
}



export const apiUrl = API_URL;
export const api = {
  login: (email, senha) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  }),
  cadastrar: (nome, email, senha) => request('/auth/cadastrar', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha }),
  }),
  me: (token) => request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }),
  listarMensagens: () => request('/mensagens'),
  criarMensagem: (token, payload) => request('/mensagens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }),
  editarMensagem: (token, id, payload) => request(`/mensagens/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }),
  apagarMensagem: (token, id) => request(`/mensagens/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }),
  listarMidias: () => request('/midias'),
  criarMidia: (token, payload) => request('/midias', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }),
  apagarMidia: (token, id) => request(`/midias/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }),
};
