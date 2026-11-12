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
/* a meta da ida no latim é metade maior que nas línguas vivas, porque não há volta (o Gere, 07/11/2026) */
const diarioForte = { '2026-11-01': { n: 400, ok: 380 } };
const vivaMin = M.alvoDaFila({}).esPt, vivaMax = M.alvoDaFila(diarioForte).esPt;
M.usarModo('trilhas');
ok(vivaMin === 30 && vivaMax === 50 && M.alvoDaFila({}).esPt === 45 && M.alvoDaFila(diarioForte).esPt === 75,
  'a meta da ida: 30 a 50 nas línguas vivas, 45 a 75 no latim');

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
    /* na flexão, a errada com parêntese pode ser, sem ele, a mesma escrita da certa: «ele
       (sujeito)» no card de eum, que aceita «ele» (LATIM.md §3.8, D24) */
    if (c.tipo === 'flexao' && d.includes('(')) continue;
    ok(conf(c, d) !== 'certo', c.id + ': o distrator «' + d + '» não pode valer');
    if (c.tipo === 'flexao') ok(conf(c, d) !== 'certo', c.id + ': o distrator da flexão nunca é acerto («' + d + '»)');
    if (c.tipo === 'frase') ok(conf(c, d) !== 'certo', c.id + ': o distrator da frase nunca é acerto («' + d + '»)');
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
ok(conf(f009, 'Cantai o Senhor, todas as nações') === 'quase', 'uma palavra trocada, 4 letras em 26: «deu quase» pela régua geral');
ok(conf(f009, 'Cantai a Deus, todos os povos') === 'errado', 'outra frase: erro');
ok(M.parecidoDeFrase('a b c', 'c b a') && !M.parecidoDeFrase('a b c', 'a b d'), 'parecidoDeFrase: as mesmas palavras, em qualquer ordem');
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
/* as declinações e conjugações (03/11/2026): exemplos das palavras do curso, as vistas primeiro */
const gruposDecl = CARDS.filter(c => c.tipo === 'conceito' && c.grupo);
ok(gruposDecl.length === 9 && gruposDecl.every(g => g.exemplos.length >= 3 && g.exemplos.every(e => g.distratores.length === 4 && !e.distratores.includes(g.pt))),
  'nove conceitos de declinação e conjugação, com 3 exemplos ou mais e 4 erradas');
const g2 = gruposDecl.find(g => g.grupo === '2ª declinação');
const comLema = g2.exemplos.filter(e => e.lema).slice(0, 2);
const vistosG = Object.fromEntries(comLema.map(e => [e.lema, { vistas: 2 }]));
ok([0, 1, 2, 3].every(n => comLema.includes(M.exemploDoConceito(g2, { vistas: n }, vistosG))), 'o exemplo sai das palavras já vistas');
ok(M.exemploDoConceito(g2, { vistas: 0 }, {}) === g2.exemplos[0], 'sem palavra vista, vale a lista toda');
const { doGrupo } = require('./latim/declinacoes');
/* o card de forma varia a pergunta (03/11/2026) */
const formaVaria = CARDS.find(c => c.tipo === 'forma' && c.funcao && c.dicionario);
const tiposVistos = new Set([0, 1, 2, 3, 4, 5].map(n => M.perguntaDaForma(formaVaria, { vistas: n }).tipo));
ok(tiposVistos.has('caso') && tiposVistos.has('funcao') && tiposVistos.has('dicionario'), 'a forma pergunta o caso, a função e a forma de dicionário, uma por vez');
ok(CARDS.filter(c => c.tipo === 'forma').every(c => [0, 1, 2].every(n => { const p = M.perguntaDaForma(c, { vistas: n }); return p.pt && p.distratores.length >= 4 && !p.distratores.includes(p.pt) && new Set(p.distratores).size === p.distratores.length; })),
  'toda pergunta de forma tem a certa e quatro erradas distintas');
ok(CARDS.filter(c => c.segundo).every(c => { const o = CARDS.find(x => x.id === c.segundo); return o && o.la.toLowerCase() === c.la.toLowerCase() && o.pt !== c.pt; }),
  'o segundo contexto é a mesma forma noutro caso');
ok(CARDS.some(c => c.tipo === 'flexao' && CARDS.some(l => l.id === c.lema && doGrupo(l, '2ª declinação'))), 'há flexões de palavras da 2ª declinação (o build as liga ao conceito)');
M.usarTransparencias(CARDS);   // o motor aprende o tipo de cada card
const conceito = M.estadoInicialDo(g001);
ok(M.modoDe(conceito) === 'multipla', 'o conceito é de escolher');
const altG = M.alternativas(g001, IDA, CARDS, { 'la-g001': { vistas: 1 } });
ok(altG.length === 5 && altG.includes('nominativo') && g001.exemplos[1].distratores.every(d => altG.includes(d)),
  'as erradas são as do exemplo da vez (' + altG.join(', ') + ')');
