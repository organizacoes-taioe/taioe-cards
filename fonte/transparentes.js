#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/transparentes.js — as palavras transparentes de um curso, card a
   card, para ler de olho (PLANO.md, 7.1; manual, seção 19).

   Uso:  node fonte/transparentes.js <curso>      (es-pt, pt-es, fr-en…)

   Lista os dois grupos — «total», que sai do jogo e conta como dominada, e
   «parecida», que estreia direto na volta — com id, a forma na língua
   ensinada → a do público, e as contagens. A regra é a do build
   (fonte/transparencia.js), lida direto da fonte: não precisa rodar o build
   antes, e o campo «transparencia» do card já vale aqui.

   O que procurar: o falso amigo sem etiqueta (igual na grafia, outro
   sentido), a palavra igual cujo sentido principal é outro, o gênero que a
   regra não viu. A correção vai no card:
     "transparencia": { "pt": "nenhuma" }      (ou "parecida", "total")
   Os marcados com «(campo)» são os que o campo decidiu; com «regra: …», o
   que a regra sozinha diria.
   ──────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');
const Transp = require('./transparencia');

const AUDIENCIAS = { es: ['pt', 'en'], en: ['pt', 'es'], pt: ['es', 'en'], fr: ['pt', 'es', 'en'] };

const curso = process.argv[2] || '';
const [ensinada, publico] = curso.split('-');
if (!AUDIENCIAS[ensinada] || !AUDIENCIAS[ensinada].includes(publico)) {
  const todos = Object.keys(AUDIENCIAS).flatMap(l => AUDIENCIAS[l].map(a => l + '-' + a));
  console.error('\n  uso: node fonte/transparentes.js <curso>\n  cursos: ' + todos.join(', ') + '\n');
  process.exit(1);
}

const pasta = path.join(__dirname, 'cards', ensinada);
let cards = [];
for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()) {
  cards = cards.concat(JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')));
}
const palavras = cards.filter(c => c.tipo === 'palavra');

const grupos = { total: [], parecida: [] };
for (const c of palavras) {
  const r = Transp.avaliar(c, ensinada, publico);
  if (r.grau) grupos[r.grau].push({ c, r });
}

const pct = n => palavras.length ? (100 * n / palavras.length).toFixed(1) + '%' : '—';
const linha = ({ c, r }) => {
  const marca = r.manual !== undefined
    ? '  (campo; regra: ' + (r.regra.grau || 'nenhuma') + ')'
    : '';
  return '  ' + c.id.padEnd(10) + ' ' + String(c[ensinada]) + '  →  ' + String(c[publico]) + marca;
};

console.log('\n  ' + curso + ': ' + palavras.length + ' palavras\n');
console.log('  TOTAL — ' + grupos.total.length + ' (' + pct(grupos.total.length) + '): fora do jogo, contam como dominadas\n');
grupos.total.forEach(x => console.log(linha(x)));
console.log('\n  PARECIDA — ' + grupos.parecida.length + ' (' + pct(grupos.parecida.length) + '): estreiam na volta\n');
grupos.parecida.forEach(x => console.log(linha(x)));

/* o que o campo tirou das duas listas: para não sumir da vista */
const desligadas = palavras.filter(c => {
  const r = Transp.avaliar(c, ensinada, publico);
  return r.manual === 'nenhuma' && r.regra.grau;
});
if (desligadas.length) {
  console.log('\n  DESLIGADAS PELO CAMPO — ' + desligadas.length + ' (a regra as diria transparentes)\n');
  desligadas.forEach(c => console.log('  ' + c.id.padEnd(10) + ' ' + c[ensinada] + '  →  ' + c[publico] +
    '  (regra: ' + Transp.pelaRegra(c, ensinada, publico).grau + ')'));
}
console.log('\n  ' + curso + ': ' + grupos.total.length + ' total, ' + grupos.parecida.length +
  ' parecida(s), de ' + palavras.length + ' palavras\n');
