#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/simular-latim.js — simula um aluno no curso de latim com o motor real
   (js/motor.js) e os cards reais (data/cards-la.json), e mede que tipo de
   pergunta aparece na tela (cards/LATIM.md §13, 29/10/2026).

   O simular-fila.js mede o ritmo com inéditos de mentira; este segue a ordem do
   modo trilhas, copiada de public/cards/js/app.js: ordenarTrilhas (texto zero,
   textos escolhidos, frases presas, flexões da frase de uso perto e das tabelas,
   cards de forma depois do verso, conceitos antes de quem os pede),
   proximoNovo (quatro frases seguidas, sempre um só contraste e um conceito em
   jogo) e escolherProximoId (nunca três de gramática seguidos). A cópia é
   aproximada (sem os textos que vêm adiante nem o conjunto do contraste): serve
   para comparar, não para prever o dia exato. Mudou a escolha no app, mudar aqui.

   Uso:  node fonte/simular-latim.js [textos,separados,por,vírgula] [--dias=30]
           [--por-dia=60] [--semente=11] [--resumo]
         --resumo  uma linha JSON no fim (gramática, palavra e frase por faixa,
                   sequências de gramática, primeiro verso)

   O aluno acerta uns 85% (na estreia, 60%), em duas sessões por dia.
   ──────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const arg = (nome, padrao) => {
  const a = process.argv.find(x => x.startsWith('--' + nome + '='));
  return a ? Number(a.split('=')[1]) : padrao;
};
const ESCOLHA = (process.argv.slice(2).find(x => !x.startsWith('--')) || 'oracoes/pater-noster').split(',');
const DIAS = arg('dias', 30), POR_DIA = arg('por-dia', 60);
const RESUMO = process.argv.includes('--resumo');

/* sorteio com semente (mulberry32), como no simular-fila.js */
let semente = arg('semente', 11);
Math.random = function () {
  semente = (semente + 0x6D2B79F5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* o relógio de mentira, depois da mudança das terminações (Motor.DIA_DAS_TERMINACOES) */
let AGORA = Date.UTC(2026, 10, 2, 11, 0, 0);
const DataReal = Date;
class DataFalsa extends DataReal {
  constructor(...a) { if (a.length === 0) super(AGORA); else super(...a); }
  static now() { return AGORA; }
}
const janela = {};
new Function('window', 'Date', fs.readFileSync(path.join(RAIZ, 'js', 'motor.js'), 'utf8'))(janela, DataFalsa);
const M = janela.Motor;
M.usarBaralho('es', 'pt');   // as filas se chamam esPt e ptEs em todo curso
M.usarModo('trilhas');

const CARDS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'cards-la.json'), 'utf8')).cards;
const TX = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'textos-la.json'), 'utf8'));
const TEXTOS = Array.isArray(TX) ? TX : (TX.textos || Object.values(TX));
M.usarTransparencias(CARDS);
M.usarExtras({ uid: 'aluno-sim' });

const PORID = new Map(CARDS.map(c => [c.id, c]));
const IDX = new Map(CARDS.map((c, i) => [c.id, i]));
const tipo = id => (PORID.get(id) || {}).tipo;
const TZ = CARDS.filter(c => c.tipo === 'frase' && Array.isArray(c.requerTodas) && !c.requerTodas.length);
const TRECHOS = CARDS.filter(c => c.tipo === 'frase' && c.texto).sort((a, b) => (a.linha || 0) - (b.linha || 0));
const chave = w => String(w || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/j/g, 'i').replace(/v/g, 'u').replace(/æ/g, 'ae').replace(/œ/g, 'oe');
const FLEXAO = new Map(CARDS.filter(c => c.tipo === 'flexao').map(c => [chave(c.la) + '|' + c.lema, c.id]));
const flexaoDe = x => (x && x.c ? FLEXAO.get(chave(x.w) + '|' + x.c) : undefined);
const DE_LEITURA = new Set(CARDS.filter(c => c.tipo === 'frase' && (c.texto || !M.requeridas(c).length))
  .flatMap(c => (c.palavras || []).map(flexaoDe).filter(Boolean)));
