import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import mcGif from '../../assets/mc.gif';
import nandamcdonaldsImg from '../../assets/nandamcdonalds.png';
import saramcdonaldsImg from '../../assets/saramcdonalds.png';
import victormcdonaldsImg from '../../assets/victormcdonalds.png';
import alessandrafinalImg from '../../assets/alessandrafinal.jpg';
import Carousel from '../../components/Carousel';
import Login from '../Login';
import '../login-modal.css';

function Home({ onLogin, usuario }) {
  const [showLogin, setShowLogin] = useState(false);
  const team = [
    { name: 'Fernanda Dantas', role: 'Desenvolvimento', img: nandamcdonaldsImg, github: 'https://github.com/fernanddadantasm' },
    { name: 'Alessandra', role: 'Equipe SENAI', img: alessandrafinalImg, github: '#' },
    { name: 'Sara Melo', role: 'Desenvolvimento', img: saramcdonaldsImg, github: 'https://github.com/sahmlo' },
    { name: 'Victor Sobral', role: 'Desenvolvimento', img: victormcdonaldsImg, github: 'https://github.com/v21sobral' },
  ];

  return (
    <div className="home-page">
      <section className="hero container">
        <div className="hero-copy">
          <span className="hero-kicker">Bancada MequiDonalds</span>
          <h1>Ideias, código e aprendizado em um só lugar.</h1>
          <p>Um espaço criado para apresentar o projeto, compartilhar atualizações e manter a equipe conectada durante a jornada de desenvolvimento.</p>
          <div className="hero-actions">
            {usuario ? <Link to="/bancada" className="btn-primary">Acessar a Bancada</Link> : <button className="btn-primary" onClick={() => setShowLogin(true)}>Entrar na Bancada</button>}
            <Link to="/sobre-nos" className="btn-secondary">Conhecer o projeto</Link>
          </div>
          <div className="hero-stats"><div><strong>01</strong><span>projeto em evolução</span></div><div><strong>24/7</strong><span>ideias e colaboração</span></div><div><strong>100%</strong><span>foco em aprendizado</span></div></div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-sign" aria-label="Placa da Bancada MequiDonalds">
            <img src={mcGif} alt="Placa da Bancada MequiDonalds" />
          </div>
          <div className="hero-image-card hero-team-collage">
            <span className="collage-note">Funcionários da Mequi</span>
            {team.map((member, index) => (
              <figure className={`team-polaroid team-polaroid-${index + 1}`} key={member.name}>
                <img src={member.img} alt={`Foto de ${member.name}`} />
                <figcaption>{member.name.split(' ')[0]}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-section container">
        <div className="section-heading"><span className="section-kicker">O que você encontra</span><h2 className="section-title">Uma bancada feita para acompanhar o projeto.</h2></div>
        <div className="feature-grid"><article><span>01</span><h3>Atualizações</h3><p>Publicações organizadas para registrar novidades, decisões e momentos importantes do desenvolvimento.</p></article><article><span>02</span><h3>Equipe</h3><p>Conheça quem participa do projeto e encontre os perfis profissionais dos integrantes.</p></article><article><span>03</span><h3>Acesso privado</h3><p>Depois do login, a área da Bancada fica disponível para leitura e publicação de conteúdo.</p></article></div>
      </section>

      <section className="updates-section"><div className="container"><div className="section-heading"><span className="section-kicker">Em destaque</span><h2 className="section-title">Um pouco do universo da equipe.</h2></div><Carousel /></div></section>

      <section className="team-section container"><div className="section-heading"><span className="section-kicker">Quem faz acontecer</span><h2 className="section-title">Nossa equipe.</h2></div><div className="team-grid">{team.map(member => <a key={member.name} href={member.github} target="_blank" rel="noreferrer" className="team-card"><img src={member.img} alt={member.name}/><div><strong>{member.name}</strong><span>{member.role}</span></div><b>↗</b></a>)}</div></section>

      {showLogin && <div className="login-modal-bg" onMouseDown={e => e.target === e.currentTarget && setShowLogin(false)}><div className="login-modal-box"><button className="login-modal-close" onClick={() => setShowLogin(false)} aria-label="Fechar">×</button><Login onLogin={(token, loggedUser) => { onLogin(token, loggedUser); setShowLogin(false); }} /></div></div>}
    </div>
  );
}
export default Home;