for (let i = 0; i < 2; i++) responder(conceito, true);
ok(conceito.etapa !== 'dominado' && M.modoDe(conceito) === 'multipla', 'dois acertos: ainda não, e continua de escolher');
responder(conceito, true);
ok(conceito.etapa === 'dominado' && M.modoDe(conceito) === 'multipla', 'três seguidos dominam, e a revisão também é de escolher');
/* o gênero (o neutro, §15) só tem masculino e feminino para errar */
for (const c of CARDS.filter(x => x.tipo === 'conceito' && x.familia === 'genero')) {
  c.exemplos.forEach((ex, i) => ok(Array.isArray(ex.distratores) && ex.distratores.length === 2 && !ex.distratores.includes(c.pt),
    c.id + ' exemplo ' + (i + 1) + ': as duas erradas, sem a certa'));
}
for (const c of CARDS.filter(x => x.tipo === 'conceito' && x.familia !== 'voz' && x.familia !== 'genero')) {
  c.exemplos.forEach((ex, i) => ok(Array.isArray(ex.distratores) && ex.distratores.length === 4 && !ex.distratores.includes(c.pt),
    c.id + ' exemplo ' + (i + 1) + ': quatro erradas, sem a certa'));
}

/* ═══════════ 6a. o card de flexão (LATIM.md §3.8) ═══════════ */
secao('o card de flexão');
const FLEX = CARDS.filter(c => c.tipo === 'flexao');
ok(FLEX.length > 100, 'há cards de flexão (' + FLEX.length + ')');
const flex = (la, lema) => FLEX.find(c => c.la === la && PORID.get(c.lema).la === lema);
const fId = flex('id', 'is'), fEum = flex('eum', 'is'), fEi = flex('ei', 'is'), fIs = flex('is', 'is');
ok(fId && fEum && fEi && fIs, 'a tabela de is, ea, id, também com «is» (a forma do dicionário)');
ok(['is', 'ea', 'id'].every(f => flex(f, 'is')) && ['hic', 'haec', 'hoc'].every(f => flex(f, 'hic')) &&
  ['qui', 'quae', 'quod'].every(f => flex(f, 'qui')), 'as três formas do dicionário dos pronomes de três gêneros');
ok(['sum', 'esse', 'fui'].every(f => flex(f, 'sum')) && ['possum', 'posse', 'potui'].every(f => flex(f, 'possum')),
  'sum e possum com as formas do enunciado');
/* desde 26/10/2026 a flexão de nome pergunta o caso, só de escolher; a resposta escrita (o
   sentido) ficou com os verbos. Desde 31/10, o número vem primeiro («singular: acusativo») */
ok(fId.familia === 'caso' && fId.pt === 'singular: nominativo ou acusativo' && /isso/.test(fId.sentido),
  'id: a resposta é o caso, e o sentido («isso») fica à parte');
ok(fEi.pt === 'singular: dativo; plural: nominativo', 'ei: todos os casos que a forma pode ter');
ok(conf(fEum, 'singular: acusativo') === 'certo' && conf(fEum, 'singular: genitivo') === 'errado', 'eum: o caso certo, e outro é erro');
const pares = x => x.split(';').flatMap(p => (p.match(/nominativo|genitivo|dativo|acusativo|ablativo|vocativo/g) || [])
  .flatMap(k => (p.match(/singular|plural/g) || []).map(n => k + ' ' + n)));
const DE_CASO = FLEX.filter(c => c.familia === 'caso');
ok(DE_CASO.length > 200, 'as flexões de nome perguntam o caso (' + DE_CASO.length + ')');
ok(!FLEX.some(c => c.familia !== 'caso' && /^(nominativo|genitivo|dativo|acusativo|ablativo|vocativo)/.test(c.analise)),
  'nenhuma flexão de nome ficou pedindo o sentido');
for (const c of DE_CASO) {
  ok(c.distratores.length === 4 && c.distratores.every(d => !pares(d).some(x => pares(c.pt).includes(x))),
    c.id + ': nenhuma errada divide um caso com a certa');
}
const estC = M.estadoInicialDo(fEum);
let nC = 0;
while (estC.etapa !== 'dominado' && nC < 10) {
  ok(M.modoDe(estC) === 'multipla', 'a flexão de nome é sempre de escolher');
  responder(estC, true); nC++;
}
ok(nC === 3, 'três acertos seguidos a dominam (foram ' + nC + ')');
ok(M.modoDe(estC) === 'multipla' && estC.voltaEm, 'e ela volta por data, de escolher');
const fFac = flex('faciam', 'facio'), fReq = flex('requiris', 'requiro');
ok(!fFac.familia && conf(fFac, 'que eu faça') === 'certo' && conf(fFac, 'Farei.') === 'certo', 'faciam: «que eu faça», e a outra leitura, «farei»');
ok(conf(fReq, 'pergunta') !== 'certo', 'requiris: a leitura de outra forma do lema nunca é acerto');
ok(conf(fReq, 'tu perguntas (sujeito)') === 'certo', 'a certa com o parêntese também vale');
const altFlex = M.alternativas(fId, IDA, CARDS, {});
ok(altFlex.length === 5 && altFlex.includes(fId.pt) && fId.distratores.every(d => altFlex.includes(d)), 'as alternativas: a certa e as quatro do card');
const estF = M.estadoInicialDo(fFac);
ok(M.modoDe(estF) === 'multipla' && M.direcaoDe(estF) === IDA, 'o verbo estreia na ida, de escolher');
let nF = 0;
while (estF.etapa !== 'dominado' && nF < 10) { responder(estF, true); nF++; }
ok(nF === 3, 'o verbo domina como o card de palavra: a múltipla e duas escritas (foram ' + nF + ')');
for (const c of FLEX) {
  for (const o of c.outras || []) ok(conf(c, o) === 'certo', c.id + ': a outra leitura «' + o + '» vale');
  ok(PORID.get(c.lema) && PORID.get(c.lema).tipo === 'palavra', c.id + ': o lema existe');
}
const tr022 = PORID.get('la-t022');
ok(tr022.requerTodas.includes(fId.id), 'o verso de Catulo espera a flexão «id»');
ok(tr022.requerTodas.indexOf('la-p171') < tr022.requerTodas.indexOf(fId.id), 'os lemas antes das flexões');