const DE_USO = new Map();
CARDS.forEach(c => {
  if (c.tipo !== 'frase' || c.texto || !M.requeridas(c).length) return;
  M.requeridas(c).forEach(r => { if (tipo(r) === 'flexao') (DE_USO.get(r) || DE_USO.set(r, []).get(r)).push(c); });
});
const EM_FRASE = new Set(CARDS.filter(c => c.tipo === 'frase').flatMap(c => M.requeridas(c)).filter(r => tipo(r) === 'flexao'));
const ativos = TEXTOS.filter(t => ESCOLHA.includes(t.id));
if (ativos.length !== ESCOLHA.length) { console.error('texto que não existe: ' + ESCOLHA.join(', ')); process.exit(1); }
const ativosIds = new Set(ativos.map(t => t.id));
const doTexto = new Set(ativos.flatMap(t => M.requeridas(t)));

const p = { cards: {}, filaEsPt: [], filaPtEs: [], dominados: [], respostas: 0, diario: {}, arquivados: {} };
const estreias = [];
let desdeDominado = 99, ultimos = [];
const filaDe = k => (k === 'esPt' ? p.filaEsPt : p.filaPtEs);
const visto = id => !!(p.cards[id] && p.cards[id].vistas);
const ehPresa = id => ['frase', 'contraste'].includes(tipo(id)) && M.requeridas(PORID.get(id)).length > 0;
const FRASES_DA_PALAVRA = new Map();
CARDS.forEach(c => (c.tipo === 'frase' ? c.palavras || [] : []).forEach(x => {
  if (x.c) (FRASES_DA_PALAVRA.get(x.c) || FRASES_DA_PALAVRA.set(x.c, []).get(x.c)).push(c.id);
}));
const DE_GRAMATICA = new Set(['conceito', 'forma', 'flexao', 'contraste', 'analise']);
/* a análise da frase (LATIM.md §15: o verbo, a concordância) e a pergunta sobre o trecho (§16,
   D41) andam com os cards de forma */
const comAForma = id => tipo(id) === 'forma' || (tipo(id) === 'analise' && PORID.get(id).familia !== 'regencia') ||
  M.ehCompreensaoDoVerso(id);
const ehDeGramatica = id => DE_GRAMATICA.has(tipo(id));

function elegivel(id) {
  const c = PORID.get(id);
  if (!c || visto(id)) return false;
  if (c.tipo === 'palavra') return !M.transparenteTotal(id);
  if (c.tipo === 'flexao') return (visto(c.lema) || M.transparenteTotal(c.lema)) && !M.adormecido(id, p.cards);
  return c.tipo === 'frase' && !M.requeridas(c).length;
}

function intercalar(muitos, poucos, cada) {
  const s = []; let i = 0, j = 0;
  while (i < muitos.length || j < poucos.length) {
    for (let k = 0; k < cada && i < muitos.length; k++) s.push(muitos[i++]);
    if (j < poucos.length) s.push(poucos[j++]);
  }
  return s;
}
const naVez = (muitos, poucos, desde, cada) => {
  const vez = Math.max(0, cada - desde);
  return muitos.slice(0, vez).concat([poucos[0]], intercalar(muitos.slice(vez), poucos.slice(1), cada));
};
const pede = id => {
  const c = PORID.get(id) || {};
  if (c.tipo !== 'palavra') return c.conceitos || [];
  if (!doTexto.has(id)) return [];
  const tr = TRECHOS.find(t => ativosIds.has(t.texto) && (t.requerTodas || []).includes(id));
  return (tr && tr.conceitos) || [];
};

