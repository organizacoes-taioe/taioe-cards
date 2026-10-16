#!/usr/bin/env node
/* ordenar.js — a ordem de partida da lista do francês (PLANO.md, 7.9).

   node fonte/frequencia/ordenar.js [--max=5600]

   Lê os originais em fonte/frequencia/brutos/ (fora do git; ver o README da pasta):
     flelex/FleLex_TT.csv   FLELex (UCLouvain): frequência de cada lema nos livros didáticos
                            de francês para estrangeiros, por nível do QECR;
     lexique/Lexique4.1.tsv Lexique 4: frequência nas legendas (316 milhões de palavras).
   Grava fonte/frequencia/candidatos-fr.tsv: as palavras de conteúdo (substantivo, verbo,
   adjetivo, advérbio, numeral, interjeição) e toda palavra que já tem card, na ordem
   proposta. É o ponto de partida; a lista que vale é fonte/frequencia/fr.tsv, com a limpeza,
   o ajuste à mão e as traduções.

   A ordem: cada lema ganha duas posições — no FLELex (primeiro nível com pelo menos
   1 ocorrência por milhão, depois a frequência total) e no Lexique (frequência do lema) —
   e a lista sai pela média das duas. Ausente numa das fontes, vale a posição da outra com
   25% a mais. Os cards que não são um lema das fontes entram assim:
     — o pronominal («se lever») na posição do verbo;
     — a forma que não é lema («vacances», «lunettes») pela frequência da própria forma;
     — a expressão («salle de bains») na posição da sua palavra mais rara. */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const BRUTOS = path.join(__dirname, 'brutos');
const MAX = Number((process.argv.find(a => a.startsWith('--max=')) || '--max=5600').split('=')[1]);
const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LIMIAR_DO_NIVEL = 1;          // ocorrências por milhão, para contar a entrada no nível
const PENALIDADE = 1.25;            // ausente numa das fontes

const CLASSE = { NOM: 'substantivo', VER: 'verbo', AUX: 'verbo', ADJ: 'adjetivo', ADV: 'advérbio',
  INT: 'interjeição', ONO: 'interjeição', KON: 'conjunção', CON: 'conjunção', PRP: 'preposição',
  PRE: 'preposição', PRO: 'pronome', DET: 'determinante', ART: 'determinante' };
const DE_CONTEUDO = new Set(['substantivo', 'verbo', 'adjetivo', 'advérbio', 'numeral', 'interjeição']);
function classeDe(tag) {
  tag = String(tag || '');
  if (/^ADJ:num|^NUM/.test(tag)) return 'numeral';
  if (/^ADJ:(pos|dem|int|ind)/.test(tag)) return 'determinante';
  return CLASSE[tag.split(':')[0]] || null;
}
// o Lexique escreve «oe»; os cards, «œ»
const chave = s => String(s || '').trim().toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/’/g, "'");

function lerTsv(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/).filter(Boolean);
  const cab = linhas[0].split('\t');
  return linhas.slice(1).map(l => {
    const c = l.split('\t'), o = {};
    cab.forEach((k, i) => { o[k] = c[i]; });
    return o;
  });
}

/* ── FLELex ── */
const fle = new Map();      // lema → { classe, nivel, total }
for (const r of lerTsv(path.join(BRUTOS, 'flelex', 'FleLex_TT.csv'))) {
  const lema = chave(r.word);
  const classe = classeDe(r.tag);
  if (!lema || !classe || /[0-9_]/.test(lema)) continue;
  const freqs = NIVEIS.map(n => Number(r['freq_' + n]) || 0);
  const i = freqs.findIndex(f => f >= LIMIAR_DO_NIVEL);
  const item = { classe, nivel: i < 0 ? null : NIVEIS[i], total: Number(r.freq_total) || 0 };
  const ja = fle.get(lema);
  if (!ja || item.total > ja.total) fle.set(lema, item);
}

/* ── Lexique 4: por lema (a classe mais frequente) e por forma ── */
const lexClasses = new Map();   // lema → { classe → freq }
const formas = new Map();       // forma → maior frequência da forma
for (const r of lerTsv(path.join(BRUTOS, 'lexique', 'Lexique4.1.tsv'))) {
  const lema = chave(r['4_Lemme']);
  const classe = classeDe(r['5_Cgram']);
  const forma = chave(r['1_Mot']);
  if (forma) formas.set(forma, Math.max(formas.get(forma) || 0, Number(r['10_FreqMot']) || 0));
  if (!lema || !classe || /[0-9_]/.test(lema)) continue;
  if (!lexClasses.has(lema)) lexClasses.set(lema, {});
  const cl = lexClasses.get(lema);
  cl[classe] = Math.max(cl[classe] || 0, Number(r['12_FreqLemme']) || 0);
}
const lex = new Map();          // lema → { classe, freq }
for (const [lema, cl] of lexClasses) {
  let melhor = null;
  for (const [classe, freq] of Object.entries(cl)) if (!melhor || freq > melhor.freq) melhor = { classe, freq };
  lex.set(lema, melhor);
}

