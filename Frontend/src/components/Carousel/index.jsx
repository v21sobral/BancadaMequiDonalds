import React from 'react';
import './Carousel.css';

const highlights = [
  { number: '01', title: 'Código em evolução', text: 'Novas telas, ajustes de interface e melhorias de arquitetura fazem parte da rotina da equipe.' },
  { number: '02', title: 'Aprendizado prático', text: 'Cada funcionalidade vira uma oportunidade para testar, corrigir e entender melhor a tecnologia.' },
  { number: '03', title: 'Trabalho em equipe', text: 'Ideias diferentes se encontram no mesmo projeto para construir uma entrega mais completa.' },
  { number: '04', title: 'Próximos passos', text: 'A estrutura está preparada para receber novos recursos, integrações e conteúdo.' },
];

function Carousel() {
  return <div className="highlight-grid">{highlights.map(item => <article className="highlight-card" key={item.number}><span>{item.number}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b>→</b></article>)}</div>;
}
export default Carousel;
