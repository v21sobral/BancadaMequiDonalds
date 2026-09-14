import './style.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div><strong>Bancada MequiDonalds</strong><span>Projeto acadêmico de tecnologia e inovação.</span></div>
        <span>© {new Date().getFullYear()} Bancada MequiDonalds. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
export default Footer;
