#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/testar-latim.js — confere no motor o modo trilhas do latim
   (cards/LATIM.md): o funil estrito, o gabarito de cada frase, os
   distratores, as fases só de ida, o card de conceito e os textos.
   Node puro; sai com 1 se alguma conferência falhar.

   Uso:  node fonte/testar-latim.js
   ──────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const janela = {};
new Function('window', fs.readFileSync(path.join(RAIZ, 'js', 'motor.js'), 'utf8'))(janela);
const M = janela.Motor;

let falhas = 0, feitas = 0;
function ok(cond, msg) {
  feitas++;
  if (!cond) { falhas++; console.log('  ✗ ' + msg); }
}
function secao(t) { console.log('\n  ' + t); }

const pasta = path.join(RAIZ, 'fonte', 'cards', 'la');
const CARDS = fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()
  .flatMap(f => JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')));
const PORID = new Map(CARDS.map(c => [c.id, c]));

M.usarBaralho('la', 'pt');
M.usarModo('trilhas');
const IDA = M.direcoes().ida;

/* ═══════════ 1. o modo ═══════════ */
secao('o modo trilhas');
ok(M.modo() === 'trilhas' && M.soIda(), 'usarModo liga o modo trilhas');
M.usarModo('qualquer');
ok(M.modo() === 'livre' && !M.soIda(), 'modo desconhecido vira livre');
M.usarModo('trilhas');

/* ═══════════ 2. o gabarito ═══════════ */
secao('o molde do gabarito');
const g = M.expandirGabarito('[Eu ~] louvarei o Senhor [em minha vida ~ na minha vida]');
ok(g.length === 4, 'dois colchetes de duas alternativas dão 4 frases (deu ' + g.length + ')');
ok(g.includes('louvarei o Senhor em minha vida') && g.includes('Eu louvarei o Senhor na minha vida'),
  'a alternativa vazia some sem deixar espaço sobrando');
ok(M.expandirGabarito('[a ~ [b ~ c] d]').join('|') === 'a|b d|c d', 'colchete dentro de colchete');
ok(M.expandirGabarito('[a ~ b').erro, 'colchete sem fechar é erro');
ok(M.expandirGabarito('a ] b').erro, '«]» solto é erro');

/* ═══════════ 3. cada card do baralho ═══════════ */
secao('cada card: a resposta, o gabarito e os distratores');
const conf = (c, t) => M.conferir(c, t, IDA);
let respostas = 0;
for (const c of CARDS) {
  ok(conf(c, c.pt) === 'certo', c.id + ': a resposta do card («' + c.pt + '») tem de valer');
  for (const a of c.aceitas || []) { respostas++; ok(conf(c, a) === 'certo', c.id + ': aceita «' + a + '»'); }
  if (c.gabarito) {
    const todas = M.expandirGabarito(c.gabarito);
    ok(todas.length && !todas.erro, c.id + ': o gabarito abre');
    for (const x of todas) { respostas++; ok(conf(c, x) === 'certo', c.id + ': o gabarito aceita «' + x + '»'); }
  }
  for (const d of c.distratores || []) {
    ok(conf(c, d) !== 'certo', c.id + ': o distrator «' + d + '» não pode valer');
    if (c.tipo === 'frase') ok(conf(c, d) === 'errado', c.id + ': o distrator da frase é erro seco («' + d + '»)');
  }
}
console.log('    ' + CARDS.length + ' cards, ' + respostas + ' respostas aceitas conferidas');

/* ═══════════ 4. o funil estrito ═══════════ */
secao('o funil estrito do português');
const t009 = PORID.get('la-t009'), f009 = PORID.get('la-f009');
ok(conf(t009, 'e perdoa-nos as nossas dívidas') === 'certo', 'la-t009 com o «nos»');
ok(conf(t009, 'e perdoa as nossas dívidas') !== 'certo', 'o pronome não some («perdoa» sem «nos»)');
ok(conf(f009, 'Louvai o Senhor, todas as nações.') === 'certo', 'la-f009 como está');
ok(conf(f009, 'Louvai Senhor, todas nações') === 'certo', 'o artigo pode faltar');
ok(conf(f009, 'Louvai o Senhor, toda a nação') !== 'certo', 'o plural não vira singular');
ok(conf(f009, 'O Senhor louvai, todas as nações') === 'quase', 'as mesmas palavras em outra ordem: «deu quase»');
ok(conf(f009, 'Cantai o Senhor, todas as nações') === 'quase', 'uma palavra trocada: «deu quase»');
ok(conf(f009, 'Cantai a Deus, todos os povos') === 'errado', 'outra frase: erro');
ok(M.parecidoDeFrase('a b c', 'c b a') && !M.parecidoDeFrase('a b', 'b a'), 'parecidoDeFrase pede 3 palavras');
ok(M.normalizar('Já é tarde', 'pt') === M.normalizar('é tarde', 'pt'), 'o «já» é omissível');

/* ═══════════ 5. as fases: só a ida ═══════════ */
secao('as fases');
const responder = (e, acertou) => M.registrar(e, { acertou, modo: M.modoDe(e), direcao: M.direcaoDe(e), resposta: 'x' });
for (const id of ['la-p001', 'la-f001', 'la-g001', 'la-t001']) {
  const est = M.estadoInicial(id);
  ok(M.direcaoDe(est) === IDA && M.modoDe(est) === 'multipla', id + ': estreia na ida, em múltipla escolha');
  let n = 0;
  while (est.etapa !== 'dominado' && n < 10) { responder(est, true); n++; }
  ok(n === 3, id + ': domina com a múltipla e duas escritas (foram ' + n + ')');
  ok(M.direcaoDe(est) === IDA, id + ': a revisão do dominado é na ida');
}
const errado = M.estadoInicial('la-p002');
responder(errado, true); responder(errado, false);
ok(errado.etapa !== 'dominado' && M.direcaoDe(errado) === IDA, 'errar a escrita não leva à volta');

/* ═══════════ 6. o card de conceito ═══════════ */
secao('o card de conceito');
const g001 = PORID.get('la-g001');
ok(M.exemploDoConceito(g001, { vistas: 0 }) === g001.exemplos[0], 'o primeiro exemplo na estreia');
ok(M.exemploDoConceito(g001, { vistas: 1 }) === g001.exemplos[1], 'o seguinte na próxima vez');
ok(M.exemploDoConceito(g001, { vistas: g001.exemplos.length }) === g001.exemplos[0], 'e dá a volta');
ok(M.exemploDoConceito(PORID.get('la-p001'), { vistas: 0 }) === null, 'card que não é de conceito não tem exemplo');

/* ═══════════ 7. transparência e desafio ═══════════ */
secao('transparência e desafio');
M.usarTransparencias([{ id: 'x1', tipo: 'palavra', transp: 'parecida' }, { id: 'x2', tipo: 'palavra', transp: 'total' }]);
M.usarExtras({});
ok(M.transparenteTotal('x1') && M.transparenteTotal('x2'), 'no modo trilhas a «parecida» conta como total');
ok(M.escolherDesafio(CARDS, {}, {}) === null, 'não há card desafio');

/* ═══════════ 7b. novo × revisão ═══════════ */
secao('novo × revisão no começo');
const estadosIda = k => { const e = {}; for (let i = 0; i < k; i++) e['x' + i] = { etapa: 'escrita', vistas: 1 }; return e; };
const alvo = { esPt: 30, ptEs: 40 };
const p0 = M.pesosDasFilas(estadosIda(0), null, alvo), p15 = M.pesosDasFilas(estadosIda(15), null, alvo), p30 = M.pesosDasFilas(estadosIda(30), null, alvo);
ok(p0.esPt >= p0.ineditos, 'no começo a revisão pesa tanto quanto o card novo (' + p0.esPt + ' × ' + p0.ineditos + ')');
ok(p15.esPt > 0.8 * p15.ineditos && p15.esPt < 1.5 * p15.ineditos, 'a meio caminho do alvo, perto de meio a meio (' + p15.esPt + ' × ' + p15.ineditos + ')');
ok(p30.ineditos === 2 && p30.esPt === 10, 'no alvo, o card novo vem pelo piso (' + p30.esPt + ' × ' + p30.ineditos + ')');
ok(p0.ptEs === 10, 'a volta não existe, e o peso dela não importa');

/* ═══════════ 8. os textos ═══════════ */
secao('os textos e os trechos');
const pastaTextos = path.join(RAIZ, 'fonte', 'textos', 'la');
const textos = fs.readdirSync(pastaTextos).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(pastaTextos, f), 'utf8')));
ok(textos.length >= 1, 'há textos latinos');
for (const txt of textos) {
  ok(typeof txt.fila !== 'number', txt.id + ': sem «fila» (no modo trilhas não há texto automático)');
  const cardsDe = d => (Array.isArray(d.partes) ? d.partes : [d]).map(x => x.card).filter(Boolean);
  (txt.blocos || []).flat().forEach((l, i) => {
    const tr = PORID.get(l.card);
    ok(tr && tr.texto === txt.id && tr.linha === i + 1 && tr.la === l.t, txt.id + ' linha ' + (i + 1) + ': o trecho bate');
    const pede = new Set((l.p || []).filter(x => x[1]).flatMap(x => cardsDe(txt.destinos[x[1]])));
    const req = new Set((tr && tr.requerTodas) || []);
    ok(pede.size === req.size && [...pede].every(id => req.has(id)),
      txt.id + ' linha ' + (i + 1) + ': as palavras da linha são as que o trecho pede');
  });
}

M.usarModo('livre');
ok(!M.soIda(), 'de volta ao modo livre');

console.log('\n  ' + feitas + ' conferências, ' + (falhas ? falhas + ' falharam' : 'todas passaram'));
process.exit(falhas ? 1 : 0);
