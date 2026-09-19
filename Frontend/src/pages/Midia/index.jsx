import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiUrl } from '../../services/api';
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

// Link codificado gerado pelo backend (/p/<token>)
function proxyLink(item) {
  return item.proxy ? `${apiUrl}${item.proxy}` : '';
}

function shortLink(link) {
  return link.length > 48 ? `${link.slice(0, 34)}…${link.slice(-10)}` : link;
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
  const [usarProxy, setUsarProxy] = useState(true);
  const [copiado, setCopiado] = useState(null);

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
    // Sem proxy, jogos continuam abrindo em nova aba (muitos bloqueiam iframe)
    if (item.tipo === 'jogo' && !(usarProxy && item.proxy)) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setErroEmbed(false);
    setAtivo(item);
  };

  const copiar = async (item) => {
    try {
      await navigator.clipboard.writeText(proxyLink(item));
      setCopiado(item.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch { setErro('Não foi possível copiar o link.'); }
  };

  const viaProxy = Boolean(ativo && usarProxy && ativo.proxy);
  const src = useMemo(() => {
    if (!ativo) return null;
    return usarProxy && ativo.proxy ? proxyLink(ativo) : embedSrc(ativo);
  }, [ativo, usarProxy]);

  return <section className="midia-page page-shell"><div className="container">
    <div className="midia-hero">
      <div><span className="section-kicker">Área autenticada</span><h1 className="section-title">Jogos &amp; Vídeos</h1><p>Adicione links de jogos online e vídeos do YouTube. Cada link é salvo já codificado e pode ser aberto por aqui.</p></div>
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
          {ativo.proxy && <label className="midia-proxy-toggle">
            <input type="checkbox" checked={usarProxy} onChange={e => { setUsarProxy(e.target.checked); setErroEmbed(false); }} />
            Link codificado
          </label>}
          <a href={viaProxy ? proxyLink(ativo) : ativo.url} target="_blank" rel="noreferrer">Abrir em nova aba ↗</a>
          <button onClick={() => setAtivo(null)}>Fechar</button>
        </div>
      </div>
      {!erroEmbed ? (
        <iframe
          key={src}
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
          <a href={viaProxy ? proxyLink(ativo) : ativo.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>.
        </div>
      )}
      <p className="midia-player-hint">Nem todo site funciona pelo link codificado (páginas muito dinâmicas, como o player do YouTube, podem falhar). Se a tela mostrar erro, desmarque "Link codificado" ou use "Abrir em nova aba".</p>
    </div>}

    <div className="midia-grid">
      {loading ? <div className="midia-empty"><span className="loader" />Carregando...</div>
        : itens.length === 0 ? <div className="midia-empty"><strong>Nada por aqui ainda.</strong><span>Adicione o primeiro jogo ou vídeo.</span></div>
        : itens.map(item => (
          <article className={`midia-card ${item.tipo}`} key={item.id}>
            <button className="midia-card-main" onClick={() => abrir(item)}>
              <span className="midia-tag">{item.tipo === 'video' ? 'Vídeo' : 'Jogo ↗'}</span>
              <strong>{item.titulo}</strong>
              {item.proxy && <code className="midia-link" title={proxyLink(item)}>{shortLink(proxyLink(item))}</code>}
            </button>
            {item.proxy && <button className="midia-copy" onClick={() => copiar(item)}>{copiado === item.id ? 'Copiado!' : 'Copiar link'}</button>}
            {Number(item.autorId) === Number(usuario.id) && <button className="midia-delete" onClick={() => apagar(item.id)}>Excluir</button>}
          </article>
        ))}
    </div>
  </div></section>;
}
export default Midia;
