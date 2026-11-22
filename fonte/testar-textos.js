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
/* relato do Gere, 22/11/2026: palavra de verso já lido que volta a faltar não trava os seguintes */
ok(M.versosProntos(P1, { a: naIda('a'), b: dominado('b'), c: dominado('c') }) === 0, 'sem os lidos, a palavra que voltou trava');
ok(M.versosProntos(P1, { a: naIda('a'), b: dominado('b'), c: dominado('c') }, {}, 1) === 3,
  'com o verso 1 já lido, os seguintes abrem pelas palavras deles');
ok(M.versosProntos(P1, { a: naIda('a'), b: dominado('b') }, {}, 1) === 1, 'e esperam as palavras deles');
const and1 = M.andamentoDoTexto(P1, { a: naIda('a'), b: dominado('b') }, {}, 1);
ok(and1.faltam === 2 && and1.quais.join() === 'c,d', 'o andamento com os lidos conta só os versos não lidos, e diz quais');

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

/* ═══════════ 5. as partes de um texto longo (PLANO.md §9.6) ═══════════ */
secao('partes de um texto longo');
const parte = (n, fila) => Object.assign(poema('obra-' + n, fila, [['q' + n]]), { obra: 'obra', parte: n, trecho: 'I, ' + n });
const PT1 = parte(1), PT2 = parte(2), PT3 = parte(3);
const COM_PARTES = [PT3, P1, PT1, PT2];
ok(M.partesDaObra('obra', COM_PARTES).map(t => t.parte).join() === '1,2,3', 'as partes da obra, em ordem');
ok(M.parteDaVez('obra', COM_PARTES, {}) === PT1, 'a parte da vez é a primeira que não terminou');
ok(M.parteDaVez('obra', COM_PARTES, { 'obra-1': 'x' }) === PT2, 'terminada a 1, a da vez é a 2');
ok(M.parteDaVez('obra', COM_PARTES, { 'obra-1': 'x', 'obra-2': 'x', 'obra-3': 'x' }) === null, 'todas lidas: nenhuma');
ok(M.parteSeguinte(PT1, COM_PARTES) === PT2 && M.parteSeguinte(PT3, COM_PARTES) === null, 'a seguinte, e a última sem seguinte');
ok(M.parteSeguinte(P1, COM_PARTES) === null, 'texto que não é parte não tem seguinte');
ok(M.textoEscolhivel(PT1, COM_PARTES, {}) && !M.textoEscolhivel(PT2, COM_PARTES, {}), 'só a parte da vez pode ser escolhida');
ok(M.textoEscolhivel(PT2, COM_PARTES, { 'obra-1': 'x' }) && !M.textoEscolhivel(PT1, COM_PARTES, { 'obra-1': 'x' }),
  'terminada a 1, a 2 passa a ser escolhível, e a 1 não');
ok(M.textoEscolhivel(P1, COM_PARTES, {}), 'o texto comum continua escolhível');
const AUTO = [parte(1, 1), parte(2, 2)];
ok(M.escolhaDosTextos(null, AUTO, {}, {}, {}, AGORA).textos.join() === 'obra-1', 'no automático, a parte 1 primeiro');
ok(M.escolhaDosTextos(null, AUTO, { q1: dominado('q1') }, {}, {}, AGORA).textos.join() === 'obra-1',
  'o automático não pula para a parte 2 enquanto a 1 não terminou');
ok(M.escolhaDosTextos(null, AUTO, {}, {}, { 'obra-1': 'x' }, AGORA).textos.join() === 'obra-2', 'terminada a 1, vem a 2');

/* ═══════════ 6. sem gargalo entre um texto e o outro (pedido de 29/10/2026) ═══════════ */
secao('as palavras do texto que vem adiante');
const ids = l => l.map(t => t.id).join();
const soltam = (escolha, textos, estados, lidos) => M.textosQueSoltamPalavras(escolha, textos, estados, {}, lidos || {});
const minhaObra = { textos: ['obra-1'], em: 'z', propria: true };
ok(ids(soltam(minhaObra, COM_PARTES, {})) === 'obra-1', 'com palavra por estrear, só a parte ativa');
ok(ids(soltam(minhaObra, COM_PARTES, { q1: visto('q1') })) === 'obra-1,obra-2', 'todas as da parte 1 em jogo: solta a 2');
ok(ids(soltam(minhaObra, COM_PARTES, { q1: visto('q1'), q2: visto('q2') })) === 'obra-1,obra-2,obra-3',
  'a 3 vem quando a 2 também já soltou todas');
const PA = Object.assign(poema('oa-1', undefined, [['u1']]), { obra: 'oa', parte: 1 });
const PB = Object.assign(poema('oa-2', undefined, [['u2']]), { obra: 'oa', parte: 2 });
const PC = Object.assign(poema('oa-3', undefined, [['u3']]), { obra: 'oa', parte: 3 });
const obraA = { textos: ['oa-1'], em: 'z', propria: true };
ok(ids(soltam(obraA, [PA, PB, PC], { u1: visto('u1') })) === 'oa-1,oa-2', 'adiante, só até a primeira parte com palavra por estrear');
const autoP1 = { textos: ['p1'], em: 'z', propria: false };
const p1Visto = { a: visto('a'), b: visto('b'), c: visto('c'), d: visto('d') };
ok(ids(soltam(autoP1, TEXTOS, p1Visto)) === 'p1,p2', 'no automático, o próximo da fila');
ok(ids(soltam({ textos: ['p1'], em: 'z', propria: true }, TEXTOS, p1Visto)) === 'p1',
  'texto escolhido pela pessoa, sem ser parte: nada adiante');
ok(M.palavrasDosTextos(soltam(autoP1, TEXTOS, p1Visto), p1Visto, {}).join() === 'e,f', 'as palavras de adiante entram na fila');
ok(ids(M.textosAtivos(autoP1, TEXTOS, {})) === 'p1', 'mas o texto ativo, que mostra os versos, continua o mesmo');

console.log('\n  ' + feitas + ' conferências' + (falhas ? ', ' + falhas + ' falharam' : ', todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
