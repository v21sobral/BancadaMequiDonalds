import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import './style.css';

const emptyForm = { titulo: '', texto: '' };

function Blog({ token, usuario }) {
  const [mensagens, setMensagens] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mostrarEditor, setMostrarEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    try { setMensagens(await api.listarMensagens()); }
    catch (error) { setErro(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return mensagens;
    return mensagens.filter(m => `${m.titulo} ${m.texto} ${m.autorNome || ''}`.toLowerCase().includes(term));
  }, [mensagens, busca]);

  const abrirNovo = () => { setForm(emptyForm); setEditingId(null); setErro(''); setMostrarEditor(true); };
  const abrirEdicao = (msg) => { setForm({ titulo: msg.titulo, texto: msg.texto }); setEditingId(msg.id); setErro(''); setMostrarEditor(true); };
  const fecharEditor = () => { setMostrarEditor(false); setEditingId(null); setForm(emptyForm); };

  const salvar = async (event) => {
    event.preventDefault(); setSaving(true); setErro('');
    try {
      if (editingId) await api.editarMensagem(token, editingId, form);
      else await api.criarMensagem(token, form);
      fecharEditor(); await carregar();
    } catch (error) {
      setErro(error.message);
      if (error.status === 401) localStorage.removeItem('token');
    } finally { setSaving(false); }
  };

  const apagar = async (id) => {
    if (!window.confirm('Remover esta publicação da Bancada?')) return;
    setErro('');
    try { await api.apagarMensagem(token, id); await carregar(); }
    catch (error) { setErro(error.message); }
  };

  return <section className="blog-page page-shell"><div className="container">
    <div className="blog-hero"><div><span className="section-kicker">Área autenticada</span><h1 className="section-title">Olá, {usuario.nome?.split(' ')[0]}.</h1><p>Este é o espaço da equipe para registrar ideias, novidades e tudo que merece ficar na história do projeto.</p></div><button className="blog-new" onClick={abrirNovo}>+ Nova publicação</button></div>
    <div className="blog-toolbar"><div className="blog-count"><strong>{mensagens.length}</strong> publicação{mensagens.length === 1 ? '' : 'ões'}</div><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar na Bancada..." aria-label="Buscar publicações" /></div>
    {erro && <div className="blog-alert" role="alert">{erro}</div>}
    {mostrarEditor && <form className="blog-editor" onSubmit={salvar}><div className="editor-head"><div><span className="section-kicker">{editingId ? 'Editar' : 'Nova publicação'}</span><h2>{editingId ? 'Atualize o conteúdo.' : 'O que está acontecendo na equipe?'}</h2></div><button type="button" onClick={fecharEditor} className="editor-close">×</button></div><input className="editor-title" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} maxLength={120} placeholder="Título da publicação" required /><textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} maxLength={5000} placeholder="Escreva sua atualização..." required /><div className="editor-bottom"><span>{form.texto.length}/5000 caracteres</span><div><button type="button" className="editor-cancel" onClick={fecharEditor}>Cancelar</button><button className="editor-save" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Publicar'}</button></div></div></form>}
    <div className="blog-list">{loading ? <div className="blog-empty"><span className="loader"/>Carregando publicações...</div> : filtradas.length === 0 ? <div className="blog-empty"><strong>{busca ? 'Nada encontrado.' : 'A Bancada ainda está vazia.'}</strong><span>{busca ? 'Tente outra palavra-chave.' : 'Crie a primeira publicação para começar.'}</span></div> : filtradas.map((msg, index) => <article className="post-card" key={msg.id}><div className="post-number">{String(index + 1).padStart(2,'0')}</div><div className="post-main"><div className="post-meta"><span>{msg.dataHora}</span><span>por {msg.autorNome || 'Equipe'}</span></div><h2>{msg.titulo}</h2><p>{msg.texto}</p><div className="post-actions">{Number(msg.autorId) === Number(usuario.id) && <><button onClick={() => abrirEdicao(msg)}>Editar</button><button className="delete" onClick={() => apagar(msg.id)}>Excluir</button></>}</div></div></article>)}</div>
  </div></section>;
}
export default Blog;