/* ═══════════ 6b. o card de forma (LATIM.md §3.6) ═══════════ */
secao('o card de forma');
const FORMAS = CARDS.filter(c => c.tipo === 'forma');
ok(FORMAS.length > 0, 'há cards de forma');
const abl = FORMAS.find(c => c.pt === 'ablativo' && c.la === 'principio');
const perf = FORMAS.find(c => c.pt === 'perfeito do indicativo');
const subj = FORMAS.find(c => c.pt === 'presente do subjuntivo');
const impv = FORMAS.find(c => c.pt === 'imperativo');
const part = FORMAS.find(c => c.pt === 'particípio perfeito');
const cf = (c, t) => M.conferir(c, t, IDA);
ok(cf(abl, 'ablativo') === 'certo' && cf(abl, 'Ablativo singular') === 'certo' && cf(abl, 'abl.') === 'certo',
  'o caso vale com o número, maiúscula e abreviado');
ok(cf(abl, 'dativo') === 'errado', 'outro caso é erro seco');
ok(cf(abl, 'ablativo ou dativo') === 'errado', 'dois casos de uma vez é erro');
ok(cf(abl, 'ablatvo') === 'quase', 'uma letra trocada: «deu quase»');
ok(cf(perf, 'perfeito') === 'certo' && cf(perf, 'pretérito perfeito do indicativo') === 'certo', 'o perfeito sem o modo é o do indicativo');
ok(cf(perf, 'presente') === 'errado' && cf(perf, 'perfeito do subjuntivo') === 'errado', 'outro tempo, ou outro modo, é erro');
ok(cf(subj, 'subjuntivo') === 'certo' && cf(subj, 'presente do conjuntivo') === 'certo', 'o subjuntivo sem o tempo é o presente');
ok(cf(subj, 'presente') === 'errado', 'o presente sem o modo é o do indicativo');
ok(cf(impv, 'imperativo presente') === 'certo', 'o imperativo com o tempo');
ok(cf(part, 'particípio') === 'certo' && cf(part, 'particípio passado') === 'certo', 'o particípio com ou sem o tempo');
ok(M.foraDaPergunta(abl, 'o princípio') && M.foraDaPergunta(abl, 'princípio'), 'o significado no lugar do caso: pergunta trocada');
ok(!M.foraDaPergunta(abl, 'ablativo') && !M.foraDaPergunta(abl, 'ablatvo') && !M.foraDaPergunta(abl, 'dativo'),
  'o caso, mesmo errado ou com erro de letra, não é pergunta trocada');
ok(M.foraDaPergunta(PORID.get('la-g001'), 'Deus') && !M.foraDaPergunta(PORID.get('la-p001'), 'deus'),
  'vale também no card de conceito, e só nos de gramática');

M.usarTransparencias(CARDS);
M.usarExtras({ uid: 'teste' });
const resp = (e, acertou) => M.registrar(e, { acertou, modo: 'escrita', direcao: IDA, resposta: 'x' });
const novo = M.estadoInicialDo(abl);
ok(M.modoDe(novo) === 'multipla', 'é de escolher (desde 24/10/2026), também na estreia');
const altF = M.alternativas(abl, IDA, CARDS, {});
ok(altF.length === 5 && altF.includes('ablativo') && altF.includes('dativo'),
  'cinco alternativas, com a certa e a que mais se confunde com ela (' + altF.join(', ') + ')');
resp(novo, true);
ok(novo.etapa === 'dominado' && novo.voltaEm === null, 'acertou de primeira: dominado, sem data de volta');
ok(M.filaDe(novo) === 'fora' && M.encerrado(abl.id, novo), 'e fora de todas as filas');
const teimoso = M.estadoInicialDo(abl);
resp(teimoso, false);
ok(M.modoDe(teimoso) === 'multipla', 'errou: continua de escolher');
resp(teimoso, true); resp(teimoso, true);
ok(teimoso.etapa !== 'dominado', 'dois acertos depois do erro ainda não bastam');
resp(teimoso, true);
ok(teimoso.etapa === 'dominado' && teimoso.voltaEm === null, 'o terceiro seguido fecha de vez');

