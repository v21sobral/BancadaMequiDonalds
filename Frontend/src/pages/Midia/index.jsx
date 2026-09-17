import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import './style.css';

const emptyForm = { titulo: '', tipo: 'video', url: '' };

function getYoutubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    let videoId = '';
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v');
      else if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/embed/')[1];
      else if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/shorts/')[1];
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId.split('&')[0].split('?')[0]}`;
  } catch { return null; }
}

function embedSrc(item) {
  if (item.tipo === 'video') return getYoutubeEmbedUrl(item.url) || item.url;
  return item.url;
}

function Midia({ token, usuario }) {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ativo, setAtivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [erroEmbed, setErroEmbed] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    try { setItens(await api.listarMidias()); }
    catch (error) { setErro(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (event) => {
    event.preventDefault(); setSaving(true); setErro('');
    try {
      await api.criarMidia(token, form);
      setForm(emptyForm); setMostrarForm(false);
      await carregar();
    } catch (error) {
      setErro(error.message);
      if (error.status === 401) localStorage.removeItem('token');
    } finally { setSaving(false); }
  };

  const apagar = async (id) => {
    if (!window.confirm('Remover este item?')) return;
    try {
      await api.apagarMidia(token, id);
      if (ativo?.id === id) setAtivo(null);
      await carregar();
    } catch (error) { setErro(error.message); }
  };

  const abrir = (item) => {
    if (item.tipo === 'jogo') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setErroEmbed(false);
    setAtivo(item);
  };

  const src = useMemo(() => (ativo ? embedSrc(ativo) : null), [ativo]);

  return <section className="midia-page page-shell"><div className="container">
    <div className="midia-hero">
      <div><span className="section-kicker">Área autenticada</span><h1 className="section-title">Jogos &amp; Vídeos</h1><p>Adicione links de jogos online e vídeos do YouTube para assistir direto por aqui.</p></div>
      <button className="midia-new" onClick={() => setMostrarForm(v => !v)}>{mostrarForm ? 'Cancelar' : '+ Adicionar'}</button>
    </div>

    {erro && <div className="midia-alert" role="alert">{erro}</div>}

    {mostrarForm && <form className="midia-form" onSubmit={salvar}>
      <input placeholder="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} maxLength={150} required />
      <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
        <option value="video">Vídeo (YouTube)</option>
        <option value="jogo">Jogo online</option>
      </select>
      <input placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required />
      <button disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
    </form>}

    {ativo && <div className="midia-player">
      <div className="midia-player-head">
        <strong>{ativo.titulo}</strong>
        <div className="midia-player-head-actions">
          <a href={ativo.url} target="_blank" rel="noreferrer">Abrir em nova aba ↗</a>
          <button onClick={() => setAtivo(null)}>Fechar</button>
        </div>
      </div>
      {!erroEmbed ? (
        <iframe
          src={src}
          title={ativo.titulo}
          referrerPolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onError={() => setErroEmbed(true)}
        />
      ) : (
        <div className="midia-player-fallback">
          Este conteúdo não permite ser exibido dentro do site.{' '}
          <a href={ativo.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>.
        </div>
      )}
      <p className="midia-player-hint">Alguns jogos e vídeos bloqueiam a exibição dentro de outros sites. Se a tela acima mostrar um erro, use "Abrir em nova aba".</p>
    </div>}

    <div className="midia-grid">
      {loading ? <div className="midia-empty"><span className="loader" />Carregando...</div>
        : itens.length === 0 ? <div className="midia-empty"><strong>Nada por aqui ainda.</strong><span>Adicione o primeiro jogo ou vídeo.</span></div>
        : itens.map(item => (
          <article className={`midia-card ${item.tipo}`} key={item.id}>
            <button className="midia-card-main" onClick={() => abrir(item)}>
              <span className="midia-tag">{item.tipo === 'video' ? 'Vídeo' : 'Jogo ↗'}</span>
              <strong>{item.titulo}</strong>
            </button>
            {Number(item.autorId) === Number(usuario.id) && <button className="midia-delete" onClick={() => apagar(item.id)}>Excluir</button>}
          </article>
        ))}
    </div>
  </div></section>;
}
export default Midia;