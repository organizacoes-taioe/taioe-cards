#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/simular-fila.js — simula a escolha do próximo card com o
   motor real (js/motor.js) e um aluno de mentira, para decidir mudança
   de ritmo (meta da ida, chance de card novo, filas) com números.

   Repete o que o app faz em escolherProximoId (public/cards/js/app.js):
   Motor.escolherProximo decide entre card novo e revisão, e a revisão sai
   do dominado vencido, do atrasado ou do sorteio entre ida e volta. Os
   inéditos não acabam; textos, frases e desafios ficam de fora.

   Uso:  node fonte/simular-fila.js [--dias=60] [--semente=11] [--forte] [--latim] [--todos]
                                    [--pausa=7] [--antigo]
         --forte   o aluno acerta ~95% (sem ele, ~85%)
         --latim   o modo trilhas (só a ida)
         --todos   uma linha por dia (sem ele, os três primeiros e de dez em dez)
         --pausa   dias sem estudar a partir do dia 31 (forma fila de vencidos)
         --antigo  a regra dos dominados até 31/10/2026: degrau de 7 dias de
                   fato e o vencido de data mais antiga primeiro, sem pesos

   Cada linha: cards novos no dia; a chance média de card novo (a do painel)
   e a fração real; a ida, contra a meta; a volta; as revisões de dominados.
   No fim, quantos dias da estreia até fechar a ida e até dominar.
   ──────────────────────────────────────────────────────────────── */
'use strict';
const fs = require('fs');
const path = require('path');

const arg = (nome, padrao) => {
  const a = process.argv.find(x => x.startsWith('--' + nome + '='));
  return a ? Number(a.split('=')[1]) : padrao;
};
const tem = nome => process.argv.includes('--' + nome);
const DIAS = arg('dias', 60);
const FORTE = tem('forte'), LATIM = tem('latim'), TODOS = tem('todos');
const PAUSA = arg('pausa', 0), ANTIGO = tem('antigo');

