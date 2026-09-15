import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './style.css';
import nandamcdonaldsImg from '../../assets/nandamcdonalds.png';
import saramcdonaldsImg from '../../assets/saramcdonalds.png';
import victormcdonaldsImg from '../../assets/victormcdonalds.png';

function Header({ usuario, onLogout, tema, onToggleTheme }) {
  const navigate = useNavigate();
  const imagemUsuario = {
    'Victor Sobral de Moraes': victormcdonaldsImg,
    'Sara Melo': saramcdonaldsImg,
    'Fernanda Dantas Moreira Cruz': nandamcdonaldsImg,
  };
  const foto = usuario ? imagemUsuario[usuario.nome] : null;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="Bancada MequiDonalds - início">
          <span className="brand-mark">M</span>
          <span><strong>Bancada</strong><small>MequiDonalds</small></span>
        </Link>

        <nav className="nav-menu" aria-label="Navegação principal">
          <NavLink to="/" end className="nav-link">Home</NavLink>
          {usuario && <NavLink to="/bancada" className="nav-link">Bancada</NavLink>}
          {usuario && <NavLink to="/midia" className="nav-link">Jogos &amp; Vídeos</NavLink>}
          <NavLink to="/sobre-nos" className="nav-link">Sobre nós</NavLink>
        </nav>

        <div className="header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Ativar modo ${tema === 'light' ? 'escuro' : 'claro'}`}
            title={`Modo ${tema === 'light' ? 'escuro' : 'claro'}`}
          >
            <span aria-hidden="true">{tema === 'light' ? '☾' : '☼'}</span>
          </button>
          {usuario ? (
            <>
              <button className="profile-chip" onClick={() => navigate('/bancada')}>
                {foto ? <img src={foto} alt="" /> : <span className="profile-fallback">{usuario.nome?.charAt(0)}</span>}
                <span>{usuario.nome?.split(' ')[0]}</span>
              </button>
              <button className="logout-btn" onClick={onLogout}>Sair</button>
            </>
          ) : (
            <Link to="/login" className="header-login">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
