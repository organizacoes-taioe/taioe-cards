#!/usr/bin/env node
/* juntar.js — monta fonte/frequencia/fr.tsv a partir das partes curadas (PLANO.md, 7.9).

   node fonte/frequencia/juntar.js <pasta-das-partes>

   Cada parte é um TSV com: pos, fr, classe, genero, pt, es, en, excluir, mover — o trecho
   de candidatos-fr.tsv (de ordenar.js) com a forma de citação, a classe, o gênero, a
   tradução curta nas três línguas e a curadoria:
     — excluir: a linha sai (chulo, nome próprio, fragmento, forma flexionada, estrangeira,
       sigla, duplicata, gramatical), menos a que tem card, que sempre fica;
     — mover «cedo»: vocabulário básico de curso que a frequência pôs tarde demais
       (números, dias, meses, cores, família, corpo, comida, sala de aula) vai para o A1,
       na ordem em que estava, intercalado entre as posições 120 e 700;
     — mover «tarde»: vai para o fim da lista.
   A duplicata pela forma em francês fica só na primeira posição (com os cards das duas).
   O nível sai da posição (NIVEL_DA_POSICAO). */
'use strict';
const fs = require('fs');
const path = require('path');

const pasta = process.argv[2];
if (!pasta) { console.error('uso: node fonte/frequencia/juntar.js <pasta-das-partes>'); process.exit(1); }
const AQUI = __dirname;
const NIVEL_DA_POSICAO = [[700, 'A1'], [1500, 'A2'], [2500, 'B1'], [3750, 'B2'], [5000, 'C1'], [Infinity, 'C2']];
const nivelDa = p => NIVEL_DA_POSICAO.find(([ate]) => p <= ate)[1];

// os cards de cada posição de partida, de candidatos-fr.tsv
const cardsDaPos = new Map();
for (const l of fs.readFileSync(path.join(AQUI, 'candidatos-fr.tsv'), 'utf8').trim().split('\n').slice(1)) {
  const c = l.split('\t');
  cardsDaPos.set(Number(c[0]), c[6] ? c[6].split(',') : []);
}

const linhas = [];
const problemas = [];
for (const f of fs.readdirSync(pasta).filter(f => /\.tsv$/.test(f)).sort()) {
  const ls = fs.readFileSync(path.join(pasta, f), 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  ls.slice(1).forEach((l, i) => {
    const c = l.split('\t');
    while (c.length < 9) c.push('');
    const [pos, fr, classe, genero, pt, es, en, excluir, mover] = c.map(x => (x || '').trim());
    const p = Number(pos);
    if (!p || !fr) { problemas.push(`${f}:${i + 2} linha sem pos ou fr`); return; }
    const cards = cardsDaPos.get(p) || [];
    if (!excluir && !(pt && es && en)) problemas.push(`${f}: ${p} ${fr} sem tradução`);
    linhas.push({ p, fr, classe, genero, pt, es, en, excluir, mover, cards });
  });
}

const chave = s => s.toLowerCase().normalize('NFC').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const vistas = new Map();
const ficam = [];
const motivos = {};
for (const x of linhas.sort((a, b) => a.p - b.p)) {
  if (x.excluir && !x.cards.length) { motivos[x.excluir.split(/[ (:]/)[0]] = (motivos[x.excluir.split(/[ (:]/)[0]] || 0) + 1; continue; }
  const k = chave(x.fr);
  if (vistas.has(k)) {
    const ja = vistas.get(k);
    ja.cards = [...new Set(ja.cards.concat(x.cards))];
    motivos['duplicata pela forma'] = (motivos['duplicata pela forma'] || 0) + 1;
    continue;
  }
  vistas.set(k, x);
  ficam.push(x);
}

// a ordem: «cedo» para o A1, «tarde» para o fim
const cedo = ficam.filter(x => /^cedo/i.test(x.mover) && x.p > 120);
cedo.forEach((x, i) => { x.chave = Math.min(x.p, 120 + (i + 0.5) * (580 / Math.max(1, cedo.length))); });
ficam.forEach(x => {
  if (x.chave === undefined) x.chave = /^tarde/i.test(x.mover) ? x.p + 1e6 : x.p;
});
ficam.sort((a, b) => a.chave - b.chave || a.p - b.p);

const saida = ['pos\tfr\tclasse\tgenero\tnivel\tpt\tes\ten\tcards'];
ficam.forEach((x, i) => saida.push([i + 1, x.fr, x.classe, x.genero, nivelDa(i + 1), x.pt, x.es, x.en, x.cards.join(',')].join('\t')));
fs.writeFileSync(path.join(AQUI, 'fr.tsv'), saida.join('\n') + '\n');

const comCard = ficam.filter(x => x.cards.length);
const idsComCard = new Set(comCard.flatMap(x => x.cards));
console.log(`  ${linhas.length} linhas curadas → ${ficam.length} na lista; ${idsComCard.size} cards de palavra ligados`);
console.log('  saíram: ' + Object.entries(motivos).map(([k, n]) => `${k} ${n}`).join(' · '));
console.log(`  movidas: ${cedo.length} para o A1, ${ficam.filter(x => /^tarde/i.test(x.mover)).length} para o fim`);
if (problemas.length) console.log('  PROBLEMAS:\n    ' + problemas.slice(0, 40).join('\n    '));