/* sorteio com semente (mulberry32): o mesmo resultado a cada rodada */
let semente = arg('semente', 11);
Math.random = function () {
  semente = (semente + 0x6D2B79F5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* relógio de mentira: o motor lê a hora pelo Date */
let AGORA = Date.UTC(2026, 9, 1, 11, 0, 0);
const DataReal = Date;
class DataFalsa extends DataReal {
  constructor(...a) { if (a.length === 0) super(AGORA); else super(...a); }
  static now() { return AGORA; }
}
const janela = {};
new Function('window', 'Date', fs.readFileSync(path.join(__dirname, '..', 'js', 'motor.js'), 'utf8'))(janela, DataFalsa);
const M = janela.Motor;
M.usarBaralho('es', 'pt');
if (LATIM) M.usarModo('trilhas');
if (ANTIGO) M.DIAS_DOMINADO[1] = 7;   // o mesmo array de dentro do motor

/* a chance de acerto em cada etapa; a estreia é um chute meio informado */
const ACERTO = FORTE
  ? { 'multipla': 0.97, 'escrita': 0.93, 'inversa-multipla': 0.95, 'inversa-escrita': 0.88, 'dominado': 0.96 }
  : { 'multipla': 0.92, 'escrita': 0.82, 'inversa-multipla': 0.88, 'inversa-escrita': 0.72, 'dominado': 0.93 };
const ACERTO_NA_ESTREIA = FORTE ? 0.7 : 0.55;

const p = { cards: {}, filaEsPt: [], filaPtEs: [], dominados: [], respostas: 0, diario: {}, arquivados: {} };
let inedito = 1, desdeDominado = 99, ultimaChance = 0;
const filaDe = k => (k === 'esPt' ? p.filaEsPt : p.filaPtEs);
const tirar = (k, id) => filaDe(k).splice(filaDe(k).indexOf(id), 1)[0];

function dominadoMaisProximo(agora) {
  if (!ANTIGO) return M.dominadoDaVez(p.dominados, id => p.cards[id], agora);
  return M.dominadoDaVez(p.dominados, id => p.cards[id], null,
    agora ? (id => !M.esperando(p.cards[id], agora)) : null);
}

function escolher() {
  const agora = new DataFalsa().toISOString();
  const livre = id => M.podeVoltar(p.cards[id], p.respostas);
  const c = {
    estados: p.cards, arquivados: p.arquivados, alvo: M.alvoDaFila(p.diario), respostas: p.respostas,
    temIneditos: true, livres: { esPt: p.filaEsPt.filter(livre), ptEs: p.filaPtEs.filter(livre) },
    vencidos: p.dominados.filter(id => !M.esperando(p.cards[id], agora)).length,
    pesoDosVencidos: ANTIGO ? undefined : M.pesoDosVencidos(p.dominados, id => p.cards[id], agora), desdeDominado
  };
  ultimaChance = M.chanceDoProximoNovo(c);
  const e = M.escolherProximo(c);
  if (!e) return p.dominados.splice(dominadoMaisProximo(null), 1)[0];
  if (e.grupo === 'novo') return 'n' + (inedito++);
  if (e.fila === 'dominados') return p.dominados.splice(dominadoMaisProximo(agora), 1)[0];
  return tirar(e.fila, e.id);
}

/* o atraso de cada revisão de dominado, por degrau: no período todo e nos dez
   dias depois da pausa */
const ATRASOS = { todo: M.DIAS_DOMINADO.map(() => []), depois: M.DIAS_DOMINADO.map(() => []) };
let depoisDaPausa = false;
function anotarAtraso(est) {
  const i = Math.min(est.revisoes || 0, M.DIAS_DOMINADO.length - 1);
  const atraso = (AGORA - Date.parse(est.voltaEm)) / 864e5;
  ATRASOS.todo[i].push(atraso);
  if (depoisDaPausa) ATRASOS.depois[i].push(atraso);
}

/* responde o card e devolve se era estreia */
function responder(id) {
  let est = p.cards[id];
  const estreia = !est;
  if (estreia) { est = M.estadoInicialDo({ id }); est.estreouNa = p.respostas; est.nasceu = AGORA; p.cards[id] = est; }
  if (!estreia && est.etapa === 'dominado' && est.voltaEm) anotarAtraso(est);
  const f = M.faseDe(est);
  const r = { acertou: Math.random() < (estreia ? ACERTO_NA_ESTREIA : ACERTO[est.etapa]), modo: f.modo, direcao: f.direcao };
  M.registrar(est, r);
  p.respostas++;
  const dia = new DataReal(AGORA).toISOString().slice(0, 10);
  const g = p.diario[dia] || (p.diario[dia] = { n: 0, ok: 0 });
  g.n++; if (r.acertou) g.ok++;
  if (!est.fechouIda && (est.etapa === 'inversa-multipla' || (est.etapa === 'dominado' && M.soIda()))) est.fechouIda = AGORA;
  if (!est.dominou && est.etapa === 'dominado') est.dominou = AGORA;
  const fila = M.filaDe(est);
  if (fila === 'dominados') { delete est.naFila; if (p.dominados.indexOf(id) < 0) p.dominados.push(id); }
  else { est.naFila = { desde: p.respostas, distancia: M.distanciaNaFila(est, r) }; filaDe(fila).push(id); }
  return estreia;
}

/* quatro sessões de trinta respostas por dia, de vinte em vinte segundos */
const SESSOES = [[8, 30], [12, 30], [18, 30], [21, 30]];
const inicio = AGORA;
const pad = (x, n) => String(x).padStart(n);
for (let d = 0; d < DIAS; d++) {
  if (PAUSA && d >= 30 && d < 30 + PAUSA) continue;
  depoisDaPausa = PAUSA > 0 && d >= 30 + PAUSA && d < 40 + PAUSA;
  let novos = 0, n = 0, chance = 0, ida = 0, volta = 0, meta = 0, doms = 0;
  for (const [hora, quantas] of SESSOES) {
    AGORA = inicio + d * 864e5 + (hora - 11) * 36e5;
    for (let k = 0; k < quantas; k++) {
      AGORA += 20000;
      const c = M.contarDirecoes(p.cards, p.arquivados);
      ida += c.esPt; volta += c.ptEs; meta += M.alvoDaFila(p.diario).esPt;
      const id = escolher();
      chance += ultimaChance;
      const dominado = p.cards[id] && p.cards[id].etapa === 'dominado';
      if (dominado) doms++;
      if (responder(id)) novos++;
      desdeDominado = dominado ? 0 : desdeDominado + 1;
      n++;
    }
  }
  if (TODOS || d < 3 || (d + 1) % 10 === 0) {
    console.log('dia ' + pad(d + 1, 3) + '  novos ' + pad(novos, 3) + '  chance ' + pad(Math.round(100 * chance / n), 3) +
      '%  real ' + pad(Math.round(100 * novos / n), 3) + '%  ida ' + pad(Math.round(ida / n), 3) + '/' + Math.round(meta / n) +
      '  volta ' + pad(Math.round(volta / n), 3) + '  revisões de dominados ' + pad(doms, 3));
  }
}

const mediana = a => (a.length ? (a.sort((x, y) => x - y)[Math.floor(a.length / 2)] / 864e5).toFixed(1) : '-');
const ateIda = [], ateDominar = [];
for (const id in p.cards) {
  const e = p.cards[id];
  /* os do meio da simulação: nem o começo, nem os que não tiveram tempo */
  if (e.nasceu < inicio + 20 * 864e5 || e.nasceu > inicio + (DIAS - 15) * 864e5) continue;
  if (e.fechouIda) ateIda.push(e.fechouIda - e.nasceu);
  if (e.dominou) ateDominar.push(e.dominou - e.nasceu);
}
console.log('da estreia ao fim da ida: ' + mediana(ateIda) + ' dias (mediana); da estreia ao domínio: ' + mediana(ateDominar) + ' dias');

/* o atraso das revisões de dominado, em dias depois da data marcada */
const NOMES = M.DIAS_NOMINAIS.map(n => n + ' d' + (M.DIAS_DOMINADO[M.DIAS_NOMINAIS.indexOf(n)] !== n ? ' (' + M.DIAS_DOMINADO[M.DIAS_NOMINAIS.indexOf(n)] + ')' : ''));
const resumo = a => {
  if (!a.length) return '      -';
  const o = a.slice().sort((x, y) => x - y);
  const media = o.reduce((x, y) => x + y, 0) / o.length;
  return pad(o.length, 6) + '  média ' + media.toFixed(2) + '  p90 ' + o[Math.floor(o.length * 0.9)].toFixed(2) + '  máx ' + o[o.length - 1].toFixed(2);
};
for (const [chave, titulo] of [['todo', 'atraso dos dominados (dias), período todo'], ['depois', 'nos 10 dias depois da pausa']]) {
  if (chave === 'depois' && !PAUSA) continue;
  console.log(titulo + ':');
  ATRASOS[chave].forEach((a, i) => console.log('  ' + NOMES[i].padEnd(12) + resumo(a)));
}
