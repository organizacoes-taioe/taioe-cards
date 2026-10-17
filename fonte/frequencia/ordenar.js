#!/usr/bin/env node
/* ordenar.js — a ordem de partida da lista de frequência de uma língua (PLANO.md, 7.9).

   node fonte/frequencia/ordenar.js <fr|es|en|pt> [--max=5600]

   Lê os originais em fonte/frequencia/brutos/ (fora do git; ver o README da pasta):
     fr  flelex/FleLex_TT.csv    FLELex (UCLouvain): frequência de cada lema nos livros
                                 didáticos de francês para estrangeiros, por nível do QECR;
         lexique/Lexique4.1.tsv  Lexique 4: frequência nas legendas (316 milhões de palavras);
     es  elelex/ELELex.tsv       ELELex (UCLouvain), o mesmo para o espanhol;
         legendas/es_full.txt    frequência das formas nas legendas (OpenSubtitles 2018,
                                 FrequencyWords; ou es.txt, as 50 mil primeiras), somada por
                                 lema com lemas/lemmatization-es.txt (lemmatization-lists);
     en  efllex/EFLLex.tsv       EFLLex (UCLouvain), o mesmo para o inglês;
         legendas/en_full.txt    idem, com lemas/lemmatization-en.txt;
     pt  legendas/pt_br_full.txt só as legendas (não há CEFRLex do português), com
                                 lemas/lemmatization-pt.txt; a classe vem da curadoria.
   Grava fonte/frequencia/candidatos-<língua>.tsv: as palavras de conteúdo (substantivo, verbo,
   adjetivo, advérbio, numeral, interjeição) e toda palavra que já tem card, na ordem
   proposta. É o ponto de partida; a lista que vale é fonte/frequencia/<língua>.tsv, com a
   limpeza, o ajuste à mão e as traduções.

   A ordem: cada lema ganha duas posições — na lista dos livros didáticos (primeiro nível com
   pelo menos 1 ocorrência por milhão, depois a frequência total) e nas legendas (frequência
   do lema) — e a lista sai pela média das duas. Ausente numa das fontes, vale a posição da
   outra com 25% a mais. Os cards que não são um lema das fontes entram assim:
     — o pronominal («se lever», «equivocarse») na posição do verbo;
     — a forma que não é lema («vacances», «lunettes») pela frequência da própria forma;
     — a expressão («salle de bains», «la goma de borrar») na posição da sua palavra mais rara. */
'use strict';
const fs = require('fs');
const path = require('path');

const LINGUA = process.argv[2];
if (!['fr', 'es', 'en', 'pt'].includes(LINGUA)) {
  console.error('uso: node fonte/frequencia/ordenar.js <fr|es|en|pt> [--max=5600]'); process.exit(1);
}
const RAIZ = path.join(__dirname, '..', '..');
const BRUTOS = path.join(__dirname, 'brutos');
const MAX = Number((process.argv.find(a => a.startsWith('--max=')) || '--max=5600').split('=')[1]);
const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LIMIAR_DO_NIVEL = 1;          // ocorrências por milhão, para contar a entrada no nível
const PENALIDADE = 1.25;            // ausente numa das fontes
const DE_CONTEUDO = new Set(['substantivo', 'verbo', 'adjetivo', 'advérbio', 'numeral', 'interjeição', '']);

/* ── as etiquetas de cada fonte → a classe ── */
const CLASSE_FR = { NOM: 'substantivo', VER: 'verbo', AUX: 'verbo', ADJ: 'adjetivo', ADV: 'advérbio',
  INT: 'interjeição', ONO: 'interjeição', KON: 'conjunção', CON: 'conjunção', PRP: 'preposição',
  PRE: 'preposição', PRO: 'pronome', DET: 'determinante', ART: 'determinante' };