const fonteDe = { [abl.de]: { vistas: 1 } };
ok(!M.formaPronta(Object.assign({}, abl, { ambigua: true }), {}, {}), 'antes do verso aparecer, não estreia');
ok(M.formaPronta(Object.assign({}, abl, { ambigua: true }), fonteDe, {}), 'depois do verso, a forma ambígua estreia');
/* desde 29/10/2026 (LATIM.md §13, D28), só a forma que, sozinha, teria mais de uma leitura */
ok(!M.formaEscolhida(Object.assign({}, abl, { ambigua: false, sempre: true }), {}), 'a de leitura única não estreia, nem a difícil');
ok(FORMAS.every(c => typeof c.ambigua === 'boolean') && FORMAS.some(c => c.ambigua) && FORMAS.some(c => !c.ambigua),
  'cards_de_forma.py marca as ambíguas (' + FORMAS.filter(c => c.ambigua).length + ' de ' + FORMAS.length + ')');
const porLa = la => FORMAS.find(c => c.la === la);
ok(porLa('Tempus') && porLa('Tempus').ambigua && porLa('caritas') && !porLa('caritas').ambigua,
  'Tempus (nominativo ou acusativo) é ambígua; caritas, não');
const dativos = FORMAS.filter(c => c.pt === 'dativo');
const h = (em, acertou) => ({ em: '2026-10-22T10:0' + em + ':00Z', acertou });
ok(!M.formaPuxada('dativo', {}), 'sem erro, nada puxado');
ok(M.formaPuxada('dativo', { [dativos[0].id]: { historico: [h(1, false)] } }), 'errou um dativo: os dativos fáceis vêm');
ok(M.formaPuxada('dativo', { [dativos[0].id]: { historico: [h(1, false), h(2, true)] }, [dativos[1].id]: { historico: [h(3, true)] } }),
  'dois acertos depois ainda puxam');
ok(!M.formaPuxada('dativo', { [dativos[0].id]: { historico: [h(1, false), h(2, true)] }, [dativos[1].id]: { historico: [h(3, true), h(4, true)] } }),
  'três acertos seguidos do caso soltam');
ok(!M.formaPuxada('ablativo', { [dativos[0].id]: { historico: [h(1, false)] } }), 'o erro do dativo não puxa o ablativo');

/* ═══════════ 6c. o card de contraste (LATIM.md §3.7) ═══════════ */
secao('o card de contraste');
const CONTRASTES = CARDS.filter(c => c.tipo === 'contraste');
ok(CONTRASTES.length >= 20, 'há cards de contraste (' + CONTRASTES.length + ')');
const k = CONTRASTES[0];
const irmao = CONTRASTES.find(c => c.conjunto === k.conjunto && c.id !== k.id);
const est0 = M.estadoInicialDo(k);
const fase0 = M.faseDe(est0);
ok(fase0.modo === 'multipla' && M.pergunta(k, fase0.direcao) === k.pt && M.resposta(k, fase0.direcao) === k.la,
  'pergunta em português, resposta em latim, na múltipla escolha');
const alt = M.alternativas(k, fase0.direcao, CARDS, {});
ok(alt.length === 4 && alt.includes(k.la) && [...alt].sort().join('|') === [irmao.la, ...irmao.distratoresLa].sort().join('|'),
  'as quatro alternativas são as do conjunto, as mesmas do irmão');
const rc = (e, acertou) => M.registrar(e, { acertou, modo: 'multipla', direcao: fase0.direcao, resposta: 'x' });
rc(est0, true); rc(est0, true);
ok(est0.etapa === 'multipla' && M.modoDe(est0) === 'multipla', 'dois acertos: continua na múltipla escolha');
rc(est0, true);
ok(est0.etapa === 'dominado' && est0.voltaEm && M.filaDe(est0) === 'dominados', 'três seguidos dominam, e ele volta por data');
ok(M.modoDe(est0) === 'multipla', 'e a revisão também é múltipla escolha');
rc(est0, false);
ok(est0.etapa === 'dominado' && M.modoDe(est0) === 'multipla', 'errar na revisão encurta a espera e não muda o modo');
const est1 = M.estadoInicialDo(k);
rc(est1, true); rc(est1, false);
ok(est1.etapa === 'multipla' && est1.seguidas === 0, 'o erro zera a sequência');
const conceitosDeK = k.requerTodas.filter(id => PORID.get(id).tipo === 'conceito');
ok(conceitosDeK.length >= 2 && conceitosDeK.every(id => k.conceitos.includes(id)), 'espera os conceitos dos casos');
const ontem = new Date(Date.now() - 2 * 864e5).toISOString();
const sabidos = Object.fromEntries(k.requerTodas.map(id => [id, { etapa: 'dominado', dominadoEm: ontem, vistas: 3 }]));
ok(M.liberado(k, sabidos, Date.now(), {}), 'com as palavras e os conceitos dominados, libera');
delete sabidos[conceitosDeK[0]];
ok(!M.liberado(k, sabidos, Date.now(), {}), 'sem um dos conceitos, não');

