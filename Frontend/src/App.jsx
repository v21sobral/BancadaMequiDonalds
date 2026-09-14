import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import SobreNos from './pages/SobreNos';
import Code from './pages/Code';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Blog from './pages/Blog';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { api } from './services/api';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [usuario, setUsuario] = useState(() => {
    try {
      const u = localStorage.getItem('usuario');
      return u ? JSON.parse(u) : null;
    } catch {
      localStorage.removeItem('usuario');
      return null;
    }
  });
  const [restaurandoSessao, setRestaurandoSessao] = useState(Boolean(token));

  const handleLogin = (novoToken, novoUsuario) => {
    setToken(novoToken);
    setUsuario(novoUsuario);
    localStorage.setItem('token', novoToken);
    localStorage.setItem('usuario', JSON.stringify(novoUsuario));
  };

  const handleLogout = () => {
    setToken('');
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  useEffect(() => {
    if (!token) {
      setRestaurandoSessao(false);
      return;
    }

    api.me(token)
      .then(({ usuario: atual }) => {
        setUsuario(atual);
        localStorage.setItem('usuario', JSON.stringify(atual));
      })
      .catch(() => handleLogout())
      .finally(() => setRestaurandoSessao(false));
  }, []);

  if (restaurandoSessao) {
    return <div className="app-loading"><span />Restaurando sua sessão...</div>;
  }

  return (
    <Router>
      <Header usuario={usuario} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route path="/" element={<Home onLogin={handleLogin} usuario={usuario} />} />
          <Route path="/sobre-nos" element={<SobreNos />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/cadastro" element={<Cadastro onLogin={handleLogin} />} />
          <Route element={<ProtectedRoute usuario={usuario} />}>
            <Route path="/bancada" element={<Blog token={token} usuario={usuario} />} />
            <Route path="/code" element={<Code token={token} usuario={usuario} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
