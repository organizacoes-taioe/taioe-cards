#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/testar-textos.js — confere no motor os textos da Biblioteca
   (PLANO.md, seção 9): o card de leitura, a escolha dos textos (o automático
   e a da pessoa), os versos prontos e o rodízio das palavras. Node puro; sai
   com 1 se alguma conferência falhar.

   Uso:  node fonte/testar-textos.js
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

const IDA = M.direcoes().ida, VOLTA = M.direcoes().volta;
const dominado = id => ({ id, etapa: 'dominado', vistas: 5, acertos: 5, erros: 0, dominadoEm: '2026-10-01T10:00:00Z' });
const visto = id => ({ id, etapa: 'multipla', vistas: 1, acertos: 0, erros: 1 });

/* ═══════════ 1. o card de leitura ═══════════ */
secao('card de leitura');
M.usarTransparencias([
  { id: 'r1', tipo: 'palavra', leitura: true },
  { id: 'r2', tipo: 'palavra', leitura: true, transp: 'parecida' },
  { id: 'c1', tipo: 'palavra' }
]);
M.usarExtras({});
ok(M.ehLeitura('r1') && !M.ehLeitura('c1'), 'ehLeitura distingue o card de leitura');
ok(M.transparenteTotal('r2'), 'a «parecida» de leitura conta como total');
ok(M.transparencia({ id: 'r2', transp: 'parecida', leitura: true }) === 'total', 'transparencia() também');

let est = M.estadoInicial('r1');
const responder = (e, acertou) => M.registrar(e, { acertou, modo: M.modoDe(e), direcao: M.direcaoDe(e), resposta: 'x' });
ok(M.direcaoDe(est) === IDA && M.modoDe(est) === 'multipla', 'estreia na ida, em múltipla escolha');
responder(est, true);
ok(est.etapa === 'escrita', 'a múltipla certa leva à escrita');
for (let i = 0; i < 3 && est.etapa !== 'dominado'; i++) responder(est, true);
ok(est.etapa === 'dominado', 'a ida fechada já é o domínio (sem volta)');
ok(!!est.dominadoEm && !!est.voltaEm, 'ganha a data do domínio e a da volta');
ok(M.direcaoDe(est) === IDA && M.modoDe(est) === 'escrita', 'a revisão do dominado é na ida, por escrito');
responder(est, false);
ok(est.etapa === 'dominado', 'errar a revisão não tira o domínio');

let comum = M.estadoInicial('c1');
responder(comum, true);
for (let i = 0; i < 3 && comum.etapa === 'escrita'; i++) responder(comum, true);
ok(comum.etapa === 'inversa-multipla', 'o card comum continua indo para a volta');
const dpn = M.dominioPorNivel([{ id: 'r1', nivel: 'C2', leitura: true }], { r1: est });
ok(dpn.C2 === 0.5, 'o card de leitura fica fora do domínio por nível');

/* ═══════════ 2. versos prontos ═══════════ */
secao('versos prontos');
M.usarTransparencias([]);
const poema = (id, fila, versos) => ({
  id, fila, tipo: 'poema', titulo: id, autor: 'x',
  blocos: [versos.map(r => ({ t: r.join(' '), requer: r }))],
  requerTodas: [...new Set(versos.flat())]
});
const P1 = poema('p1', 1, [['a', 'b'], [], ['c'], ['d']]);
ok(M.versosProntos(P1, {}) === 0, 'nada sabido, nada pronto');
ok(M.versosProntos(P1, { a: dominado('a') }) === 0, 'meio verso não basta');
ok(M.versosProntos(P1, { a: dominado('a'), b: dominado('b') }) === 1,
  'verso 1 pronto; o verso sem palavra de card espera o seguinte');
ok(M.versosProntos(P1, { a: dominado('a'), b: dominado('b'), c: dominado('c') }) === 3, 'com o 3, vêm o 2 e o 3');
ok(M.versosProntos(P1, { a: dominado('a'), b: dominado('b'), c: dominado('c'), d: dominado('d') }) === 4, 'o poema inteiro');
ok(M.versosProntos(P1, { a: dominado('a'), b: dominado('b') }, { c: { ativo: true, em: '2026-10-01T00:00:00Z' } }) === 3,
  'a palavra arquivada («Já conheço») conta como sabida');
const naVolta = id => ({ id, etapa: 'inversa-multipla', vistas: 4, acertos: 4, erros: 0 });
const naIda = id => ({ id, etapa: 'escrita', vistas: 2, acertos: 2, erros: 0 });
ok(M.versosProntos(P1, { a: naVolta('a'), b: dominado('b') }) === 1,
  'a palavra com a ida fechada (já na volta) conta: o verso espera só o reconhecimento');