function classeFr(tag) {
  tag = String(tag || '');
  if (/^ADJ:num|^NUM/.test(tag)) return 'numeral';
  if (/^ADJ:(pos|dem|int|ind)/.test(tag)) return 'determinante';
  return CLASSE_FR[tag.split(':')[0]] || null;
}
// FreeLing (EAGLES): NC substantivo comum, NP próprio (fora), V verbo, AQ/AO adjetivo, R advérbio…
function classeEs(tag) {
  tag = String(tag || '');
  if (/^NC/.test(tag)) return 'substantivo';
  if (/^V/.test(tag)) return 'verbo';
  if (/^AO/.test(tag) || /^Z/.test(tag)) return 'numeral';
  if (/^A/.test(tag)) return 'adjetivo';
  if (/^R/.test(tag)) return 'advérbio';
  if (/^I/.test(tag)) return 'interjeição';
  if (/^S/.test(tag)) return 'preposição';
  if (/^C/.test(tag)) return 'conjunção';
  if (/^P/.test(tag)) return 'pronome';
  if (/^D/.test(tag)) return 'determinante';
  return null;
}
// NLP4J (Penn): NN substantivo, NNP próprio (fora), VB verbo, JJ adjetivo, RB advérbio…
function classeEn(tag) {
  tag = String(tag || '').trim();
  if (/^NNP/.test(tag)) return null;
  if (/^NN/.test(tag)) return 'substantivo';
  if (/^(VB|MD)/.test(tag)) return 'verbo';
  if (/^JJ/.test(tag)) return 'adjetivo';
  if (/^(RB|WRB)/.test(tag)) return 'advérbio';
  if (/^CD/.test(tag)) return 'numeral';
  if (/^UH/.test(tag)) return 'interjeição';
  if (/^(IN|TO|RP)/.test(tag)) return 'preposição';
  if (/^CC/.test(tag)) return 'conjunção';
  if (/^(PRP|WP|EX)/.test(tag)) return 'pronome';
  if (/^(DT|PDT|WDT)/.test(tag)) return 'determinante';
  return null;
}

// a chave de comparação: minúsculas, «oe» do Lexique = «œ» dos cards, apóstrofo reto
const chave = s => String(s || '').trim().toLowerCase().normalize('NFC')
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/’/g, "'");

function lerTsv(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const tira = s => String(s || '').replace(/^"|"$/g, '');
  const cab = linhas[0].split('\t').map(tira);
  return linhas.slice(1).map(l => {
    const c = l.split('\t').map(tira), o = {};
    cab.forEach((k, i) => { o[k] = c[i]; });
    return o;
  });
}

const fle = new Map();          // lema → { classe, nivel, total }   (livros didáticos)
const lexClasses = new Map();   // lema → { classe → freq }           (legendas)
const formas = new Map();       // forma → maior frequência da forma

function guardarFle(lema, classe, freqs, total) {
  if (!lema || !classe || /[0-9_]/.test(lema)) return;
  const i = freqs.findIndex(f => f >= LIMIAR_DO_NIVEL);
  const item = { classe, nivel: i < 0 ? null : NIVEIS[i], total };
  const ja = fle.get(lema);
  if (!ja || item.total > ja.total) fle.set(lema, item);
}
function guardarLex(lema, classe, freq) {
  if (!lema || /[0-9_]/.test(lema)) return;
  if (!lexClasses.has(lema)) lexClasses.set(lema, {});
  const cl = lexClasses.get(lema);
  cl[classe] = (cl[classe] || 0) + freq;
}