/* ═══════════ 6d. uma terminação, um card (LATIM.md §13, D26, D27 e D29) ═══════════ */
secao('uma terminação, um card');
const { terminacoes } = require('./latim/terminacoes');
const TERM = terminacoes(CARDS);
CARDS.forEach(c => { if (TERM.has(c.id)) c.terminacao = TERM.get(c.id); });
M.usarTransparencias(CARDS);
const grupos = new Map();
for (const [id, chave] of TERM) { if (!grupos.has(chave)) grupos.set(chave, []); grupos.get(chave).push(PORID.get(id)); }
const flexaoLa = la => CARDS.find(c => c.tipo === 'flexao' && c.la === la);
ok(grupos.size >= 20, 'há grupos de terminação (' + grupos.size + ', com ' + TERM.size + ' flexões)');
ok([...grupos.values()].every(g => g.length >= 2 && g.every(c => (c.familia === 'caso') === (g[0].familia === 'caso'))),
  'todo grupo tem dois cards ou mais, e é todo de nomes ou todo de verbos');
ok([...grupos.values()].filter(g => g[0].familia === 'caso').every(g => g.every(c => c.pt === g[0].pt)), 'nos nomes, a mesma resposta');
ok([...grupos.values()].filter(g => g[0].familia !== 'caso').every(g => g.every(c => c.analise === g[0].analise)), 'nos verbos, a mesma análise');
ok(![...TERM.keys()].some(id => /pronome/.test((PORID.get(PORID.get(id).lema).tags || []).join(' '))), 'nenhum pronome nos grupos');
ok(['dixit', 'stetit', 'vicit'].every(la => flexaoLa(la) && !TERM.has(flexaoLa(la).id)), 'o perfeito de radical próprio (dixit, stetit, vicit) tem card próprio');
ok(flexaoLa('di').rara && flexaoLa('dii').rara && !TERM.has(flexaoLa('di').id), 'a variante (di, dii) é «rara», fora dos grupos');
ok(M.adormecido(flexaoLa('di').id, {}) && M.quemConta(flexaoLa('di').id, {}) === flexaoLa('di').lema, 'e não estreia: conta como o lema');

const aquae = flexaoLa('aquae');
const chaveAe = TERM.get(aquae.id);
const outraAe = grupos.get(chaveAe).find(c => c.id !== aquae.id);
const depois = '2026-11-02';
ok(chaveAe && M.ativoDaTerminacao(chaveAe, {}) === null && !M.adormecido(aquae.id, {}) && !M.adormecido(outraAe.id, {}),
  'ninguém do grupo visto: ninguém dorme');
const viu = { [aquae.id]: { vistas: 1, etapa: 'multipla', estreia: depois } };
ok(M.ativoDaTerminacao(chaveAe, viu) === aquae.id && !M.adormecido(aquae.id, viu), 'o primeiro visto é o ativo');
ok(M.adormecido(outraAe.id, viu) && M.quemConta(outraAe.id, viu) === aquae.id, 'as outras formas dormem e contam como ele');
ok(M.sabidaEm(outraAe.id, viu, {}) === Infinity, 'com o ativo em estudo, a que dorme não está sabida');
const quando = '2026-11-02T10:00:00Z';
const dominou = { [aquae.id]: { vistas: 3, etapa: 'dominado', estreia: depois, dominadoEm: quando } };
ok(M.sabidaEm(outraAe.id, dominou, {}) === Date.parse(quando), 'com o ativo dominado, a que dorme conta como sabida desde então');
const fraseDaOutra = CARDS.find(c => c.tipo === 'frase' && (c.requerTodas || []).includes(outraAe.id) && !(c.requerTodas || []).includes(aquae.id));
ok(!!fraseDaOutra, 'há uma frase que pede a outra forma (' + (fraseDaOutra && fraseDaOutra.id) + ')');
if (fraseDaOutra) {
  const tudo = Object.fromEntries(fraseDaOutra.requerTodas.filter(id => id !== outraAe.id)
    .map(id => [id, { vistas: 3, etapa: 'dominado', estreia: '2026-10-20', dominadoEm: '2026-10-21T10:00:00Z' }]));
  ok(!M.liberado(fraseDaOutra, tudo, Date.parse('2026-12-01'), {}), 'a frase espera a terminação');
  ok(M.liberado(fraseDaOutra, Object.assign({}, tudo, dominou), Date.parse('2026-12-01'), {}), 'e destrava com o ativo dominado');
  ok(!M.situacaoDaFrase(fraseDaOutra, Object.assign({}, tudo, viu), {}).naoVistas.includes(outraAe.id), 'a que dorme não conta como palavra por ver');
  const errou = Object.assign({}, dominou, { [fraseDaOutra.id]: { vistas: 2, etapa: 'multipla', historico: [{ em: '2026-11-03T10:00:00Z', acertou: false }] } });
  ok(M.flexaoPuxada(outraAe.id, errou) && !M.adormecido(outraAe.id, errou), 'errou a frase depois da mudança: a forma acorda');
  const antes = Object.assign({}, dominou, { [fraseDaOutra.id]: { vistas: 2, etapa: 'multipla', historico: [{ em: '2026-10-20T10:00:00Z', acertou: false }] } });
  ok(!M.flexaoPuxada(outraAe.id, antes), 'o erro de antes da mudança não acorda ninguém');
}
const acordada = Object.assign({}, dominou, { [outraAe.id]: { vistas: 1, etapa: 'multipla', estreia: '2026-11-04' } });
ok(!M.adormecido(outraAe.id, acordada) && M.ativoDaTerminacao(chaveAe, acordada) === aquae.id, 'quem estreou depois da mudança é card próprio, e o ativo não muda');
const legado = {
  [aquae.id]: { vistas: 5, etapa: 'dominado', estreia: '2026-10-25', dominadoEm: '2026-10-26T10:00:00Z' },
  [outraAe.id]: { vistas: 4, etapa: 'dominado', estreia: '2026-10-24', dominadoEm: '2026-10-25T10:00:00Z' }
};
ok(M.ativoDaTerminacao(chaveAe, legado) === outraAe.id && M.adormecido(aquae.id, legado),
  'de quem viu várias antes da mudança, fica a dominada há mais tempo; a outra dorme');