ok(M.versosProntos(P1, { a: naIda('a'), b: dominado('b') }) === 0, 'a palavra ainda na ida não conta');
ok(M.andamentoDoTexto(P1, { a: naVolta('a'), b: naIda('b') }).faltam === 3, 'o andamento conta as que faltam reconhecer');
const P0 = poema('p0', 0, [[], ['a']]);
ok(M.versosProntos(P0, {}) === 0 && M.versosProntos(P0, { a: dominado('a') }) === 2, 'o primeiro verso vazio vem com o segundo');
ok(M.versosVistos(P1, { 'p1#1': 'x', 'p1#3': 'y' }) === 3 && M.versosVistos(P1, { p1: 'x' }) === 4, 'versosVistos lê os lidos');

/* ═══════════ 3. a escolha ═══════════ */
secao('escolha dos textos');
const P2 = poema('p2', 2, [['e'], ['f']]);
const P3 = poema('p3', 3, [['g'], ['h']]);
const SEM_FILA = Object.assign(poema('livre', undefined, [['i']]), { fila: undefined });
const TEXTOS = [P3, SEM_FILA, P2, P1];
const AGORA = Date.parse('2026-10-20T12:00:00Z');

let e = M.escolhaDosTextos(null, TEXTOS, {}, {}, {}, AGORA);
ok(e.textos.length === 1 && e.textos[0] === 'p1' && e.propria === false, 'sem escolha, o primeiro da fila');
ok(M.escolhaDosTextos(e, TEXTOS, {}, {}, {}, AGORA + 1000) === e, 'nada mudou: o mesmo objeto (nada a gravar)');
const sabeP1 = { a: dominado('a'), b: dominado('b'), c: dominado('c') };
ok(M.escolhaDosTextos(null, TEXTOS, sabeP1, {}, {}, AGORA).textos[0] === 'p2', 'pula o automático que já lê pela metade');
ok(M.escolhaDosTextos(e, TEXTOS, sabeP1, {}, {}, AGORA) === e, 'o automático em andamento não troca por saber muito');
const terminouP1 = { p1: '2026-10-19T00:00:00Z' };
const e2 = M.escolhaDosTextos(e, TEXTOS, sabeP1, {}, terminouP1, AGORA);
ok(e2.textos[0] === 'p2' && !e2.propria && e2 !== e, 'terminado o automático, entra o próximo da fila');
const tudo = { p1: 'x', p2: 'x', p3: 'x' };
ok(M.escolhaDosTextos(e2, TEXTOS, {}, {}, tudo, AGORA).textos.length === 0, 'fila acabada: sem texto');

const minha = { textos: ['livre', 'p3'], em: '2026-10-20T10:00:00Z', propria: true };
ok(M.escolhaDosTextos(minha, TEXTOS, {}, {}, {}, AGORA) === minha, 'a escolha da pessoa manda');
const nenhuma = { textos: [], em: '2026-10-20T10:00:00Z', propria: true };
ok(M.escolhaDosTextos(nenhuma, TEXTOS, {}, {}, {}, AGORA) === nenhuma, 'tudo desmarcado fica sem texto');
const sumiu = M.escolhaDosTextos({ textos: ['p3', 'velho'], em: 'z', propria: true }, TEXTOS, {}, {}, {}, AGORA);
ok(sumiu.textos.join() === 'p3' && sumiu.propria, 'texto que saiu do baralho sai da escolha');
ok(M.textosAtivos({ textos: ['p1', 'p3'], propria: true }, TEXTOS, { p1: 'x' }).map(t => t.id).join() === 'p3',
  'o texto terminado não está ativo');

/* ═══════════ 4. o rodízio das palavras ═══════════ */
secao('palavras dos textos');
const rod = M.palavrasDosTextos([P1, P2], { a: visto('a') }, {});
ok(rod.join() === 'b,e,c,f,d', 'na ordem de leitura, em rodízio entre os textos, sem as já vistas: ' + rod.join());
M.usarTransparencias([{ id: 'e', tipo: 'palavra', transp: 'total' }]);
ok(M.palavrasDosTextos([P2], {}, {}).join() === 'f', 'a transparente total não estreia');
M.usarTransparencias([]);

console.log('\n  ' + feitas + ' conferências' + (falhas ? ', ' + falhas + ' falharam' : ', todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