/* ── as duas posições e a média ── */
function posicoes(entradas, cmp) {
  const ordem = entradas.slice().sort((a, b) => cmp(a[1], b[1]) || a[0].localeCompare(b[0], 'fr'));
  const pos = new Map();
  ordem.forEach(([lema], i) => pos.set(lema, i + 1));
  return pos;
}
const nivelIdx = n => (n ? NIVEIS.indexOf(n) : 9);
const posFle = posicoes([...fle.entries()], (a, b) => nivelIdx(a.nivel) - nivelIdx(b.nivel) || b.total - a.total);
const posLex = posicoes([...lex.entries()], (a, b) => b.freq - a.freq);
// posição no Lexique de uma frequência qualquer (para as formas que não são lema)
const freqsLex = [...lex.values()].map(x => x.freq).sort((a, b) => b - a);
function posLexDaFreq(f) {
  let lo = 0, hi = freqsLex.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (freqsLex[m] > f) lo = m + 1; else hi = m; }
  return lo + 1;
}
const media = (pf, pl) => (pf && pl) ? (pf + pl) / 2 : (pf || pl) * PENALIDADE;

const todos = new Map();        // lema → entrada
for (const lema of new Set([...fle.keys(), ...lex.keys()])) {
  const f = fle.get(lema), l = lex.get(lema);
  if (!f && !(l && l.freq >= 1)) continue;          // fora do FLELex, só o que é comum nas legendas
  const pf = posFle.get(lema), pl = l ? posLex.get(lema) : null;
  todos.set(lema, { lema, classe: (l && l.classe) || f.classe, nivelFle: (f && f.nivel) || '',
                    freq: l ? l.freq : 0, pf, pl, posicao: media(pf, pl), cards: [] });
}

/* ── os cards que já existem ── */
const ARTIGO = /^(le|la|les|un|une|des)\s+|^l['’]\s*/i;
const formaBase = s => chave(String(s || '').replace(/\s*\(.*?\)\s*/g, ' ')).replace(ARTIGO, '').trim();
const VAZIAS = new Set(['de', 'du', 'des', 'la', 'le', 'les', "l'", 'à', 'au', 'aux', 'en', 'et', 'd']);
const cards = [];
const pasta = path.join(RAIZ, 'fonte', 'cards', 'fr');
for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8'));
  (Array.isArray(j) ? j : j.cards || []).filter(c => c.tipo === 'palavra').forEach(c => cards.push(c));
}
const comoEntrou = {};
for (const c of cards) {
  const b = formaBase(c.fr);
  let e = todos.get(b), modo = 'lema';
  if (!e && /^(se |s')/.test(b)) { e = todos.get(b.replace(/^(se |s')/, '')); modo = 'pronominal'; }
  if (!e && !/\s/.test(b) && formas.get(b)) {
    const pl = posLexDaFreq(formas.get(b));
    e = { lema: b, classe: 'substantivo', nivelFle: '', freq: formas.get(b), pf: null, pl,
          posicao: pl * PENALIDADE, cards: [] };
    todos.set(b, e); modo = 'forma';
  }
  if (!e && /[\s-]/.test(b)) {
    const partes = b.split(/[\s-]+|(?<=')/).map(p => p.replace(/'$/, '')).filter(p => p && !VAZIAS.has(p));
    const pos = partes.map(p => todos.get(p)).filter(Boolean).map(x => x.posicao);
    if (pos.length) {
      e = { lema: b, classe: 'expressão', nivelFle: '', freq: 0, pf: null, pl: null,
            posicao: Math.max(...pos) + 0.5, cards: [] };
      todos.set(b, e); modo = 'expressão';
    }
  }
  if (!e) { comoEntrou[c.id] = 'SEM POSIÇÃO: ' + c.fr; continue; }
  if (e.lema !== b && modo === 'pronominal') {
    // o pronominal é uma entrada própria, logo depois do verbo
    const p = { lema: b, classe: 'verbo', nivelFle: e.nivelFle, freq: e.freq, pf: e.pf, pl: e.pl,
                posicao: e.posicao + 0.5, cards: [] };
    todos.set(b, p); e = p;
  }
  e.cards.push(c.id);
  if (modo !== 'lema') comoEntrou[c.id] = modo + ': ' + c.fr;
}

const lista = [...todos.values()]
  .filter(x => x.cards.length || DE_CONTEUDO.has(x.classe))
  .sort((a, b) => a.posicao - b.posicao || (a.pl || 1e9) - (b.pl || 1e9));
const corte = lista.slice(0, MAX);
for (const x of lista.slice(MAX)) if (x.cards.length) corte.push(x);   // a lista tem todas as com card

const NIVEL_DA_POSICAO = [[700, 'A1'], [1500, 'A2'], [2500, 'B1'], [3750, 'B2'], [5000, 'C1'], [Infinity, 'C2']];
const nivelDa = p => NIVEL_DA_POSICAO.find(([ate]) => p <= ate)[1];

const saida = ['pos\tlema\tclasse\tnivel\tnivel_flelex\tfreq_lexique\tcards'];
corte.forEach((x, i) => saida.push([i + 1, x.lema.replace(/oe/g, m => m), x.classe, nivelDa(i + 1), x.nivelFle,
  x.freq.toFixed(2), x.cards.join(',')].join('\t')));
fs.writeFileSync(path.join(__dirname, 'candidatos-fr.tsv'), saida.join('\n') + '\n');

const comCard = corte.filter(x => x.cards.length);
console.log(`  ${corte.length} palavras na lista; ${comCard.length} com card (${cards.length} cards de palavra)`);
for (const [id, como] of Object.entries(comoEntrou)) console.log('   ', id, como);
console.log('  as cinco com card mais para o fim: ' +
  comCard.slice(-5).map(x => `${x.lema} (${corte.indexOf(x) + 1})`).join(', '));
