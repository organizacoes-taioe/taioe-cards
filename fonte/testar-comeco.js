#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/testar-comeco.js — confere o começo do app sem tédio (PLANO.md,
   seção 7): a transparência do build, e no motor os presumidos, o prior do
   nível, o nivelamento e o card desafio. Node puro, sem dependência; sai
   com 1 se alguma conferência falhar. Roda depois do build (lê o pacote
   public/cards/data/cards-es-pt.js para conferir que ele traz o «transp»
   que a regra calcula).

   Uso:  node fonte/testar-comeco.js
   ──────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');
const Transp = require('./transparencia');

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
function zerar() { M.usarTransparencias([]); M.usarExtras({}); }

const AUDIENCIAS = { es: ['pt', 'en'], en: ['pt', 'es'], pt: ['es', 'en'], fr: ['pt', 'es', 'en'] };
function baralho(l) {
  const pasta = path.join(__dirname, 'cards', l);
  return fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()
    .reduce((a, f) => a.concat(JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')).map(c => Object.assign({ idioma: l }, c))), []);
}
const ES = baralho('es');
const porEs = t => ES.find(c => c.es === t);

/* o pacote do curso como o app o recebe: o card com o «transp» do curso */
function pacote(l, a, cards) {
  return (cards || baralho(l)).map(c => {
    const x = Object.assign({}, c);
    const g = Transp.grau(c, l, a);
    if (g) x.transp = g;
    return x;
  });
}
const ESPT = pacote('es', 'pt', ES);
const PORID = {};
ESPT.forEach(c => { PORID[c.id] = c; });

/* ═══════════ 1. a transparência (build) ═══════════ */
secao('transparência');
const contagens = {};
for (const l of Object.keys(AUDIENCIAS)) {
  const cards = l === 'es' ? ES : baralho(l);
  const palavras = cards.filter(c => c.tipo === 'palavra');
  for (const a of AUDIENCIAS[l]) {
    const g = { total: 0, parecida: 0 };
    palavras.forEach(c => { const x = Transp.grau(c, l, a); if (x) g[x]++; });
    contagens[l + '-' + a] = { palavras: palavras.length, total: g.total, parecida: g.parecida };
    /* o falso amigo nunca é transparente, em curso nenhum */
    const falso = palavras.filter(c => (c.tags || []).includes('falso-amigo') && !c.transparencia && Transp.grau(c, l, a));
    ok(!falso.length, l + '-' + a + ': falso-amigo transparente: ' + falso.map(c => c.id).join(', '));
  }
}
Object.keys(contagens).forEach(k => {
  const x = contagens[k];
  console.log('    ' + k.padEnd(6) + ' ' + String(x.total).padStart(4) + ' total (' + (100 * x.total / x.palavras).toFixed(1) +
    '%)  ' + String(x.parecida).padStart(4) + ' parecida (' + (100 * x.parecida / x.palavras).toFixed(1) + '%)  de ' + x.palavras);
});
const espt = contagens['es-pt'];
ok(espt.total / espt.palavras > 0.2 && espt.total / espt.palavras < 0.32, 'es-pt: total perto dos 26% medidos');
ok(espt.parecida / espt.palavras > 0.08 && espt.parecida / espt.palavras < 0.2, 'es-pt: parecida perto dos 15% medidos');

ok(Transp.grau(porEs('la madrugada'), 'es', 'pt') === 'total', 'la madrugada é total para quem fala português');
ok(Transp.grau(porEs('la madrugada'), 'es', 'en') === null, 'la madrugada não é transparente para quem fala inglês');
ok(Transp.grau(porEs('la pared'), 'es', 'pt') === 'parecida', 'la pared é parecida para quem fala português');
ok(Transp.grau(porEs('la hormiga'), 'es', 'pt') === 'parecida', 'la hormiga é parecida para quem fala português');
ok(Transp.grau(porEs('la leche'), 'es', 'pt') === null, 'la leche não é transparente para quem fala português');
ok(Transp.pelaRegra(porEs('la leche'), 'es', 'pt').motivo === 'gênero', 'la leche fica de fora pelo gênero');
ok(Transp.pelaRegra({ tipo: 'palavra', es: 'el mapa', pt: 'a mapa', tags: [] }, 'es', 'pt').motivo === 'gênero',
  'mesma grafia com gênero diferente não é transparente');
ok(Transp.grau({ tipo: 'palavra', es: 'el mapa', en: 'the mapa', tags: [] }, 'es', 'en') === 'total',
  'o inglês não tem gênero: só a grafia conta');
ok(Transp.grau({ tipo: 'palavra', es: 'el coche', pt: 'o carro / o automóvel', tags: [] }, 'es', 'pt') === null,
  'resposta com barra fica de fora');
ok(Transp.grau({ tipo: 'frase', es: 'Hola', pt: 'Hola', tags: [] }, 'es', 'pt') === null, 'frase nunca é transparente');
const exquisito = ES.find(c => (c.tags || []).includes('falso-amigo') && Transp.pelaRegra(Object.assign({}, c, { tags: [] }), 'es', 'pt').grau);
ok(!!exquisito && Transp.grau(exquisito, 'es', 'pt') === null,
  'falso amigo de grafia igual (' + (exquisito && exquisito.es) + ') não é transparente');
/* o campo manda sobre a regra, só no público que ele nomeia */
const madrugada = porEs('la madrugada');
ok(Transp.grau(Object.assign({}, madrugada, { transparencia: { pt: 'nenhuma' } }), 'es', 'pt') === null, 'campo «nenhuma» desliga');
ok(Transp.grau(Object.assign({}, porEs('la leche'), { transparencia: { pt: 'total' } }), 'es', 'pt') === 'total', 'campo «total» liga');
ok(Transp.grau(Object.assign({}, porEs('la leche'), { transparencia: { en: 'total' } }), 'es', 'pt') === null, 'campo de outro público não muda este');
ok(Transp.grau(Object.assign({}, madrugada, { transparencia: { pt: 'parecida' } }), 'es', 'pt') === 'parecida', 'campo «parecida» rebaixa');
ok(Transp.errosDoCampo({ tipo: 'palavra', transparencia: { fr: 'total' } }, ['pt', 'en'], 'x').length === 1, 'campo com público fora do baralho é erro');
ok(Transp.errosDoCampo({ tipo: 'palavra', transparencia: { pt: 'muita' } }, ['pt', 'en'], 'x').length === 1, 'campo com grau inválido é erro');
ok(Transp.errosDoCampo({ tipo: 'frase', transparencia: { pt: 'total' } }, ['pt', 'en'], 'x').length === 1, 'campo em frase é erro');
ok(Transp.errosDoCampo({ tipo: 'palavra', transparencia: { pt: 'total', en: 'nenhuma' } }, ['pt', 'en'], 'x').length === 0, 'campo certo passa');

/* o pacote que o build gerou traz exatamente o que a regra calcula */
const arqPacote = path.join(RAIZ, 'public', 'cards', 'data', 'cards-es-pt.js');
if (fs.existsSync(arqPacote)) {
  const w = {};
  new Function('window', fs.readFileSync(arqPacote, 'utf8'))(w);
  const doBuild = w.BARALHOS.es.cards;
  const diferentes = doBuild.filter(c => (c.transp || null) !== (PORID[c.id] && PORID[c.id].transp || null));
  ok(!diferentes.length, 'o pacote es-pt traz o «transp» da regra (' + diferentes.length + ' diferentes)');
  ok(doBuild.every(c => c.transparencia === undefined), 'o pacote não leva o campo «transparencia» da fonte');
} else {
  ok(false, 'falta ' + path.relative(RAIZ, arqPacote) + ' — rode node fonte/build.js antes');
}

/* ═══════════ 2. a transparente no motor ═══════════ */
secao('transparentes e presumidos no motor');
M.usarBaralho('es', 'pt');
zerar();
const totais = ESPT.filter(c => c.tipo === 'palavra' && c.transp === 'total');
const parecidas = ESPT.filter(c => c.tipo === 'palavra' && c.transp === 'parecida');
/* uma frase cujas palavras são todas transparentes: a do baralho, se houver;
   senão uma de mentira com duas delas */
let fraseLivre = ESPT.find(c => c.tipo === 'frase' && Array.isArray(c.requerTodas) && c.requerTodas.length >= 2 &&
  c.requerTodas.every(id => PORID[id] && PORID[id].transp === 'total'));
if (!fraseLivre) fraseLivre = { id: 'teste-f1', tipo: 'frase', nivel: 'A1', requerTodas: [totais[0].id, totais[1].id], tags: [] };
ok(M.liberadaEm(fraseLivre, {}, {}) === Infinity, 'sem usarTransparencias a frase continua presa (o build e as ferramentas)');
M.usarTransparencias(ESPT);
ok(M.sabidaEm(totais[0].id, {}, {}) === 0, 'a transparente total é sabida desde sempre');
ok(M.liberadaEm(fraseLivre, {}, {}) === 0 && M.liberado(fraseLivre, {}, Date.now(), {}),
  'a frase com todas as palavras transparentes (' + fraseLivre.id + ') está livre');
ok(M.dominadosNoTotal({}) === totais.length, 'as transparentes totais contam para os 400 dos textos');
const comEstado = {};
comEstado[totais[0].id] = Object.assign(M.estadoInicial(totais[0].id), { etapa: 'dominado', vistas: 3, acertos: 3 });
ok(M.dominadosNoTotal(comEstado) === totais.length, 'a transparente que já era dominada não conta duas vezes');
ok(M.conhecidaSemEstado(totais[0].id, {}), 'a transparente total não estreia como card novo');
const situacao = M.situacaoDaFrase(fraseLivre, {}, {});
ok(situacao.naoVistas.length === 0 && situacao.faltamDominar === 0, 'a frase não pede as transparentes como palavra nova');
/* fora de dominioPorNivel: nem a estreia certa dela conta */
const estT = {};
totais.slice(0, 10).forEach(c => { estT[c.id] = Object.assign(M.estadoInicial(c.id), { vistas: 1, acertos: 1, primeiraCerta: true }); });
const domT = M.dominioPorNivel(ESPT, estT);
ok(M.NIVEIS.every(n => domT[n] === 0.5), 'a transparente total fica fora de dominioPorNivel');
/* «estudar mesmo assim» */
M.usarExtras({ reativados: { [totais[0].id]: '2026-10-09T10:00:00Z' } });
ok(M.sabidaEm(totais[0].id, {}, {}) === Infinity && !M.conhecidaSemEstado(totais[0].id, {}),
  'a transparente reativada volta a ser card comum');
ok(M.dominadosNoTotal({}) === totais.length - 1, 'a reativada sai da conta dos dominados');
M.usarExtras({});

/* a parecida estreia na volta */
const pared = PORID[porEs('la pared').id];
const ini = M.estadoInicialDo(pared);
ok(ini.etapa === 'inversa-multipla', 'a parecida (la pared) estreia em inversa-multipla');
ok(M.direcaoDe(ini) === 'pt-es' && M.modoDe(ini) === 'multipla', 'a estreia da parecida é a volta, em múltipla escolha');
ok(M.estadoInicial(pared.id).etapa === 'multipla', 'estadoInicial(id) continua como sempre');
ok(M.estadoInicialDo(PORID[porEs('la leche').id]).etapa === 'multipla', 'card comum estreia na ida');
M.usarExtras({ reativados: { [pared.id]: '2026-10-09T10:00:00Z' } });
ok(M.estadoInicialDo(pared).etapa === 'multipla', 'a parecida reativada estreia na ida');
M.usarExtras({});
/* errar na volta da parecida não a manda para a ida */
const errou = M.registrar(M.estadoInicialDo(pared), { modo: 'multipla', direcao: 'pt-es', acertou: false });
ok(errou.etapa === 'inversa-multipla', 'a parecida que erra continua na volta');
ok(parecidas.length > 0, 'há parecidas no es-pt');

/* ── o presumido ── */
const leche = PORID[porEs('la leche').id];
const feitoEm = '2026-10-09T12:00:00.000Z';
const volta = M.dataDoPresumido('u1', leche.id, feitoEm);
M.usarExtras({ nivelamento: { feitoEm: feitoEm, presumidos: { [leche.id]: volta } } });
ok(M.sabidaEm(leche.id, {}, {}) === Date.parse(feitoEm), 'o presumido é sabido desde o nivelamento');
ok(M.dominadosNoTotal({}) === totais.length + 1, 'o presumido conta nos dominados');
ok(M.conhecidaSemEstado(leche.id, {}), 'o presumido não estreia como card novo');
const fraseLeche = { id: 'teste-f2', tipo: 'frase', requerTodas: [leche.id, totais[0].id] };
ok(M.liberado(fraseLeche, {}, Date.parse(feitoEm) + 864e5 * 1.5, {}), 'a frase que pede o presumido destrava no dia seguinte ao nivelamento');
ok(M.palavrasConhecidas(ESPT) === totais.length + 1, 'o N do resultado: transparentes totais + presumidas');
const virtual = M.estadoDoPresumido(leche.id, {});
ok(virtual && virtual.etapa === 'dominado' && virtual.voltaEm === volta, 'para a fila o presumido é um dominado com a data dele');
ok(M.esperando(virtual, feitoEm) && !M.esperando(virtual, '2026-12-31T00:00:00Z'), 'ele espera até a data e depois vence');
ok(M.direcaoDe(virtual) === 'pt-es' && M.modoDe(virtual) === 'escrita', 'vencido, aparece como revisão de dominado (volta, escrita)');
const domP = M.dominioPorNivel(ESPT, {});
ok(M.NIVEIS.every(n => domP[n] === 0.5), 'o presumido fica fora de dominioPorNivel');
const certo = M.responderPresumido(leche.id, { modo: 'escrita', direcao: 'pt-es', acertou: true });
const diasDeVolta = (Date.parse(certo.voltaEm) - Date.parse(certo.ultima)) / 864e5;
ok(certo.etapa === 'dominado' && certo.revisoes === M.DEGRAU_DO_PRESUMIDO && M.DIAS_DOMINADO[certo.revisoes] === 90,
  'acertou: nasce dominado no degrau de três meses');
ok(Math.round(diasDeVolta) >= 89 && Math.round(diasDeVolta) <= 91 && !!certo.dominadoEm && certo.vistas === 1 && certo.acertos === 1,
  'acertou: volta em 90 dias, com dominadoEm e a resposta registrada');
const errado = M.responderPresumido(leche.id, { modo: 'escrita', direcao: 'pt-es', acertou: false, resposta: 'la lechi' });
ok(errado.etapa === 'multipla' && errado.erros === 1 && errado.vistas === 1 && errado.voltaEm === null &&
  errado.primeiraCerta === false && errado.historico.length === 1, 'errou: nasce do zero (multipla), com o erro registrado');
const depois = { [leche.id]: errado };
ok(!M.presumidoEm(leche.id, depois) && M.sabidaEm(leche.id, depois, {}) === Infinity, 'respondido, ele é card como os outros');
/* o presumido não vale para a transparente total (ela não precisa de confirmação) */
M.usarExtras({ nivelamento: { feitoEm: feitoEm, presumidos: { [totais[0].id]: volta } } });
ok(!M.presumidoEm(totais[0].id, {}), 'transparente total nunca vira presumido a confirmar');
zerar();

/* dataDoPresumido: estável, e entre 7 e 60 dias */
const dias = new Set();
let fora = 0;
ESPT.forEach(c => {
  const d = M.dataDoPresumido('usuario-x', c.id, feitoEm);
  const n = (Date.parse(d) - Date.parse(feitoEm)) / 864e5;
  if (n < 7 || n > 60 || n !== Math.round(n)) fora++;
  dias.add(n);
});
ok(!fora, 'dataDoPresumido entre 7 e 60 dias (' + fora + ' fora)');
ok(dias.size >= 50, 'as datas se espalham (' + dias.size + ' dias diferentes)');
ok(M.dataDoPresumido('u', 'p001', feitoEm) === M.dataDoPresumido('u', 'p001', new Date(feitoEm)), 'dataDoPresumido é estável');
ok(M.dataDoPresumido('u', 'p001', feitoEm) !== M.dataDoPresumido('v', 'p001', feitoEm) ||
  M.dataDoPresumido('u', 'p002', feitoEm) !== M.dataDoPresumido('v', 'p002', feitoEm), 'o usuário muda a data');

/* ═══════════ 3. o prior e o desafio em dominioPorNivel ═══════════ */
secao('dominioPorNivel com prior');
const semNada = M.dominioPorNivel(ESPT, {});
const comPrior = M.dominioPorNivel(ESPT, {}, { A1: 0.9, A2: 0.7 });
ok(comPrior.A1 === 0.9 && comPrior.A2 === 0.7 && comPrior.B1 === 0.5, 'o prior toma o lugar do 0,5 no nível que ele traz');
ok(JSON.stringify(semNada) === JSON.stringify(M.dominioPorNivel(ESPT, {}, null)), 'sem prior, nada muda');
const umA1 = ESPT.find(c => c.nivel === 'A1' && !c.transp && c.tipo === 'palavra');
const estErro = { [umA1.id]: Object.assign(M.estadoInicial(umA1.id), { vistas: 1, erros: 1, primeiraCerta: false }) };
ok(M.dominioPorNivel(ESPT, estErro, { A1: 0.9 }).A1 < 0.9, 'a resposta de verdade puxa o prior');
estErro[umA1.id].desafio = true;
ok(M.dominioPorNivel(ESPT, estErro, { A1: 0.9 }).A1 === 0.9, 'a estreia do desafio não conta');
ok(M.marcarDesafio(M.estadoInicial('x')).desafio === true, 'marcarDesafio põe est.desafio');

/* ═══════════ 4. o nivelamento ═══════════ */
secao('nivelamento');
const N = M.nivelamento;
M.usarTransparencias(ESPT);
const banco = N.banco(ESPT);
const noBanco = new Set(Object.values(banco).flatMap(n => Object.values(n).flat()));
ok([...noBanco].every(id => PORID[id].tipo === 'palavra' && PORID[id].transp !== 'total' &&
  !(PORID[id].tags || []).includes('falso-amigo') && M.temaDe(PORID[id])), 'o banco: palavras com tema, sem transparente total e sem falso amigo');
console.log('    banco es-pt: ' + M.NIVEIS.map(n => n + ' ' + Object.keys(banco[n] || {}).length + ' temas/' +
  Object.values(banco[n] || {}).flat().length).join(', '));

/* quem responde: conhece cada palavra com a chance do nível dela (estável
   por palavra, para a conferência confirmar), e às vezes blefa */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h / 4294967296; }
function rodar(chances, comeco, semente, blefe) {
  const t = N.novo(ESPT, { comeco: comeco, semente: semente });
  const sabe = id => hash(semente + ':' + id) < (chances[PORID[id].nivel] || 0);
  let c, passos = 0;
  const blocos = [];
  while ((c = N.proximaCarta(t)) && passos++ < 200) {
    if (c.conferir) { N.conferir(t, c.id, sabe(c.id)); continue; }
    const diz = sabe(c.id) || hash('b' + semente + c.id) < (blefe || 0);
    if (!blocos.length || blocos[blocos.length - 1].length === 6 || blocos[blocos.length - 1].nivel !== c.nivel) {
      blocos.push([]); blocos[blocos.length - 1].nivel = c.nivel;
    }
    blocos[blocos.length - 1].push(c);
    N.responder(t, c.id, diz);
  }
  return { t: t, blocos: blocos };
}
const iniciante = rodar({ A1: 0.1 }, 'pouco', 7);
ok(iniciante.t.fim && iniciante.t.cartas.length <= 12 && iniciante.t.cartas.length >= 6, 'o iniciante para cedo (' + iniciante.t.cartas.length + ' cartas)');
ok(iniciante.t.cartas.every(c => c.nivel === 'A1'), 'o iniciante fica no A1');
const forte = rodar({ A1: 1, A2: 1, B1: 1, B2: 0.95, C1: 0.3, C2: 0.1 }, 'bastante', 11);
const maisAlto = forte.t.cartas.reduce((a, c) => Math.max(a, M.NIVEIS.indexOf(c.nivel)), -1);
ok(forte.t.cartas[0].nivel === 'A2', '«bastante» começa no A2');
ok(maisAlto >= M.NIVEIS.indexOf('B2'), 'o forte sobe (até ' + M.NIVEIS[maisAlto] + ', ' + forte.t.cartas.length + ' cartas)');
const nunca = N.novo(ESPT, { comeco: 'nunca' });
ok(nunca.fim && nunca.pulou && N.proximaCarta(nunca) === null, '«nunca» pula o teste');
/* um bloco = um tema por carta, quando o nível tem temas para isso */
const temasDoPrimeiro = new Set(iniciante.blocos[0].map(c => c.tema));
ok(temasDoPrimeiro.size === iniciante.blocos[0].length, 'o primeiro bloco tem uma carta de cada tema');
/* muitos alunos: sempre entre 6 e 40 cartas, e toda «Já conheço» de bloco conferível tem conferência */
let foraDoTeto = 0, semConferir = 0, conferencias = 0, conhecos = 0;
for (let s = 1; s <= 300; s++) {
  const base = hash('n' + s);
  const ch = {};
  M.NIVEIS.forEach((n, i) => { ch[n] = Math.max(0, Math.min(1, base * 1.6 - i * 0.18)); });
  const r = rodar(ch, s % 2 ? 'pouco' : 'bastante', s, 0.1);
  const n = r.t.cartas.length;
  if (n < 6 || n > 40) foraDoTeto++;
  if (!r.t.fim) foraDoTeto++;
  conferencias += r.t.cartas.filter(c => c.conferida).length;
  conhecos += r.t.cartas.filter(c => c.resposta === 'conheco').length;
  r.blocos.forEach(b => {
    const ids = b.map(c => c.id);
    const cartas = r.t.cartas.filter(c => ids.includes(c.id));
    if (cartas.some(c => c.resposta === 'conheco') && !cartas.some(c => c.conferida)) semConferir++;
  });
}
ok(!foraDoTeto, 'sempre entre 6 e 40 cartas, e o teste termina (' + foraDoTeto + ' fora)');
ok(!semConferir, 'todo bloco com «Já conheço» tem ao menos uma conferência (' + semConferir + ' sem)');
console.log('    300 alunos: ' + conferencias + ' conferências em ' + conhecos + ' «Já conheço» (' +
  (100 * conferencias / Math.max(1, conhecos)).toFixed(0) + '%)');
/* carta fora da vez é ignorada */
const t1 = N.novo(ESPT, { comeco: 'pouco', semente: 3 });
ok(N.responder(t1, 'nao-existe', true).ignorada === true && t1.cartas.length === 0, 'carta fora da vez é ignorada');
/* serializável: o teste sobrevive a JSON e continua igual */
const t2 = N.novo(ESPT, { comeco: 'pouco', semente: 5 });
const t3 = JSON.parse(JSON.stringify(t2));
const a2 = N.proximaCarta(t2), a3 = N.proximaCarta(t3);
ok(a2.id === a3.id && JSON.stringify(t2) === JSON.stringify(t3), 'o teste é serializável e o sorteio vai junto');

/* ── a dedução ── */
secao('dedução');
const forteR = N.deduzir(forte.t, ESPT, { uid: 'u1', agora: feitoEm });
const iAlto = M.NIVEIS.indexOf(forteR.testados[forteR.testados.length - 1]);
const presIds = Object.keys(forteR.presumidos);
const PROIBIDAS = ['falso-amigo', 'expressão', 'gíria', 'provérbio', 'conjugação'];
ok(presIds.every(id => !(PORID[id].tags || []).includes('falso-amigo')), 'nunca presume falso-amigo');
ok(presIds.every(id => PORID[id].tipo !== 'palavra' || !(PORID[id].tags || []).some(t => PROIBIDAS.includes(t))),
  'nunca presume palavra com falso-amigo, expressão, gíria, provérbio ou conjugação');
ok(presIds.every(id => PORID[id].tipo === 'palavra' || (PORID[id].tags || []).includes('primeiros passos')), 'frase, só a de primeiros passos');
ok(presIds.every(id => PORID[id].tipo === 'frase' || M.NIVEIS.indexOf(PORID[id].nivel) <= iAlto), 'nunca acima do nível mais alto testado');
ok(presIds.every(id => PORID[id].transp !== 'total'), 'nunca presume a transparente total (já é sabida)');
ok(presIds.every(id => { const n = (Date.parse(forteR.presumidos[id]) - Date.parse(feitoEm)) / 864e5; return n >= 7 && n <= 60; }),
  'as datas dos presumidos ficam entre 7 e 60 dias');
ok(forteR.cartas.length === forte.t.cartas.length && forteR.cartas.every(c => c.id && c.resposta), 'o resultado traz as cartas para os extras');
ok(M.NIVEIS.every(n => typeof forteR.porNivel[n] === 'number'), 'porNivel cobre os níveis (prior de dominioPorNivel)');
console.log('    forte: até ' + M.NIVEIS[iAlto] + ', confiança ' + forteR.confianca.toFixed(2) + ', ' + presIds.length + ' presumidos, N = ' +
  M.palavrasConhecidas(ESPT, forteR.presumidos));
/* «Quero aprender» e a reprovada nunca são presumidas; «Já conheço» sempre */
const recusadas = forte.t.cartas.filter(c => !N.conhecida(c)).map(c => c.id);
const aceitas = forte.t.cartas.filter(c => N.conhecida(c)).map(c => c.id);
ok(recusadas.every(id => !forteR.presumidos[id]), '«Quero aprender» e reprovada não são presumidas');
ok(aceitas.every(id => forteR.presumidos[id]), '«Já conheço» não reprovada é presumida');
/* a régua de 0,9: um teste montado à mão, todo conhecido no A1 */
function testeFeito(nConferidas, nivelTopo) {
  const cartas = [];
  const temas = Object.keys(banco.A1);
  temas.slice(0, 6).forEach(tema => cartas.push({ id: banco.A1[tema][0], nivel: 'A1', tema: tema, resposta: 'conheco' }));
  for (let i = 0; i < nConferidas && i < cartas.length; i++) { cartas[i].conferida = true; cartas[i].acertou = true; }
  /* mais conferências do que cartas: as que sobram em outras palavras do A1, todas certas */
  let k = 0;
  for (const tema of temas) {
    for (const id of banco.A1[tema].slice(1)) {
      if (cartas.filter(c => c.conferida).length >= nConferidas) break;
      cartas.push({ id: id, nivel: 'A1', tema: tema, resposta: 'conheco', conferida: true, acertou: true }); k++;
    }
  }
  if (nivelTopo) {
    const tema = Object.keys(banco[nivelTopo])[0];
    cartas.push({ id: banco[nivelTopo][tema][0], nivel: nivelTopo, tema: tema, resposta: 'aprender' });
  }
  return { cartas: cartas };
}
/* confiança = (acertos + 3) / (conferências + 3): com as conferências todas
   certas ela é 1, e o A1 inteiro passa; uma errada em duas a põe em 0,8, e aí
   só ficam as respondidas «Já conheço» que não foram reprovadas. */
const passa = N.deduzir(testeFeito(2), ESPT, { uid: 'u', agora: feitoEm });   // confiança 5/5 = 1; p = 1
const comErro = testeFeito(2); comErro.cartas[1].acertou = false;            // 1 de 2 errada: 4/5 = 0,8
const naoPassa = N.deduzir(comErro, ESPT, { uid: 'u', agora: feitoEm });
const explicitas = comErro.cartas.filter(c => c.resposta === 'conheco' && c.acertou !== false).map(c => c.id);
const doA1 = ESPT.filter(c => c.tipo === 'palavra' && c.nivel === 'A1' && c.transp !== 'total' && M.temaDe(c) &&
  !(c.tags || []).some(t => PROIBIDAS.includes(t)));
ok(Math.abs(passa.confianca - 1) < 1e-12 && Object.keys(passa.presumidos).length === doA1.length,
  'conferências certas: p × confiança ≥ 0,9 presume as células do A1 inteiras (' + Object.keys(passa.presumidos).length + ' de ' + doA1.length + ')');
ok(Math.abs(naoPassa.confianca - 0.8) < 1e-12 && Object.keys(naoPassa.presumidos).length === explicitas.length && explicitas.every(id => naoPassa.presumidos[id]),
  'uma conferência errada em duas: só as respondidas «Já conheço» e não reprovadas (' + Object.keys(naoPassa.presumidos).length + ')');
ok(Object.keys(passa.presumidos).every(id => PORID[id].nivel === 'A1'), 'testado só o A1, nada acima dele');
const primeiros = ESPT.filter(c => (c.tags || []).includes('primeiros passos') && c.tipo === 'frase');
const ateB1 = N.deduzir(testeFeito(8, 'B1'), ESPT, { uid: 'u', agora: feitoEm });
const ateA2 = N.deduzir(testeFeito(8, 'A2'), ESPT, { uid: 'u', agora: feitoEm });
ok(primeiros.length > 0 && primeiros.every(c => ateB1.presumidos[c.id]), 'passou do A2: as frases de primeiros passos são presumidas');
ok(primeiros.every(c => !ateA2.presumidos[c.id]), 'até o A2: as frases de primeiros passos não são presumidas');
ok(Object.keys(ateB1.presumidos).every(id => M.NIVEIS.indexOf(PORID[id].nivel) <= M.NIVEIS.indexOf('B1') || PORID[id].tipo === 'frase'),
  'com o B1 testado, nada acima do B1');
/* quem já tem estado ou arquivou não é presumido (o «refazer») */
const umaExplicita = explicitas[0];
const comEst = N.deduzir(testeFeito(8), ESPT, { uid: 'u', agora: feitoEm,
  estados: { [umaExplicita]: Object.assign(M.estadoInicial(umaExplicita), { vistas: 2 }) } });
ok(!comEst.presumidos[umaExplicita], 'card com estado não é presumido');
const pulou = N.deduzir(nunca, ESPT, { uid: 'u', agora: feitoEm });
ok(!Object.keys(pulou.presumidos).length && !Object.keys(pulou.porNivel).length, 'quem pulou o teste não ganha presumido nem prior');
/* o iniciante: porNivel acima do testado cai pela metade a cada nível */
const inicR = N.deduzir(iniciante.t, ESPT, { uid: 'u', agora: feitoEm });
ok(inicR.porNivel.A2 === inicR.porNivel.A1 / 2 && inicR.porNivel.A1 < 0.5, 'o prior acima do testado não passa do testado');

/* ═══════════ 5. o desafio ═══════════ */
secao('desafio');
zerar();
M.usarTransparencias(ESPT);
const agoraD = Date.parse('2026-10-09T15:00:00');
const ctx = x => Object.assign({ agora: agoraD, respostas: 20, desafios: 0, inicio: '2026-10-05T10:00:00', aleatorio: () => 0.5 }, x);
const DESAFIO = ['falso-amigo', 'expressão', 'gíria', 'provérbio'];
const d1 = M.escolherDesafio(ESPT, {}, ctx());
ok(d1 && d1.card.nivel === 'B1' && (d1.card.tags || []).some(t => DESAFIO.includes(t)), 'sem domínio nenhum: desafio de B1 (A1 + 2)' + (d1 ? ', ' + d1.card.id : ''));
ok(M.escolherDesafio(ESPT, {}, ctx({ respostas: 14 })) === null, 'antes de 15 respostas, nada');
ok(M.escolherDesafio(ESPT, {}, ctx({ desafios: 10 })) === null, 'depois de 10 desafios, nada');
ok(M.escolherDesafio(ESPT, {}, ctx({ ultimoDesafio: '2026-10-09T08:00:00' })) === null, 'no máximo um por dia');
ok(M.escolherDesafio(ESPT, {}, ctx({ ultimoDesafio: '2026-10-08T22:00:00' })) !== null, 'no dia seguinte, pode');
ok(M.escolherDesafio(ESPT, {}, ctx({ inicio: '2026-09-20T10:00:00' })) === null, 'só nas duas primeiras semanas do curso');
const dA2 = M.escolherDesafio(ESPT, {}, ctx({ prior: { A1: 0.9, A2: 0.8 } }));
ok(dA2 && dA2.card.nivel === 'B2', 'nível atual A2 (pelo nivelamento): desafio de B2');
const dC1 = M.escolherDesafio(ESPT, {}, ctx({ prior: { A1: 0.9, A2: 0.9, B1: 0.9, B2: 0.8 } }));
ok(dC1 && dC1.card.nivel === 'C1', 'nível atual B2: desafio de C1, o teto');
ok(M.escolherDesafio(ESPT, {}, ctx({ prior: { A1: 0.9, A2: 0.9, B1: 0.9, B2: 0.9, C1: 0.9 } })) === null, 'do C1 para cima, nada');
const visto = { [d1.card.id]: Object.assign(M.estadoInicial(d1.card.id), { vistas: 1 }) };
ok([0, 0.1, 0.25, 0.5, 0.75, 0.99].every(u => M.escolherDesafio(ESPT, visto, ctx({ aleatorio: () => u })).card.id !== d1.card.id),
  'o card já visto não volta como desafio');
ok(M.escolherDesafio(ESPT, {}, ctx({ mostrados: [d1.card.id], aleatorio: () => 0.5 })).card.id !== d1.card.id, 'o já mostrado não volta');
const presa = ESPT.find(c => c.tipo === 'frase' && c.nivel === 'B1' && (c.tags || []).some(t => DESAFIO.includes(t)) &&
  Array.isArray(c.requerTodas) && c.requerTodas.length && !M.liberado(c, {}, agoraD, {}));
if (presa) {
  const soPresa = ESPT.filter(c => c.id === presa.id || c.tipo === 'palavra');
  const dp = M.escolherDesafio(soPresa.filter(c => !(c.tags || []).some(t => DESAFIO.includes(t)) || c.id === presa.id), {}, ctx());
  ok(dp && dp.card.id === presa.id && dp.previa === true, 'a frase presa vem como prévia (' + presa.id + ')');
} else ok(false, 'nenhuma frase presa de B1 com etiqueta de desafio para testar a prévia');
const palavraDesafio = ESPT.find(c => c.tipo === 'palavra' && c.nivel === 'B1' && (c.tags || []).includes('falso-amigo'));
const dw = M.escolherDesafio([palavraDesafio], {}, ctx());
ok(dw && dw.previa === false, 'a palavra desafio não é prévia');

/* ═══════════ 6. a mescla dos extras novos (sincronia.js) ═══════════ */
secao('mescla dos extras');
const jan = {};
new Function('window', fs.readFileSync(path.join(RAIZ, 'public', 'cards', 'js', 'sincronia.js'), 'utf8'))(jan);
const mesclar = jan.TaioeSincronia.mesclarExtras;
const base = { arquivados: {}, emVista: [], textos: { emVista: {}, lidos: {} } };
const m0 = mesclar(base, base);
ok(!('nivelamento' in m0) && !('reativados' in m0) && !('dicasVistas' in m0), 'sem os extras novos, a mescla não os inventa');
const nA = { feitoEm: '2026-10-09T10:00:00Z', presumidos: { a: 1 } }, nB = { feitoEm: '2026-10-10T10:00:00Z', presumidos: { b: 1 } };
ok(mesclar(Object.assign({}, base, { nivelamento: nA }), Object.assign({}, base, { nivelamento: nB })).nivelamento === nB, 'nivelamento: o mais recente vence (servidor)');
ok(mesclar(Object.assign({}, base, { nivelamento: nB }), Object.assign({}, base, { nivelamento: nA })).nivelamento === nB, 'nivelamento: o mais recente vence (local)');
ok(mesclar(Object.assign({}, base, { nivelamento: nA }), base).nivelamento === nA, 'nivelamento só de um lado fica');
const mr = mesclar(Object.assign({}, base, { reativados: { x: '2026-10-09', y: '2026-10-05' }, dicasVistas: { quase: '2026-10-02' } }),
  Object.assign({}, base, { reativados: { x: '2026-10-01', z: '2026-10-03' } }));
ok(mr.reativados.x === '2026-10-09' && mr.reativados.y === '2026-10-05' && mr.reativados.z === '2026-10-03', 'reativados: chave a chave, o gesto mais recente');
ok(mr.dicasVistas.quase === '2026-10-02', 'dicasVistas: a chave de um lado só fica');
/* desfazer é gesto: «-ISO» vence a data mais velha e perde para a mais nova */
const md = mesclar(Object.assign({}, base, { reativados: { x: '-2026-10-09T12:00:00Z' }, dicasVistas: { quase: '-2026-10-09T12:00:00Z', frase: '2026-10-09T13:00:00Z' } }),
  Object.assign({}, base, { reativados: { x: '2026-10-01T10:00:00Z' }, dicasVistas: { quase: '2026-10-02T10:00:00Z', frase: '-2026-10-09T12:00:00Z' } }));
ok(md.reativados.x === '-2026-10-09T12:00:00Z' && !jan.TaioeSincronia.gestoAtivo(md.reativados.x), 'reativados: o «voltar a contar como conhecida» mais novo vence');
ok(md.dicasVistas.quase === '-2026-10-09T12:00:00Z', 'dicasVistas: o «Rever dicas» mais novo vence');
ok(jan.TaioeSincronia.gestoAtivo(md.dicasVistas.frase), 'dicasVistas: a dica vista depois do «Rever dicas» fica vista');

zerar();
/* ── 7.9: o nivelamento pela lista (o francês) ── */
{
secao('o nivelamento pela lista (7.9)');
const jl = {};
new Function('window', fs.readFileSync(path.join(RAIZ, 'public', 'cards', 'data', 'cards-fr-pt.js'), 'utf8'))(Object.assign(jl, { BARALHOS: {} }));
new Function('window', fs.readFileSync(path.join(RAIZ, 'public', 'cards', 'data', 'lista-fr-pt.js'), 'utf8'))(jl);
const FR = jl.BARALHOS.fr.cards.map(c => M.formaDoCard(c, 0));
const NL = M.nivelamentoLista;
const LISTA = NL.itens(jl.TAIOE_LISTA);
M.usarTransparencias(FR);
M.usarExtras({});
const palavrasFr = FR.filter(c => c.tipo === 'palavra');
ok(palavrasFr.every(c => c.pos > 0), 'o pacote do fr-pt traz a posição da lista em toda palavra');
ok(LISTA.length > 5000 && LISTA.every((x, i) => x.pos === i + 1), 'a lista do fr-pt vem inteira, em ordem de posição');
const naLista = new Set(LISTA.flatMap(x => x.cards));
ok(palavrasFr.every(c => naLista.has(c.id)), 'toda palavra com card está na lista');
const falsoFr = palavrasFr.filter(c => (c.tags || []).includes('falso-amigo'));
const totalFr = palavrasFr.filter(c => c.transp === 'total');
const perguntaveis = LISTA.filter(NL.perguntavel);
ok(falsoFr.length && !falsoFr.some(c => perguntaveis.some(x => x.cards.includes(c.id))), 'falso amigo não é perguntado');
ok(totalFr.length && !totalFr.some(c => perguntaveis.some(x => x.cards.includes(c.id))), 'transparente total não é perguntada');

/* a pessoa: conhece com 93% de chance o que está antes de T, com 7% o depois */
function rodar(T, comeco, semente, verdade) {
  let s = semente;
  const sorte = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const t = NL.novo(LISTA, { comeco: comeco, semente: semente });
  let c, telas = 0;
  while ((c = NL.proximaCarta(t, LISTA)) && telas < 120) {
    telas++;
    const sabe = verdade ? verdade(c.pos) : c.pos < T;
    if (c.conferir) NL.conferir(t, LISTA, c.pos, sabe ? sorte() < 0.95 : sorte() < 0.25);
    else NL.responder(t, LISTA, c.pos, verdade ? sabe : sorte() < (sabe ? 0.93 : 0.07));
  }
  return { t, telas };
}
const mediana = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const [T, comeco] of [[300, 'pouco'], [900, 'pouco'], [2000, 'bastante'], [150, 'nunca']]) {
  const r = [];
  for (let k = 0; k < 40; k++) r.push(rodar(T, comeco, 1000 + k));
  const d = mediana(r.map(x => x.t.divisa)), telas = mediana(r.map(x => x.telas));
  ok(Math.abs(d - T) <= T * 0.12 + 15, `quem sabe ~${T} palavras («${comeco}»): a divisa mediana fica perto (${d})`);
  ok(telas <= 30, `quem sabe ~${T} palavras («${comeco}»): até 30 telas na mediana (${telas})`);
  ok(r.every(x => x.t.cartas.length <= NL.TETO), `quem sabe ~${T} palavras: nunca passa do teto de ${NL.TETO} palavras`);
}
const iniciante = rodar(0, 'nunca', 7, () => false);
ok(iniciante.t.fim && iniciante.t.cartas.length <= 3 && iniciante.t.divisa === 1, '«Nunca» de quem não sabe nada termina em 2 ou 3 palavras, sem divisa');
const tudo = rodar(0, 'bastante', 7, () => true);
ok(tudo.t.fim && tudo.t.divisa > LISTA[LISTA.length - 1].pos - 30, 'quem sabe tudo chega ao fim da lista');
ok(tudo.t.cartas.length <= NL.TETO, 'e sem passar do teto');

/* a conferência e a dedução */
const t1 = NL.novo(LISTA, { comeco: 'pouco', semente: 3 });
const p1 = NL.proximaCarta(t1, LISTA);
const r1 = NL.responder(t1, LISTA, p1.pos, true);
ok(r1.conferir && NL.proximaCarta(t1, LISTA).conferir, 'o primeiro «Já conheço» vira múltipla escolha');
NL.conferir(t1, LISTA, p1.pos, false);
ok(!NL.conhecida(t1.cartas[0]), 'reprovada na conferência, conta como não conhecida');
const alt = NL.alternativas(t1, LISTA, 2000);
ok(alt.opcoes.length === 5 && alt.opcoes.includes(alt.certa) && new Set(alt.opcoes).size === 5,
  'a conferência da palavra sem card tem cinco alternativas diferentes, com a certa');

const agora = '2026-10-16T12:00:00.000Z';
const fim = rodar(0, 'pouco', 11, p => p < 600);
const ded = NL.deduzir(fim.t, LISTA, FR, { uid: 'u1', agora: agora, estados: {}, arquivados: {} });
const antes = palavrasFr.filter(c => c.pos < ded.divisa && c.transp !== 'total' && !(c.tags || []).includes('falso-amigo'));
const recusadas = new Set(fim.t.cartas.filter(c => !NL.conhecida(c)).flatMap(c => (LISTA[c.pos - 1].cards || [])));
ok(ded.versao === 2 && ded.divisa > 500 && ded.divisa < 700, `a dedução guarda a divisa (${ded.divisa})`);
ok(antes.filter(c => !recusadas.has(c.id)).every(c => ded.presumidos[c.id]), 'toda palavra antes da divisa é presumida');
ok(!falsoFr.some(c => ded.presumidos[c.id]), 'falso amigo nunca é presumido');
ok(!palavrasFr.some(c => c.pos >= ded.divisa && ded.presumidos[c.id] &&
  !fim.t.cartas.some(x => NL.conhecida(x) && (LISTA[x.pos - 1].cards || []).includes(c.id))), 'depois da divisa, só a «Já conheço» é presumida');
ok(Object.keys(ded.porNivel).length && ded.porNivel.A1 > ded.porNivel.B1, 'o porNivel sai da parte de cada nível antes da divisa');
const comEstado = rodar(0, 'pouco', 11, p => p < 600);
const umComEstado = antes[0].id;
const ded2 = NL.deduzir(comEstado.t, LISTA, FR, { uid: 'u1', agora: agora, estados: { [umComEstado]: { vistas: 2 } }, arquivados: {} });
ok(!ded2.presumidos[umComEstado], 'card que já tem estado não é presumido (o refazer)');
const salvo = rodar(0, 'bastante', 5, p => p < 1200);
const meio = NL.novo(LISTA, { comeco: 'pouco', semente: 9 });
for (let k = 0; k < 4; k++) {
  const c = NL.proximaCarta(meio, LISTA);
  if (c.conferir) NL.conferir(meio, LISTA, c.pos, true); else NL.responder(meio, LISTA, c.pos, c.pos < 900);
}
const copia = JSON.parse(JSON.stringify(meio));
ok(JSON.stringify(NL.proximaCarta(copia, LISTA).pos) === JSON.stringify(NL.proximaCarta(meio, LISTA).pos),
  'o teste é JSON puro: guardado no meio, retoma na mesma palavra');
ok(salvo.t.fim, 'o teste termina');

/* a regra da divisa, as frases na volta e os inéditos pela lista */
const niv = Object.assign({ feitoEm: agora, pulou: false, comeco: 'pouco' }, ded);
M.usarExtras({ nivelamento: niv, uid: 'u1' });
const novaAntes = { id: 'fr-novo1', tipo: 'palavra', pos: 50, nivel: 'A1', tags: ['verbo'] };
const novaFalso = { id: 'fr-novo2', tipo: 'palavra', pos: 51, nivel: 'A1', tags: ['falso-amigo'] };
const novaDepois = { id: 'fr-novo3', tipo: 'palavra', pos: ded.divisa + 10, nivel: 'A1', tags: ['verbo'] };
M.usarTransparencias(FR.concat([novaAntes, novaFalso, novaDepois]));
M.usarExtras({ nivelamento: niv, uid: 'u1' });
ok(!!M.presumidoEm('fr-novo1', {}), 'o card feito depois do teste, antes da divisa, nasce presumido');
ok(!M.presumidoEm('fr-novo2', {}) && !M.presumidoEm('fr-novo3', {}), 'menos o falso amigo e o que está depois da divisa');
ok(!ded.fora.length || ded.fora.every(id => !M.presumidoEm(id, {})), 'o que o teste deixou de fora não é presumido pela regra');
const presumidasIds = Object.keys(ded.presumidos);
const fraseConhecida = { id: 'fr-fx1', tipo: 'frase', requerTodas: presumidasIds.slice(0, 2), tags: [] };
const fraseNova = { id: 'fr-fx2', tipo: 'frase', requerTodas: [presumidasIds[0], novaDepois.id], tags: [] };
const passos = { id: 'fr-fx3', tipo: 'frase', requerTodas: [], tags: ['primeiros passos'] };
ok(M.estadoInicialDo(fraseConhecida).etapa === 'inversa-multipla', 'a frase de palavras todas conhecidas estreia na volta');
ok(M.estadoInicialDo(fraseNova).etapa === 'multipla', 'a frase com uma palavra nova estreia na ida');
ok(M.estadoInicialDo(passos).etapa === (ded.divisa > NL.PRIMEIROS_PASSOS_NA_VOLTA ? 'inversa-multipla' : 'multipla'),
  'a de primeiros passos estreia na volta quando a divisa passou da posição ' + NL.PRIMEIROS_PASSOS_NA_VOLTA);
const porIdFr = Object.fromEntries(FR.map(c => [c.id, c]));
const ineditas = palavrasFr.slice().reverse().slice(0, 30).map(c => c.id).concat(['fr-b001']);
const ordem = M.ordenarNovos(ineditas, M.pesosDeNivel({}), porIdFr);
const soPalavras = ordem.filter(id => porIdFr[id].pos);
ok(soPalavras.every((id, i) => !i || porIdFr[soPalavras[i - 1]].pos <= porIdFr[id].pos), 'os inéditos de palavra vêm na ordem da lista');
ok(ordem.length === ineditas.length && ordem.includes('fr-b001'), 'e os outros cards entram no meio');
}