const emEstudo = {
  [aquae.id]: { vistas: 2, etapa: 'escrita', estreia: '2026-10-25' },
  [outraAe.id]: { vistas: 2, etapa: 'escrita', estreia: '2026-10-24' }
};
ok(M.contarDirecoes(emEstudo, {}).esPt === 1, 'a que dorme não conta na ida');
const lemasVistos = Object.fromEntries(grupos.get(chaveAe).map(c => [c.lema, { vistas: 1, etapa: 'escrita' }]));
const comLemas = Object.assign({}, lemasVistos, viu);
ok(M.exemploDaTerminacao(aquae, { vistas: 0 }, comLemas, {}).id === aquae.id, 'na estreia, o card mostra a própria forma');
const mostradas = new Set(grupos.get(chaveAe).map((_, v) => M.exemploDaTerminacao(aquae, { vistas: v }, comLemas, {}).id));
ok(mostradas.size === grupos.get(chaveAe).length, 'depois, em rodízio, as outras palavras da terminação (' + mostradas.size + ')');
ok(M.exemploDaTerminacao(aquae, { vistas: 1 }, Object.assign({ [aquae.lema]: { vistas: 1 } }, viu), {}).id === aquae.id,
  'só entram as palavras cujo lema a pessoa já viu');
const verbo = [...grupos.values()].find(g => g[0].familia !== 'caso')[0];
ok(M.exemploDaTerminacao(verbo, { vistas: 3 }, { [verbo.id]: { vistas: 3, estreia: depois } }, {}).id === verbo.id, 'o card de verbo não gira');
M.usarTransparencias(CARDS.map(c => Object.assign({}, c, { terminacao: undefined })));

/* ═══════════ 6e. compreensão e herança (LATIM.md §13, D31 e D32) ═══════════ */
secao('os cards de compreensão e de herança');
M.usarTransparencias(CARDS);
for (const tipo of ['compreensao', 'heranca']) {
  const doTipo = CARDS.filter(c => c.tipo === tipo);
  ok(doTipo.length >= 20, 'há cards de ' + tipo + ' (' + doTipo.length + ')');
  const c = doTipo[0];
  const e = M.estadoInicialDo(c);
  const f = M.faseDe(e);
  ok(f.modo === 'multipla' && f.direcao === IDA && M.resposta(c, f.direcao) === c.pt, tipo + ': de escolher, na ida, com a resposta em português');
  const alt = M.alternativas(c, f.direcao, CARDS, {});
  ok(alt.length === 5 && alt.includes(c.pt) && c.distratores.every(d => alt.includes(d)), tipo + ': as cinco alternativas são a certa e as quatro do card');
  ok(doTipo.every(x => !x.distratores.some(d => M.conferir(x, d, IDA) === 'certo')), tipo + ': nenhuma errada é aceita');
  const reg = acertou => M.registrar(e, { acertou, modo: 'multipla', direcao: IDA, resposta: 'x' });
  {
    /* a herança é curiosidade (o Gere, 03/11/2026): o acerto de primeira fecha de vez; depois
       de um erro, dois acertos seguidos; e a compreensão, desde 07/11/2026, igual (la-q026) */
    reg(true);
    ok(e.etapa === 'dominado' && !e.voltaEm && M.filaDe(e) === 'fora' && M.encerrado(c.id, e), tipo + ': o acerto de primeira fecha de vez');
    const e2 = M.estadoInicialDo(c);
    const reg2 = acertou => M.registrar(e2, { acertou, modo: 'multipla', direcao: IDA, resposta: 'x' });
    reg2(false); reg2(true);
    ok(e2.etapa !== 'dominado', tipo + ': depois do erro, um acerto ainda não fecha');
    reg2(true);
    ok(e2.etapa === 'dominado' && M.filaDe(e2) === 'fora', tipo + ': dois seguidos depois do erro fecham de vez');
  }
}
const q = CARDS.find(c => c.tipo === 'compreensao' && c.de);
const longe = new Date(Date.now() - 3 * 864e5).toISOString();
const todos = Object.fromEntries(q.requerTodas.map(id => [id, { etapa: 'dominado', dominadoEm: longe, vistas: 3 }]));
ok(M.liberado(q, todos, Date.now(), {}), 'a compreensão destrava com as palavras da frase dominadas');
delete todos[q.requerTodas[0]];
ok(!M.liberado(q, todos, Date.now(), {}), 'sem uma delas, não');
const expressao = CARDS.find(c => c.tipo === 'heranca' && c.familia === 'expressao');
const derivado = CARDS.find(c => c.tipo === 'heranca' && c.familia === 'derivado');
ok(M.liberado(expressao, {}, Date.now(), {}) && !M.liberado(derivado, {}, Date.now(), {}), 'a expressão vem desde o começo; a palavra derivada espera o lema');

