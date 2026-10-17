#!/usr/bin/env node
/* juntar.js — monta fonte/frequencia/<língua>.tsv a partir das partes curadas (PLANO.md, 7.9).

   node fonte/frequencia/juntar.js <fr|es|en|pt> <pasta-das-partes>

   Cada parte é um TSV com cabeçalho: pos, <língua>, classe, genero, as duas ou três línguas
   dos públicos (fr: pt, es, en; es: pt, en; en: pt, es; pt: es, en), excluir, mover — o trecho
   de candidatos-<língua>.tsv (de ordenar.js) com a forma de citação, a classe, o gênero, a
   tradução curta e a curadoria (fonte/frequencia/brutos/CURADORIA.md):
     — excluir: a linha sai (chulo, nome próprio, fragmento, forma flexionada, estrangeira,
       sigla, duplicata, gramatical), menos a que tem card, que sempre fica;
     — mover «cedo»: vocabulário básico de curso que a frequência pôs tarde demais
       (números, dias, meses, cores, família, corpo, comida, sala de aula) vai para o A1,
       na ordem em que estava, intercalado entre as posições 120 e 700;
     — mover «tarde»: vai para o fim da lista;
     — mover «A2» … «C2»: vai para dentro da faixa desse nível, intercalada, na ordem em que estava.
   A duplicata pela forma fica só na primeira posição (com os cards das duas).
   O nível sai da posição (NIVEL_DA_POSICAO). */
'use strict';
const fs = require('fs');
const path = require('path');

const LINGUA = process.argv[2], pasta = process.argv[3];
const PUBLICOS = { fr: ['pt', 'es', 'en'], es: ['pt', 'en'], en: ['pt', 'es'], pt: ['es', 'en'] }[LINGUA];
if (!PUBLICOS || !pasta) { console.error('uso: node fonte/frequencia/juntar.js <fr|es|en|pt> <pasta-das-partes>'); process.exit(1); }
const AQUI = __dirname;
const NIVEL_DA_POSICAO = [[700, 'A1'], [1500, 'A2'], [2500, 'B1'], [3750, 'B2'], [5000, 'C1'], [Infinity, 'C2']];
const nivelDa = p => NIVEL_DA_POSICAO.find(([ate]) => p <= ate)[1];
const FAIXA = { A2: [700, 1500], B1: [1500, 2500], B2: [2500, 3750], C1: [3750, 5000], C2: [5000, 5600] };

// os cards de cada posição de partida, de candidatos-<língua>.tsv
const cardsDaPos = new Map();
for (const l of fs.readFileSync(path.join(AQUI, 'candidatos-' + LINGUA + '.tsv'), 'utf8').trim().split('\n').slice(1)) {
  const c = l.split('\t');
  cardsDaPos.set(Number(c[0]), c[6] ? c[6].split(',') : []);
}

const linhas = [];
const problemas = [];
for (const f of fs.readdirSync(pasta).filter(f => /^parte.*\.tsv$|^\d.*\.tsv$/.test(f)).sort()) {
  const ls = fs.readFileSync(path.join(pasta, f), 'utf8').replace(/^﻿/, '').replace(/\r/g, '').split('\n').filter(Boolean);
  const cab = ls[0].split('\t').map(s => s.trim());
  const col = k => cab.indexOf(k);
  const faltam = ['pos', LINGUA, 'classe', 'genero', ...PUBLICOS, 'excluir', 'mover'].filter(k => col(k) < 0);
  if (faltam.length) { problemas.push(`${f}: cabeçalho sem ${faltam.join(', ')}`); continue; }
  ls.slice(1).forEach((l, i) => {
    const c = l.split('\t').map(x => (x || '').trim());
    const v = k => c[col(k)] || '';
    const p = Number(v('pos'));
    if (!p || !v(LINGUA)) { problemas.push(`${f}:${i + 2} linha sem pos ou ${LINGUA}`); return; }
    const cards = cardsDaPos.get(p) || [];
    const trad = {};
    PUBLICOS.forEach(k => { trad[k] = v(k); });
    if ((!v('excluir') || cards.length) && PUBLICOS.some(k => !trad[k])) problemas.push(`${f}: ${p} ${v(LINGUA)} sem tradução`);
    linhas.push({ p, forma: v(LINGUA), classe: v('classe'), genero: v('genero'), trad,
                  excluir: v('excluir'), mover: v('mover'), cards });
  });
}
const vistasPos = new Set(linhas.map(x => x.p));
const semParte = [...cardsDaPos.keys()].filter(p => !vistasPos.has(p));
if (semParte.length) problemas.push(`${semParte.length} posições de candidatos sem linha nas partes (a primeira: ${semParte[0]})`);

const chave = s => s.toLowerCase().normalize('NFC').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const vistas = new Map();
const ficam = [];
const motivos = {};
for (const x of linhas.sort((a, b) => a.p - b.p)) {
  if (x.excluir && !x.cards.length) { const m = x.excluir.split(/[ (:]/)[0]; motivos[m] = (motivos[m] || 0) + 1; continue; }
  const k = chave(x.forma);
  if (vistas.has(k)) {
    const ja = vistas.get(k);
    ja.cards = [...new Set(ja.cards.concat(x.cards))];
    motivos['duplicata pela forma'] = (motivos['duplicata pela forma'] || 0) + 1;
    continue;
  }
  vistas.set(k, x);
  ficam.push(x);
}

// a ordem: «cedo» para o A1, «A2»…«C2» para a faixa do nível, «tarde» para o fim
const cedo = ficam.filter(x => /^cedo/i.test(x.mover) && x.p > 120);
cedo.forEach((x, i) => { x.chave = Math.min(x.p, 120 + (i + 0.5) * (580 / Math.max(1, cedo.length))); });
for (const [nivel, [de, ate]] of Object.entries(FAIXA)) {
  const grupo = ficam.filter(x => x.mover.toUpperCase() === nivel);
  grupo.forEach((x, i) => { x.chave = de + (i + 0.5) * ((ate - de) / grupo.length); });
}
ficam.forEach(x => {
  if (x.chave === undefined) x.chave = /^tarde/i.test(x.mover) ? x.p + 1e6 : x.p;
});
ficam.sort((a, b) => a.chave - b.chave || a.p - b.p);

const saida = [['pos', LINGUA, 'classe', 'genero', 'nivel', ...PUBLICOS, 'cards'].join('\t')];
ficam.forEach((x, i) => saida.push([i + 1, x.forma, x.classe, x.genero, nivelDa(i + 1), ...PUBLICOS.map(k => x.trad[k]),
  x.cards.join(',')].join('\t')));
fs.writeFileSync(path.join(AQUI, LINGUA + '.tsv'), saida.join('\n') + '\n');

const comCard = ficam.filter(x => x.cards.length);
const idsComCard = new Set(comCard.flatMap(x => x.cards));
console.log(`  ${linhas.length} linhas curadas → ${ficam.length} na lista; ${idsComCard.size} cards de palavra ligados`);
console.log('  saíram: ' + Object.entries(motivos).map(([k, n]) => `${k} ${n}`).join(' · '));
const movidas = {};
ficam.forEach(x => { if (x.mover) { const m = x.mover.toLowerCase(); movidas[m] = (movidas[m] || 0) + 1; } });
console.log('  movidas: ' + Object.entries(movidas).map(([k, n]) => `${k} ${n}`).join(' · '));
if (problemas.length) console.log('  PROBLEMAS (' + problemas.length + '):\n    ' + problemas.slice(0, 40).join('\n    '));