/* a lista de inéditos na ordem do ordenarTrilhas */
function ordenar() {
  const postos = new Set();
  const pega = (arr, id) => { if (!postos.has(id)) { postos.add(id); arr.push(id); } };
  const presas = CARDS.filter(c => ehPresa(c.id) && c.tipo !== 'contraste' && !visto(c.id) && (!c.texto || ativosIds.has(c.texto)) &&
    M.liberado(c, p.cards, AGORA, p.arquivados)).map(c => c.id);
  const quando = id => M.venceuEm(PORID.get(id), p.cards, p.arquivados);
  presas.sort((a, b) => quando(b) - quando(a));
  presas.forEach(id => postos.add(id));
  const frescas = presas.filter(id => tipo(id) !== 'contraste' && AGORA - quando(id) < 864e5).slice(0, 2);
  const antigas = presas.filter(id => frescas.indexOf(id) < 0);
  const dosTextos = [];
  for (const id of M.palavrasDosTextos(ativos, p.cards, p.arquivados)) if (elegivel(id)) pega(dosTextos, id);
  const zero = [];
  for (const f of TZ) {
    if (elegivel(f.id)) pega(zero, f.id);
    (f.palavras || []).forEach(x => { if (x.c && elegivel(x.c)) pega(zero, x.c); });
    (f.palavras || []).forEach(x => { const fx = flexaoDe(x); if (fx && elegivel(fx)) pega(zero, fx); });
  }
  const estreiaDoLema = id => (p.cards[PORID.get(id).lema] || {}).estreouNa || 0;
  const deTabela = CARDS.filter(c => c.tipo === 'flexao' && !postos.has(c.id) && elegivel(c.id)).map(c => c.id)
    .sort((a, b) => estreiaDoLema(a) - estreiaDoLema(b) || IDX.get(a) - IDX.get(b));
  const perto = id => (DE_USO.get(id) || []).some(f => M.requeridas(f)
    .every(r => tipo(r) !== 'palavra' || M.sabidaEm(r, p.cards, p.arquivados) !== Infinity));
  const doUso = deTabela.filter(perto), soDeTabela = deTabela.filter(id => !EM_FRASE.has(id));
  const todas = estreias.filter(id => tipo(id) !== 'conceito').slice().reverse();
  const semForma = todas.filter(id => !comAForma(id));
  const desde = teste => { let n = 0; while (n < semForma.length && !teste(semForma[n])) n++; return n; };
  let fila = zero.slice();
  if (dosTextos.length) fila = naVez(fila, dosTextos, desde(id => doTexto.has(id)), 2);
  if (antigas.length) fila = naVez(fila, antigas, desde(ehPresa), 2);
  if (doUso.length) fila = naVez(fila, doUso, desde(id => DE_USO.has(id) && !DE_LEITURA.has(id)), 3);
  if (soDeTabela.length) fila = naVez(fila, soDeTabela, desde(id => tipo(id) === 'flexao' && !EM_FRASE.has(id)), 9);
  /* a regência (§15), uma a cada cinco vagas, depois do verbo sabido */
  const ehRegencia = id => tipo(id) === 'analise' && PORID.get(id).familia === 'regencia';
  const verboVisto = c => visto(c.lema) || (FRASES_DA_PALAVRA.get(c.lema) || []).some(visto);
  const regencias = CARDS.filter(c => ehRegencia(c.id) && !visto(c.id) && verboVisto(c) && M.liberado(c, p.cards, AGORA, p.arquivados)).map(c => c.id);
  if (regencias.length) fila = naVez(fila, regencias, desde(ehRegencia), 5);
  fila = frescas.concat(fila);
  const pronta = c => (c.tipo === 'forma' ? M.formaPronta(c, p.cards, p.arquivados) : visto(c.de));
  const verboAntes = id => (tipo(id) === 'analise' && PORID.get(id).familia === 'verbo' ? 0 : 1);
  const formas = CARDS.filter(c => comAForma(c.id) && !visto(c.id) && pronta(c) &&
    (!(PORID.get(c.de) || {}).texto || ativosIds.has(PORID.get(c.de).texto))).map(c => c.id)
    .sort((a, b) => ((p.cards[PORID.get(b).de] || {}).estreouNa || 0) - ((p.cards[PORID.get(a).de] || {}).estreouNa || 0) ||
      verboAntes(a) - verboAntes(b) || IDX.get(a) - IDX.get(b));
  if (formas.length) {
    let seguidas = 0;
    while (seguidas < todas.length && comAForma(todas[seguidas])) seguidas++;
    const s = []; let f = 0, i = 0, vez = Math.max(0, 2 - seguidas);
    while (f < formas.length) {
      for (let k = 0; k < vez && f < formas.length; k++) s.push(formas[f++]);
      if (f < formas.length && i < fila.length) s.push(fila[i++]);
      vez = 2;
    }
    fila = s.concat(fila.slice(i));
  }
  const saida = [], cpostos = new Set();
  for (const id of fila) {
    pede(id).forEach(g => { if (!visto(g) && !cpostos.has(g)) { cpostos.add(g); saida.push(g); } });
    saida.push(id);
  }
  CARDS.forEach(c => { if (c.tipo === 'conceito' && !visto(c.id) && !cpostos.has(c.id)) saida.push(c.id); });
  return saida;
}