if (LINGUA === 'fr') {
  for (const r of lerTsv(path.join(BRUTOS, 'flelex', 'FleLex_TT.csv')))
    guardarFle(chave(r.word), classeFr(r.tag), NIVEIS.map(n => Number(r['freq_' + n]) || 0), Number(r.freq_total) || 0);
  for (const r of lerTsv(path.join(BRUTOS, 'lexique', 'Lexique4.1.tsv'))) {
    const lema = chave(r['4_Lemme']), classe = classeFr(r['5_Cgram']), forma = chave(r['1_Mot']);
    if (forma) formas.set(forma, Math.max(formas.get(forma) || 0, Number(r['10_FreqMot']) || 0));
    if (!lema || !classe || /[0-9_]/.test(lema)) continue;
    if (!lexClasses.has(lema)) lexClasses.set(lema, {});
    const cl = lexClasses.get(lema);
    cl[classe] = Math.max(cl[classe] || 0, Number(r['12_FreqLemme']) || 0);
  }
} else {
  /* CEFRLex (ELELex, EFLLex): level_freq@a1 … @c1, total_freq@total. Não há C2. */
  const cefr = { es: ['elelex', 'ELELex.tsv', classeEs], en: ['efllex', 'EFLLex.tsv', classeEn] }[LINGUA];
  if (cefr) {
    for (const r of lerTsv(path.join(BRUTOS, cefr[0], cefr[1])))
      guardarFle(chave(r.word), cefr[2](r.tag), ['a1', 'a2', 'b1', 'b2', 'c1'].map(n => Number(r['level_freq@' + n]) || 0),
        Number(r['total_freq@total']) || 0);
  }
  /* as legendas: forma → contagem; o lema recebe a soma das suas formas. A forma que é ela
     mesma um lema, e a palavra gramatical que também é forma de verbo («para», «como»,
     «sobre»), ficam com tudo; a forma ambígua divide a contagem entre os lemas na proporção
     da frequência de cada lema escrito por extenso («pode»: quase tudo para «poder», quase
     nada para «podar»). */
  const lemasDe = new Map(), ehLema = new Set();
  for (const l of fs.readFileSync(path.join(BRUTOS, 'lemas', 'lemmatization-' + LINGUA + '.txt'), 'utf8')
    .replace(/^﻿/, '').split(/\r?\n/)) {
    const [lema, forma] = l.split('\t').map(chave);
    if (!lema || !forma) continue;
    ehLema.add(lema);
    if (!lemasDe.has(forma)) lemasDe.set(forma, new Set());
    lemasDe.get(forma).add(lema);
  }
  // a lista inteira (…_full.txt), quando baixada: põe no lugar também as palavras raras com card
  const base = path.join(BRUTOS, 'legendas', LINGUA === 'pt' ? 'pt_br' : LINGUA);
  const arqLeg = fs.existsSync(base + '_full.txt') ? base + '_full.txt' : base + '.txt';
  const contagens = fs.readFileSync(arqLeg, 'utf8').split(/\r?\n/).filter(Boolean)
    .map(l => { const i = l.lastIndexOf(' '); return [chave(l.slice(0, i)), Number(l.slice(i + 1))]; });
  const GRAMATICAIS = new Set({
    es: ['para', 'como', 'sobre', 'entre', 'bajo', 'contra', 'mas', 'hasta', 'desde', 'durante', 'mediante',
      'nos', 'vino', 'fue', 'era', 'sea', 'ante', 'tras', 'pues'],
    en: ['as', 'like', 'since', 'for', 'but', 'near', 'past', 'round', 'down', 'up', 'out', 'off', 'over'],
    pt: ['para', 'pra', 'como', 'sobre', 'entre', 'uma', 'umas', 'sua', 'suas', 'pela', 'pelas', 'pelo', 'pelos',
      'nós', 'até', 'mas', 'contra', 'durante', 'mediante', 'fora', 'segundo', 'antes', 'logo', 'cerca', 'perante',
      'desde', 'nada', 'quer', 'seja', 'era', 'são', 'tinha', 'deve', 'acha', 'fez', 'vão', 'dele', 'dela']
  }[LINGUA] || []);
  const total = contagens.reduce((s, [, n]) => s + n, 0) / 1e6;
  const freqDaForma = new Map(contagens);
  for (const [forma, n] of contagens) {
    if (!forma || !/^[\p{L}'-]+$/u.test(forma)) continue;
    const f = n / total;
    formas.set(forma, Math.max(formas.get(forma) || 0, f));
    const classe = fle.has(forma) ? fle.get(forma).classe : '';
    if (ehLema.has(forma) || !lemasDe.has(forma) || GRAMATICAIS.has(forma)) { guardarLex(forma, classe, f); continue; }
    const ls = [...lemasDe.get(forma)];
    const pesos = ls.map(l => (freqDaForma.get(l) || 0) + 1);
    const soma = pesos.reduce((a, b) => a + b, 0);
    ls.forEach((lema, i) => guardarLex(lema, fle.has(lema) ? fle.get(lema).classe : '', f * pesos[i] / soma));
  }
}
const lex = new Map();          // lema → { classe, freq }
for (const [lema, cl] of lexClasses) {
  let melhor = null, soma = 0;
  for (const [classe, freq] of Object.entries(cl)) { soma += freq; if (!melhor || freq > melhor.freq) melhor = { classe, freq }; }
  lex.set(lema, LINGUA === 'fr' ? melhor : { classe: melhor.classe, freq: soma });
}

/* ── as duas posições e a média ── */
function posicoes(entradas, cmp) {
  const ordem = entradas.slice().sort((a, b) => cmp(a[1], b[1]) || a[0].localeCompare(b[0], LINGUA));
  const pos = new Map();
  ordem.forEach(([lema], i) => pos.set(lema, i + 1));
  return pos;
}
const nivelIdx = n => (n ? NIVEIS.indexOf(n) : 9);
const posFle = posicoes([...fle.entries()], (a, b) => nivelIdx(a.nivel) - nivelIdx(b.nivel) || b.total - a.total);
const posLex = posicoes([...lex.entries()], (a, b) => b.freq - a.freq);
// posição nas legendas de uma frequência qualquer (para as formas que não são lema)
const freqsLex = [...lex.values()].map(x => x.freq).sort((a, b) => b - a);
function posLexDaFreq(f) {
  let lo = 0, hi = freqsLex.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (freqsLex[m] > f) lo = m + 1; else hi = m; }
  return lo + 1;
}
// sem lista dos livros (o português), a posição é a das legendas, sem penalidade
const media = (pf, pl) => (pf && pl) ? (pf + pl) / 2 : fle.size ? (pf || pl) * PENALIDADE : pl;

const todos = new Map();        // lema → entrada
for (const lema of new Set([...fle.keys(), ...lex.keys()])) {
  const f = fle.get(lema), l = lex.get(lema);
  if (!f && !(l && l.freq >= 1)) continue;          // fora dos livros, só o que é comum nas legendas
  const pf = posFle.get(lema), pl = l ? posLex.get(lema) : null;
  todos.set(lema, { lema, classe: (l && l.classe) || (f && f.classe) || '', nivelFle: (f && f.nivel) || '',
                    freq: l ? l.freq : 0, pf, pl, posicao: media(pf, pl), cards: [], forma: '' });
}

/* ── os cards que já existem ── */
const ARTIGO = { fr: /^(le|la|les|un|une|des)\s+|^l['’]\s*/i, es: /^(el|la|los|las|un|una|unos|unas|lo)\s+/i,
  en: /^(the|a|an|to)\s+/i, pt: /^(o|a|os|as|um|uma|uns|umas)\s+/i }[LINGUA];
const PRONOMINAL = { fr: /^(se |s')/, es: /(se)$/, en: null, pt: /-se$/ }[LINGUA];
const semPronome = b => LINGUA === 'es' ? b.replace(/se$/, '') : LINGUA === 'pt' ? b.replace(/-se$/, '') : b.replace(/^(se |s')/, '');
const formaBase = s => chave(String(s || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/[¡!¿?.,…]/g, '')).replace(ARTIGO, '').trim();
const VAZIAS = new Set({
  fr: ['de', 'du', 'des', 'la', 'le', 'les', "l'", 'à', 'au', 'aux', 'en', 'et', 'd'],
  es: ['de', 'del', 'el', 'la', 'los', 'las', 'lo', 'un', 'una', 'a', 'al', 'en', 'y', 'con', 'por', 'para', 'que', 'se', 'me', 'te', 'le'],
  en: ['the', 'a', 'an', 'to', 'of', 'and', 'in', 'on', 'at', 'for', 'with', 'one', "one's", 'someone', 'something', 'sb', 'sth'],
  pt: ['de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as', 'um', 'uma', 'em', 'no', 'na', 'e', 'com', 'por', 'para', 'que', 'se']
}[LINGUA]);
const cards = [];
const pasta = path.join(RAIZ, 'fonte', 'cards', LINGUA);
for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8'));
  (Array.isArray(j) ? j : j.cards || []).filter(c => c.tipo === 'palavra').forEach(c => cards.push(c));
}
const INICIO_DO_NIVEL = { A1: 0, A2: 700, B1: 1500, B2: 2500, C1: 3750, C2: 5000 };
const comoEntrou = {};
for (const c of cards) {
  const b = formaBase(c[LINGUA]);
  let e = todos.get(b), modo = 'lema';
  if (!e && PRONOMINAL && PRONOMINAL.test(b)) { e = todos.get(semPronome(b)); modo = 'pronominal'; }
  if (!e && !/\s/.test(b) && formas.get(b)) {
    const pl = posLexDaFreq(formas.get(b));
    e = { lema: b, classe: '', nivelFle: '', freq: formas.get(b), pf: null, pl,
          posicao: pl * (fle.size ? PENALIDADE : 1), cards: [], forma: '' };
    todos.set(b, e); modo = 'forma';
  }
  if (!e && /[\s-]/.test(b)) {
    const partes = b.split(/[\s-]+|(?<=')/).map(p => p.replace(/'$/, '')).filter(p => p && !VAZIAS.has(p));
    const pos = partes.map(p => todos.get(p)).filter(Boolean).map(x => x.posicao);
    if (pos.length) {
      /* a expressão não é mais básica que o nível do card (fora do francês): «take aback» não
         fica junto de «take» só porque «aback» não conta */
      const piso = LINGUA === 'fr' ? 0 : (INICIO_DO_NIVEL[c.nivel] || 0);
      e = { lema: b, classe: 'expressão', nivelFle: '', freq: 0, pf: null, pl: null,
            posicao: Math.max(Math.max(...pos) + 0.5, piso), cards: [], forma: '' };
      todos.set(b, e); modo = 'expressão';
    }
  }
  if (!e) {
    // sem posição: vai para o fim, e a curadoria decide onde fica
    e = { lema: b, classe: '', nivelFle: '', freq: 0, pf: null, pl: null, posicao: 1e7, cards: [], forma: '' };
    todos.set(b, e); comoEntrou[c.id] = 'SEM POSIÇÃO: ' + c[LINGUA];
  }
  if (e.lema !== b && modo === 'pronominal') {
    // o pronominal é uma entrada própria, logo depois do verbo
    const p = { lema: b, classe: 'verbo', nivelFle: e.nivelFle, freq: e.freq, pf: e.pf, pl: e.pl,
                posicao: e.posicao + 0.5, cards: [], forma: '' };
    todos.set(b, p); e = p;
  }
  e.cards.push(c.id);
  if (!e.forma) e.forma = c[LINGUA];
  if (modo !== 'lema' && !comoEntrou[c.id]) comoEntrou[c.id] = modo + ': ' + c[LINGUA];
}

const lista = [...todos.values()]
  .filter(x => x.cards.length || DE_CONTEUDO.has(x.classe))
  .sort((a, b) => a.posicao - b.posicao || (a.pl || 1e9) - (b.pl || 1e9));
const corte = lista.slice(0, MAX);
for (const x of lista.slice(MAX)) if (x.cards.length) corte.push(x);   // a lista tem todas as com card

/* --extra=N: as N palavras seguintes ao corte (sem as que têm card, que já estão na lista),
   para alongar uma lista cuja curadoria tirou muita coisa. Vão para candidatos-<língua>-extra.tsv
   com a posição «MAX.0001…», que o juntar.js põe depois das posições inteiras até MAX. */
const EXTRA = Number((process.argv.find(a => a.startsWith('--extra=')) || '--extra=0').split('=')[1]);
if (EXTRA) {
  const mais = lista.slice(MAX).filter(x => !x.cards.length).slice(0, EXTRA);
  const linhasExtra = ['pos\tlema\tclasse\tnivel\tnivel_livros\tfreq_legendas\tcards\tforma_do_card'];
  mais.forEach((x, i) => linhasExtra.push([(MAX + (i + 1) / 10000).toFixed(4), x.lema, x.classe, 'C2', x.nivelFle,
    x.freq.toFixed(2), '', ''].join('\t')));
  fs.writeFileSync(path.join(__dirname, 'candidatos-' + LINGUA + '-extra.tsv'), linhasExtra.join('\n') + '\n');
  console.log(`  ${mais.length} extras em candidatos-${LINGUA}-extra.tsv`);
}

const NIVEL_DA_POSICAO = [[700, 'A1'], [1500, 'A2'], [2500, 'B1'], [3750, 'B2'], [5000, 'C1'], [Infinity, 'C2']];
const nivelDa = p => NIVEL_DA_POSICAO.find(([ate]) => p <= ate)[1];

const saida = ['pos\tlema\tclasse\tnivel\tnivel_livros\tfreq_legendas\tcards\tforma_do_card'];
corte.forEach((x, i) => saida.push([i + 1, x.lema, x.classe, nivelDa(i + 1), x.nivelFle,
  x.freq.toFixed(2), x.cards.join(','), x.forma].join('\t')));
fs.writeFileSync(path.join(__dirname, 'candidatos-' + LINGUA + '.tsv'), saida.join('\n') + '\n');

const comCard = corte.filter(x => x.cards.length);
console.log(`  ${corte.length} palavras na lista; ${comCard.length} com card (${cards.length} cards de palavra)`);
const modos = {};
for (const como of Object.values(comoEntrou)) { const m = como.split(':')[0]; modos[m] = (modos[m] || 0) + 1; }
console.log('  fora do lema: ' + Object.entries(modos).map(([k, n]) => `${k} ${n}`).join(' · '));
for (const [id, como] of Object.entries(comoEntrou)) if (/^SEM/.test(como)) console.log('   ', id, como);
console.log('  as cinco com card mais para o fim: ' +
  comCard.slice(-5).map(x => `${x.lema} (${corte.indexOf(x) + 1})`).join(', '));