zerar();
/* ── 7.9 nos outros cursos: a lista de cada baralho, para cada público ── */
for (const curso of ['es-pt', 'es-en', 'en-pt', 'en-es', 'pt-es', 'pt-en']) {
  secao('a lista do ' + curso);
  const lingua = curso.split('-')[0];
  const arq = path.join(RAIZ, 'public', 'cards', 'data', 'lista-' + curso + '.js');
  ok(fs.existsSync(arq), 'o curso ' + curso + ' tem a lista');
  if (!fs.existsSync(arq)) continue;
  const j = { BARALHOS: {} };
  new Function('window', fs.readFileSync(path.join(RAIZ, 'public', 'cards', 'data', 'cards-' + curso + '.js'), 'utf8'))(j);
  new Function('window', fs.readFileSync(arq, 'utf8'))(j);
  const CS = j.BARALHOS[lingua].cards.map(c => M.formaDoCard(c, 0));
  const NL = M.nivelamentoLista;
  const LISTA = NL.itens(j.TAIOE_LISTA);
  M.usarTransparencias(CS);
  M.usarExtras({});
  const palavras = CS.filter(c => c.tipo === 'palavra');
  ok(j.TAIOE_LISTA.curso === curso, 'a lista é a do curso');
  ok(LISTA.length > 4500 && LISTA.every((x, i) => x.pos === i + 1), `a lista vem inteira, em ordem de posição (${LISTA.length})`);
  ok(palavras.every(c => c.pos > 0), 'o pacote traz a posição em toda palavra');
  const naLista = new Set(LISTA.flatMap(x => x.cards));
  ok(palavras.every(c => naLista.has(c.id)), 'toda palavra com card está na lista');
  const perguntaveis = LISTA.filter(NL.perguntavel);
  ok(LISTA.every(x => x.trad), 'toda palavra da lista tem tradução no público');
  const iguais = LISTA.filter(x => x.trad.split('/').some(t => t.trim().replace(/^(el|la|o|a|the|to) /, '') === x.fr.replace(/^(el|la|o|a|the|to) /, '')));
  ok(iguais.length && !iguais.some(NL.perguntavel), `a escrita igual à tradução não é perguntada (${iguais.length})`);
  ok(perguntaveis.length > 2000, `perguntáveis: ${perguntaveis.length}`);
  for (const [T, comeco] of [[300, 'pouco'], [1500, 'bastante']]) {
    const r = [];
    for (let k = 0; k < 30; k++) {
      let s = 500 + k;
      const sorte = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      const t = NL.novo(LISTA, { comeco: comeco, semente: s });
      let c, telas = 0;
      while ((c = NL.proximaCarta(t, LISTA)) && telas < 120) {
        telas++;
        const sabe = c.pos < T;
        if (c.conferir) NL.conferir(t, LISTA, c.pos, sabe ? sorte() < 0.95 : sorte() < 0.25);
        else NL.responder(t, LISTA, c.pos, sorte() < (sabe ? 0.93 : 0.07));
      }
      r.push({ t, telas });
    }
    const mediana = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const d = mediana(r.map(x => x.t.divisa)), telas = mediana(r.map(x => x.telas));
    ok(Math.abs(d - T) <= T * 0.12 + 15 && telas <= 30, `quem sabe ~${T} palavras: divisa ${d}, ${telas} telas na mediana`);
  }
}

zerar();
console.log('\n  ' + (falhas ? falhas + ' de ' + feitas + ' conferências falharam' : feitas + ' conferências, todas passaram') + '\n');
process.exit(falhas ? 1 : 0);