const doisDeGramatica = () => ultimos.length === 2 && ultimos.every(ehDeGramatica);

function proximoNovo(lista) {
  const recentes = estreias.filter(id => !comAForma(id)).slice(-4);
  if (recentes.length === 4 && recentes.every(id => tipo(id) !== 'palavra')) {
    const i = lista.findIndex(id => tipo(id) === 'palavra');
    if (i >= 0) return lista[i];
  }
  const k = contrasteDaVez();
  if (k) return k;
  let id = null;
  if (!Object.keys(p.cards).some(x => tipo(x) === 'conceito' && p.cards[x].vistas && p.cards[x].etapa !== 'dominado')) {
    id = lista.find(x => tipo(x) === 'conceito');
  }
  id = id || lista[0];
  if (doisDeGramatica() && ehDeGramatica(id)) id = lista.find(x => !ehDeGramatica(x)) || id;
  return id;
}

/* sempre exatamente um contraste em jogo: o que tem menos requisitos por saber, o mais fácil no
   empate, sem esperar as palavras (o contrasteDaVez do app, sem o conjunto anterior) */
const NIVEL_K = { A1: 0, A2: 1, B1: 2 };
function contrasteDaVez() {
  let melhor = null, chave = null;
  CARDS.forEach((c, i) => {
    if (melhor === false || c.tipo !== 'contraste') return;
    const e = p.cards[c.id];
    if (e && e.vistas) { if (e.etapa !== 'dominado') melhor = false; return; }
    const faltam = M.requeridas(c).filter(r => String(r)[0] === '+' || M.sabidaEm(r, p.cards, p.arquivados) === Infinity).length;
    const k = [faltam, NIVEL_K[c.nivel] || 0, i];
    if (!chave || k[0] < chave[0] || (k[0] === chave[0] && (k[1] < chave[1] || (k[1] === chave[1] && k[2] < chave[2])))) { melhor = c.id; chave = k; }
  });
  return melhor || null;
}

function dominadoMaisProximo(agora, serve) {
  return M.dominadoDaVez(p.dominados, id => p.cards[id], agora, serve);
}

