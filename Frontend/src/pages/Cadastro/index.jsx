import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import '../login.css';

function Cadastro({ onLogin }) {
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [senha, setSenha] = useState(''); const [confirmacao, setConfirmacao] = useState(''); const [erro, setErro] = useState(''); const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault(); setErro('');
    if (senha !== confirmacao) return setErro('As senhas não coincidem.');
    setLoading(true);
    try { await api.cadastrar(nome, email, senha); const data = await api.login(email, senha); onLogin(data.token, data.usuario); navigate('/bancada', { replace: true }); }
    catch (error) { setErro(error.message); } finally { setLoading(false); }
  };
  return <section className="auth-page"><div className="auth-card"><div className="auth-intro"><span className="auth-kicker">Novo acesso</span><h1>Crie sua conta.</h1><p>Cadastre-se para participar da Bancada e publicar conteúdos para a equipe.</p></div><form onSubmit={handleSubmit} className="auth-form"><label>Nome<input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" autoComplete="name" required /></label><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required /></label><label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo de 6 caracteres" minLength={6} autoComplete="new-password" required /></label><label>Confirmar senha<input type="password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} placeholder="Repita sua senha" minLength={6} autoComplete="new-password" required /></label>{erro && <div className="auth-error" role="alert">{erro}</div>}<button className="auth-submit" disabled={loading}>{loading ? 'Criando conta...' : 'Criar conta'}</button></form><p className="auth-footer">Já possui acesso? <Link to="/login">Entrar</Link></p></div></section>;
}
export default Cadastro;