/* ═══════════ 6f. análise: o verbo, a concordância, a regência (LATIM.md §15) ═══════════ */
secao('os cards de análise');
for (const familia of ['verbo', 'concordancia', 'regencia']) {
  const daFamilia = CARDS.filter(c => c.tipo === 'analise' && c.familia === familia);
  ok(daFamilia.length >= 10, 'há cards de análise do ' + familia + ' (' + daFamilia.length + ')');
  const c = daFamilia[0];
  const e = M.estadoInicialDo(c);
  const f = M.faseDe(e);
  ok(f.modo === 'multipla' && f.direcao === IDA && M.resposta(c, f.direcao) === c.pt, familia + ': de escolher, com a resposta no card');
  const alt = M.alternativas(c, f.direcao, CARDS, {});
  ok(alt.length === c.distratores.length + 1 && alt.includes(c.pt), familia + ': as alternativas são a certa e as erradas do card');
  ok(daFamilia.every(x => !x.distratores.some(d => M.conferir(x, d, IDA) === 'certo')), familia + ': nenhuma errada é aceita');
  /* uma vez só (o Gere, 04/11/2026): o acerto de primeira fecha de vez; depois de um erro, dois seguidos */
  M.registrar(e, { acertou: true, modo: 'multipla', direcao: IDA, resposta: 'x' });
  ok(e.etapa === 'dominado' && !e.voltaEm && M.filaDe(e) === 'fora' && M.encerrado(c.id, e), familia + ': o acerto de primeira fecha de vez');
  const e2 = M.estadoInicialDo(c);
  const reg2 = acertou => M.registrar(e2, { acertou, modo: 'multipla', direcao: IDA, resposta: 'x' });
  reg2(false); reg2(true);
  ok(e2.etapa !== 'dominado', familia + ': depois do erro, um acerto ainda não fecha');
  reg2(true);
  ok(e2.etapa === 'dominado' && M.filaDe(e2) === 'fora', familia + ': dois seguidos depois do erro fecham de vez');
}
const regencia = CARDS.find(c => c.tipo === 'analise' && c.familia === 'regencia');
ok(!M.liberado(regencia, {}, Date.now(), {}), 'a regência espera o card do verbo');

/* ═══════════ 7. transparência e desafio ═══════════ */
secao('transparência e desafio');
M.usarTransparencias([{ id: 'x1', tipo: 'palavra', transp: 'parecida' }, { id: 'x2', tipo: 'palavra', transp: 'total' }]);
M.usarExtras({});
ok(M.transparenteTotal('x1') && M.transparenteTotal('x2'), 'no modo trilhas a «parecida» conta como total');
ok(M.escolherDesafio(CARDS, {}, {}) === null, 'não há card desafio');

/* ═══════════ 7b. novo × revisão ═══════════ */
secao('novo × revisão: a chance persegue a meta da ida');
const estadosIda = k => { const e = {}; for (let i = 0; i < k; i++) e['x' + i] = { etapa: 'escrita', vistas: 1 }; return e; };
const alvo = { esPt: 30 };
const c0 = M.chanceDoNovo(estadosIda(0), alvo), c25 = M.chanceDoNovo(estadosIda(25), alvo),
  c30 = M.chanceDoNovo(estadosIda(30), alvo), c40 = M.chanceDoNovo(estadosIda(40), alvo), c80 = M.chanceDoNovo(estadosIda(80), alvo);