function escolher() {
  const agora = new DataFalsa().toISOString();
  const lista = ordenar();
  const livre = id => M.podeVoltar(p.cards[id], p.respostas);
  const c = {
    agora, estados: p.cards, arquivados: p.arquivados, alvo: M.alvoDaFila(p.diario), respostas: p.respostas,
    temIneditos: lista.length > 0 || !!contrasteDaVez(), livres: { esPt: p.filaEsPt.filter(livre), ptEs: p.filaPtEs.filter(livre) },
    vencidos: p.dominados.filter(id => !M.esperando(p.cards[id], agora)).length,
    pesoDosVencidos: M.pesoDosVencidos(p.dominados, id => p.cards[id], agora), desdeDominado
  };
  const e = M.escolherProximo(c);
  const outroTipo = doisDeGramatica() ? id => !ehDeGramatica(id) : null;
  /* a revisão de outro tipo que está pronta (D30), tirada da fila */
  const revisaoDeOutroTipo = () => {
    for (const k of ['esPt', 'ptEs']) {
      const outros = c.livres[k].filter(outroTipo);
      const j = M.escolherNaFila(outros, p.cards, p.respostas);
      if (j >= 0) return filaDe(k).splice(filaDe(k).indexOf(outros[j]), 1)[0];
    }
    const v = dominadoMaisProximo(agora, outroTipo);
    return v !== null ? p.dominados.splice(v, 1)[0] : null;
  };
  if (e && e.grupo === 'novo' && (lista.length || contrasteDaVez())) {
    const id = proximoNovo(lista);
    return (outroTipo && ehDeGramatica(id) && revisaoDeOutroTipo()) || id;
  }
  if (outroTipo && e) {
    const escolhido = e.fila === 'dominados' ? p.dominados[dominadoMaisProximo(agora)] : e.id;
    if (escolhido && ehDeGramatica(escolhido)) {
      const outro = revisaoDeOutroTipo() || lista.find(x => !ehDeGramatica(x));
      if (outro) return outro;
    }
  }
  if (e && e.fila === 'dominados') return p.dominados.splice(dominadoMaisProximo(agora), 1)[0];
  if (e && e.fila) return filaDe(e.fila).splice(filaDe(e.fila).indexOf(e.id), 1)[0];
  const v = dominadoMaisProximo(agora);
  if (v !== null) return p.dominados.splice(v, 1)[0];
  const q = dominadoMaisProximo(null);
  if (q !== null) return p.dominados.splice(q, 1)[0];
  let melhor = null;
  ['esPt', 'ptEs'].forEach(k => filaDe(k).forEach(id => {
    const d = (p.cards[id].naFila || {}).desde;
    if (melhor === null || d < melhor.desde) melhor = { k, id, desde: d };
  }));
  return melhor ? filaDe(melhor.k).splice(filaDe(melhor.k).indexOf(melhor.id), 1)[0] : null;
}

/* o que a tela pergunta */
function categoria(c) {
  if (c.tipo === 'palavra') return 'palavra (o sentido do dicionário)';
  if (c.tipo === 'frase') return !M.requeridas(c).length ? 'frase: primeira frase' : c.texto ? 'frase: verso do texto' : 'frase: frase de uso';
  if (c.tipo === 'contraste') return 'contraste (qual frase latina?)';
  if (c.tipo === 'conceito') return (c.familia === 'caso' || c.familia === 'construcao') ? 'caso: conceito' : 'verbo: conceito';
  if (c.tipo === 'forma') return c.familia === 'caso' ? 'caso: forma na frase' : 'verbo: tempo e modo na frase';
  if (c.tipo === 'flexao') return c.familia === 'caso' ? 'caso: flexão sozinha' : 'verbo: flexão com o sentido';
  if (c.tipo === 'analise') return 'análise: ' + c.familia;
  if (c.tipo === 'compreensao') return M.ehCompreensaoDoVerso(c.id) ? 'compreensão: pergunta do trecho' : 'compreensão';
  return c.tipo;
}
const ORDEM = ['palavra (o sentido do dicionário)', 'frase: primeira frase', 'frase: verso do texto', 'frase: frase de uso',
  'caso: conceito', 'caso: forma na frase', 'caso: flexão sozinha', 'contraste (qual frase latina?)',
  'verbo: conceito', 'verbo: tempo e modo na frase', 'verbo: flexão com o sentido',
  'análise: verbo', 'análise: concordancia', 'análise: regencia', 'compreensão: pergunta do trecho'];
const ehGram = k => k.startsWith('caso') || k.startsWith('verbo') || k.startsWith('contraste') || k.startsWith('análise');
const FAIXAS = [[1, 100], [101, 300], [301, 600], [601, 1000], [1001, 1800], [1801, 3000], [3001, Infinity]];
const contagem = FAIXAS.map(() => ({}));
const sequencia = [];
let primeiroVerso = null;

