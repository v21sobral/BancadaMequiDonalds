import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (location.state?.from) window.history.replaceState({}, document.title); }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      const data = await api.login(email, senha);
      onLogin(data.token, data.usuario);
      navigate('/bancada', { replace: true });
    } catch (error) {
      setErro(error.message);
    } finally { setLoading(false); }
  };

  return (
    <section className="auth-page">
      <div className="auth-decoration"><span /><span /><span /></div>
      <div className="auth-card">
        <div className="auth-intro"><span className="auth-kicker">Área da equipe</span><h1>Bem-vindo de volta.</h1><p>Entre para acessar a Bancada, publicar atualizações e acompanhar as novidades do projeto.</p></div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required /></label>
          <label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" autoComplete="current-password" minLength={6} required /></label>
          {erro && <div className="auth-error" role="alert">{erro}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar na Bancada'}</button>
        </form>
        <p className="auth-footer">Ainda não possui acesso? <Link to="/cadastro">Criar conta</Link></p>
      </div>
    </section>
  );
}
export default Login;