ok(c0 === M.CHANCE_MAXIMA, 'longe da meta, a chance para no teto (' + c0 + ')');
ok(c25 > c30 && c30 > c40, 'cai à medida que a ida enche (' + [c25, c30, c40].join(' > ') + ')');
ok(c30 === M.CHANCE_NA_META, 'na meta, ' + M.CHANCE_NA_META);
ok(c80 === M.CHANCE_MINIMA, 'muito acima da meta, para no piso (' + c80 + ')');
ok(M.chanceDaIda(estadosIda(5)) === 1, 'sem volta, toda revisão de card em estudo é da ida');
const ctx = (temIneditos, livres, vencidos) => ({ estados: estadosIda(30), alvo, temIneditos, livres, vencidos: vencidos || 0, desdeDominado: 99, respostas: 100 });
ok(M.chanceDoProximoNovo(ctx(true, { esPt: [], ptEs: [] })) === 1, 'sem revisão pronta, vem card novo');
ok(M.chanceDoProximoNovo(ctx(false, { esPt: ['x1'], ptEs: [] })) === 0, 'sem inédito, vem revisão');
ok(M.chanceDoProximoNovo(ctx(true, { esPt: [], ptEs: [] }, 3)) === M.CHANCE_NA_META, 'o dominado vencido é revisão pronta');

/* ═══════════ 8. os textos ═══════════ */
secao('os textos e os trechos');
const pastaTextos = path.join(RAIZ, 'fonte', 'textos', 'la');
const textos = fs.readdirSync(pastaTextos).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(pastaTextos, f), 'utf8')));
ok(textos.length >= 1, 'há textos latinos');
for (const txt of textos) {
  ok(typeof txt.fila !== 'number', txt.id + ': sem «fila» (no modo trilhas não há texto automático)');
  const cardsDe = d => (Array.isArray(d.partes) ? d.partes : [d]).map(x => x.card).filter(Boolean);
  /* o card é o trecho, a frase, que pode atravessar o verso (LATIM.md §3.3, cortes.py) */
  const linhas = (txt.blocos || []).flat();
  const trechos = CARDS.filter(c => c.tipo === 'frase' && c.texto === txt.id).sort((a, b) => a.linha - b.linha);
  ok(trechos.map(c => c.linha).join() === trechos.map((c, k) => k + 1).join(), txt.id + ': os trechos em ordem, de 1 a ' + trechos.length);
  const cobertos = new Set();
  for (const tr of trechos) {
    const [a, z] = tr.versos || [0, 0];
    for (let k = a; k <= z; k++) cobertos.add(k);
    const pede = new Set(linhas.slice(a - 1, z).flatMap(l => (l.p || []).filter(x => x[1]).flatMap(x => cardsDe(txt.destinos[x[1]]))));
    /* o trecho pede lemas dos versos dele e, depois deles, as flexões (LATIM.md §3.8) */
    const req = (tr.requerTodas || []);
    ok(req.filter(id => (PORID.get(id) || {}).tipo !== 'flexao').every(id => pede.has(id)), tr.id + ': as palavras do trecho estão nos versos ' + a + '–' + z);
    ok(req.filter(id => (PORID.get(id) || {}).tipo === 'flexao').every(id => pede.has(PORID.get(id).lema)), tr.id + ': as flexões são de lemas do trecho');
    ok(tr.palavras.filter(x => !x.w.startsWith('-')).length <= 12, tr.id + ': até 12 palavras');
    const fecha = /[.;:?!]$/.test(tr.la) || z === linhas.length || tr.la.split(' ').length >= 3;
    ok(fecha, tr.id + ': o trecho não é um fiapo');
  }
  ok(linhas.every((l, i) => cobertos.has(i + 1)), txt.id + ': todo verso está em algum trecho');
}

/* o corte novo (04/11/2026): «Arma virumque cano, Troiæ qui primus ab oris» deixou de ser card */
ok(!CARDS.some(c => c.tipo === 'frase' && c.la === 'Arma virumque cano, Troiae qui primus ab oris'), 'o primeiro verso da Eneida não é mais card sozinho');
ok(CARDS.some(c => c.tipo === 'frase' && c.texto && c.la.includes(' … ')), 'há trechos com «…» no que fica de fora');

/* a pergunta sobre o trecho (§16, D41): depois do trecho, uma vez só */
M.usarTransparencias(CARDS);
const doVerso = CARDS.filter(c => c.tipo === 'compreensao' && /^la-t/.test(c.de || ''));
ok(doVerso.length >= 20, 'há perguntas sobre os trechos (' + doVerso.length + ')');
ok(doVerso.every(c => (PORID.get(c.de) || {}).la === c.la), 'a pergunta mostra o trecho como ele é');
ok(doVerso.every(c => M.ehCompreensaoDoVerso(c.id)) && !M.ehCompreensaoDoVerso('la-q001'), 'o motor separa a pergunta do trecho da compreensão das primeiras frases');
{
  const c = doVerso[0];
  const e = M.estadoInicialDo(c);
  M.registrar(e, { acertou: true, modo: 'multipla', direcao: IDA, resposta: 'x' });
  ok(e.etapa === 'dominado' && M.filaDe(e) === 'fora', 'a pergunta do trecho: o acerto de primeira fecha de vez');
}

M.usarModo('livre');
ok(!M.soIda(), 'de volta ao modo livre');

console.log('\n  ' + feitas + ' conferências, ' + (falhas ? falhas + ' falharam' : 'todas passaram'));
process.exit(falhas ? 1 : 0);
