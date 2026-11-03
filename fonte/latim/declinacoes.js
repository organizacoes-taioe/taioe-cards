/* fonte/latim/declinacoes.js — os exemplos dos cards de declinação e de conjugação (pedido do
   Gere, 03/11/2026): as palavras do curso marcadas com o grupo («2ª declinação», «1ª
   conjugação»…), pelo enunciado do dicionário. Grava em fonte/cards/la/19-declinacoes-e-conjugacoes.json.
     node fonte/latim/declinacoes.js
   O build liga cada flexão dessas palavras ao conceito do grupo («grupoConceito»). */
'use strict';
const fs = require('fs');
const path = require('path');
const pasta = path.join(__dirname, '..', 'cards', 'la');
const ARQUIVO = path.join(pasta, '19-declinacoes-e-conjugacoes.json');

const FIM_DO_GRUPO = {
  '1ª declinação': 'o genitivo em -ae', '2ª declinação': 'o genitivo em -i', '3ª declinação': 'o genitivo em -is',
  '4ª declinação': 'o genitivo em -us', '5ª declinação': 'o genitivo em -ei',
  '1ª conjugação': 'o infinitivo em -are', '2ª conjugação': 'o presente em -eo e o infinitivo em -ere',
  '3ª conjugação': 'o presente em -o (ou -io) e o infinitivo em -ere', '4ª conjugação': 'o presente em -io e o infinitivo em -ire'
};

/* a palavra que serve de exemplo: nome ou verbo comum do grupo; nem o adjetivo (de duas
   declinações), nem o só de plural, nem o depoente, nem o irregular */
function doGrupo(c, grupo) {
  return c.tipo === 'palavra' && c.enunciado && (c.tags || []).includes(grupo) &&
    !(c.tags || []).some(t => /irregular|pronome|adjetivo|depoente/.test(t)) &&
    !/\bpl\.|\bsum\b|dep(oe|œ)nte|\(/.test(c.enunciado);
}

function main() {
  const todos = fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')));
  const cards = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  for (const g of cards) {
    const fixos = (g.exemplos || []).filter(e => !e.lema || e.fixo);
    const exemplos = fixos.map(e => Object.assign({}, e, { fixo: true }));
    const vistos = new Map(exemplos.map(e => [e.w, e]));
    for (const c of todos.filter(c => doGrupo(c, g.grupo))) {
      if (vistos.has(c.la)) { const e = vistos.get(c.la); if (!e.lema) e.lema = c.id; continue; }
      const e = { la: c.enunciado, w: c.la, lema: c.id, fonte: 'dicionário' };
      vistos.set(c.la, e);
      exemplos.push(e);
    }
    exemplos.forEach(e => {
      const duas = String(e.la).split(',').slice(0, 2).join(',').trim();
      e.exp = duas + ': ' + FIM_DO_GRUPO[g.grupo] + ', ' + g.grupo + '.';
      e.distratores = g.distratores.slice();
    });
    g.exemplos = exemplos;
  }
  fs.writeFileSync(ARQUIVO, '[\n' + cards.map(c => JSON.stringify(c, null, 1)).join(',\n') + '\n]\n');
  console.log(cards.map(g => g.grupo + ': ' + g.exemplos.length).join('; '));
}
module.exports = { doGrupo };
if (require.main === module) main();