const ACERTO = { 'multipla': 0.92, 'escrita': 0.82, 'inversa-multipla': 0.88, 'inversa-escrita': 0.72, 'dominado': 0.93 };
function responder(id) {
  const card = PORID.get(id);
  let est = p.cards[id];
  const estreia = !est;
  if (estreia) { est = M.estadoInicialDo(card); est.estreouNa = p.respostas; p.cards[id] = est; estreias.push(id); }
  const f = M.faseDe(est);
  const r = { acertou: Math.random() < (estreia ? 0.6 : (ACERTO[est.etapa] || 0.9)), modo: f.modo, direcao: f.direcao };
  M.registrar(est, r);
  p.respostas++;
  const dia = new DataReal(AGORA).toISOString().slice(0, 10);
  const g = p.diario[dia] || (p.diario[dia] = { n: 0, ok: 0 });
  g.n++; if (r.acertou) g.ok++;
  const k = categoria(card);
  sequencia.push(k);
  const b = FAIXAS.findIndex(([a, z]) => p.respostas >= a && p.respostas <= z);
  contagem[b][k] = (contagem[b][k] || 0) + 1;
  if (primeiroVerso === null && card.tipo === 'frase' && card.texto) primeiroVerso = p.respostas;
  const fila = M.filaDe(est);
  if (fila === 'dominados') { delete est.naFila; if (p.dominados.indexOf(id) < 0) p.dominados.push(id); }
  else if (fila === 'esPt' || fila === 'ptEs') { est.naFila = { desde: p.respostas, distancia: M.distanciaNaFila(est, r) }; filaDe(fila).push(id); }
}

const inicio = AGORA;
const SESSOES = [[8, Math.ceil(POR_DIA / 2)], [21, Math.floor(POR_DIA / 2)]];
for (let d = 0; d < DIAS; d++) {
  for (const [hora, quantas] of SESSOES) {
    AGORA = inicio + d * 864e5 + (hora - 11) * 36e5;
    for (let k = 0; k < quantas; k++) {
      AGORA += 20000;
      const id = escolher();
      if (!id) break;
      const dominado = p.cards[id] && p.cards[id].etapa === 'dominado';
      responder(id);
      desdeDominado = dominado ? 0 : desdeDominado + 1;
      ultimos = ultimos.concat([id]).slice(-2);
    }
  }
}

const pct = (x, n) => (n ? Math.round(100 * x / n) : 0);
const usadas = FAIXAS.map((_, i) => i).filter(i => Object.keys(contagem[i]).length);
const total = i => Object.values(contagem[i]).reduce((s, x) => s + x, 0);
const parte = (i, teste) => pct(Object.entries(contagem[i]).filter(([k]) => teste(k)).reduce((s, [, x]) => s + x, 0), total(i));
let run = 0, maior = 0, emSeq = 0;
const fecha = () => { if (run >= 3) emSeq += run; run = 0; };
sequencia.forEach(k => { if (ehGram(k)) { run++; maior = Math.max(maior, run); } else fecha(); });
fecha();
if (RESUMO) {
  console.log(JSON.stringify({ gram: usadas.map(i => parte(i, ehGram)), palavra: usadas.map(i => parte(i, k => k.startsWith('palavra'))),
    frase: usadas.map(i => parte(i, k => k.startsWith('frase'))), seq3: pct(emSeq, sequencia.length), maior, verso: primeiroVerso }));
} else {
  console.log('textos: ' + ESCOLHA.join(', ') + ' · ' + POR_DIA + ' respostas por dia · ' + DIAS + ' dias · ' + p.respostas + ' respostas');
  console.log(''.padEnd(36) + usadas.map(i => (FAIXAS[i][0] + '–' + (FAIXAS[i][1] === Infinity ? 'fim' : FAIXAS[i][1])).padStart(11)).join(''));
  for (const k of ORDEM) console.log(k.padEnd(36) + usadas.map(i => (parte(i, x => x === k) + '%').padStart(11)).join(''));
  console.log('= gramática (caso, verbo, contraste)'.padEnd(36) + usadas.map(i => (parte(i, ehGram) + '%').padStart(11)).join(''));
  console.log('dentro de 3 ou mais de gramática seguidos: ' + pct(emSeq, sequencia.length) + '% das respostas; a maior sequência: ' + maior);
  console.log('o primeiro verso do texto: resposta ' + primeiroVerso + (primeiroVerso ? ' (dia ' + Math.ceil(primeiroVerso / POR_DIA) + ')' : ''));
}
