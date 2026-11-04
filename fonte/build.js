#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/build.js — junta e valida os arquivos de fonte/cards/ e
   gera data/cards.json (para ferramentas) e, para a Taioé, os baralhos
   do app em public/cards/data/, a cópia do motor em public/cards/js/
   e o SQL do catálogo de cada curso em fonte/sql/.

   Uso:  node fonte/build.js
   ──────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const pastaCards = path.join(__dirname, 'cards');
const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const normalizar = s => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* ── a régua do app, e não uma parecida ──
   Este normalizar() daqui de cima serve para achar card repetido: ele quer
   saber se dois textos são o MESMO texto. Já para saber se um distrator é,
   na prática, a resposta certa, quem decide tem de ser o motor — porque é
   ele que vai conferir a resposta de verdade, e ele descarta artigo, pronome
   e plural. Uma régua própria aqui deixaria passar "Ele disse isso ontem."
   contra "Eu disse isso a ele ontem.", que o app aceita como a mesma coisa. */
const arqMotor = path.join(raiz, 'js', 'motor.js');
const janela = {};
try {
  new Function('window', fs.readFileSync(arqMotor, 'utf8'))(janela);
} catch (e) {
  console.error('\n  não consegui carregar js/motor.js: ' + e.message + '\n');
  process.exit(1);
}
const Motor = janela.Motor;
if (!Motor || typeof Motor.respostasAceitas !== 'function') {
  console.error('\n  js/motor.js carregou mas não expôs o Motor esperado\n');
  process.exit(1);
}

/* A regra das palavras transparentes (PLANO.md, 7.1) mora em
   fonte/transparencia.js, e o relatório fonte/transparentes.js usa a mesma. */
const Transp = require('./transparencia');

/* ── três baralhos, uma pasta cada ──
   fonte/cards/es, /en, /pt: a pasta diz que língua aquele baralho ENSINA, e é
   ela que decide qual campo do card é a pergunta e quais são as respostas. O
   baralho de espanhol responde em português e em inglês; o de inglês responde
   em português e em espanhol; o de português, em espanhol e em inglês. O
   porquê de cada decisão está em PLANO.md. */
/* O latim (21/10/2026, cards/LATIM.md) vem por último: assim a ordem de tudo o que já saía
   não muda. */
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'la'];
const NOME_DO_IDIOMA = { es: 'espanhol', en: 'inglês', pt: 'português', fr: 'francês', la: 'latim' };

/* Cada língua tem o seu quarteto de campos. A do baralho é a que se cobra; as
   outras duas são as respostas, e cada uma leva os seus distratores e a sua
   nota — porque o que confunde quem fala português não é o que confunde quem
   fala inglês. */
const CAMPOS_DA_LINGUA = {
  pt: { texto: 'pt', aceitas: 'aceitas',   distratores: 'distratores',   nota: 'nota',   formas: 'formasPt' },
  en: { texto: 'en', aceitas: 'aceitasEn', distratores: 'distratoresEn', nota: 'notaEn', formas: 'formasEn' },
  es: { texto: 'es', aceitas: 'aceitasEs', distratores: 'distratoresEs', nota: 'notaEs', formas: 'formasEs' },
  fr: { texto: 'fr', aceitas: 'aceitasFr', distratores: 'distratoresFr', nota: 'notaFr', formas: 'formasFr' },
  la: { texto: 'la', aceitas: 'aceitasLa', distratores: 'distratoresLa', nota: 'notaLa', formas: 'formasLa' }
};

/* De cada baralho, o público de origem: aquele em cuja língua o card é
   escrito e relido. É dele o rótulo que vai sem sufixo. */
const AUDIENCIA_PRINCIPAL = { es: 'pt', en: 'pt', pt: 'es', fr: 'pt', la: 'pt' };

/* Quem estuda cada baralho. Os três primeiros servem às outras duas línguas
   da casa; o de francês (08/10/2026) serve às três — português, espanhol e
   inglês —, e por isso o card de francês traz os três quartetos inteiros. O
   francês não é língua de resposta de nenhum outro baralho. */
const AUDIENCIAS = { es: ['pt', 'en'], en: ['pt', 'es'], pt: ['es', 'en'], fr: ['pt', 'es', 'en'], la: ['pt'] };

/* O que vem colado na frente da palavra e não faz parte dela: o artigo, e o
   «to» do infinitivo inglês. */
const ARTIGOS = {
  es: /^(el|la|los|las|un|una)\s+/,
  pt: /^(o|a|os|as|um|uma)\s+/,
  en: /^(the|a|an|to)\s+/,
  fr: /^(le\s+|la\s+|les\s+|un\s+|une\s+|l['’])/,
  la: /^(?!)/
};

const audienciasDe = idioma => AUDIENCIAS[idioma];

/* Os rótulos das formas verbais saem na língua de quem lê a pergunta:
   formasEs traz o rótulo em português (o público de origem do baralho) e
   formasEsEn o mesmo texto com o rótulo em inglês. */
const campoDasFormas = (ensinada, audiencia) =>
  CAMPOS_DA_LINGUA[ensinada].formas +
  (audiencia === AUDIENCIA_PRINCIPAL[ensinada] ? '' : audiencia[0].toUpperCase() + audiencia[1]);

const baralhos = [];
for (const idioma of IDIOMAS) {
  const pasta = path.join(pastaCards, idioma);
  if (!fs.existsSync(pasta)) continue;
  let cards = [];
  for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()) {
    const lote = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8'));
    console.log('  ' + (idioma + '/' + f).padEnd(36) + lote.length + ' cards');
    cards = cards.concat(lote.map(c => Object.assign({ idioma }, c)));
  }
  if (cards.length) baralhos.push({ idioma, cards });
}

/* ── uma terminação, um card (cards/LATIM.md §13, D26 e D27, 29/10/2026) ──
   A chave do grupo de cada flexão do latim que repete a terminação de outra
   (fonte/latim/terminacoes.js); o motor faz o resto. Ela não muda a versão do
   card: o que ele pergunta e aceita é o mesmo. */
const { terminacoes } = require('./latim/terminacoes');
for (const b of baralhos) {
  if (b.idioma !== 'la') continue;
  const t = terminacoes(b.cards);
  b.cards.forEach(c => { if (t.has(c.id)) c.terminacao = t.get(c.id); });
  console.log('  la: ' + t.size + ' flexões em ' + new Set(t.values()).size + ' terminações (uma terminação, um card)');
}

/* ── as declinações e as conjugações (pedido do Gere, 03/11/2026) ──
   Um conceito por grupo («grupo»: «2ª declinação», «1ª conjugação»…), com os exemplos gravados
   por fonte/latim/declinacoes.js. Cada flexão das palavras do grupo pede o conceito
   («grupoConceito»), que estreia antes da primeira delas. */
const { doGrupo } = require('./latim/declinacoes');
for (const b of baralhos) {
  if (b.idioma !== 'la') continue;
  const grupos = b.cards.filter(c => c.tipo === 'conceito' && c.grupo);
  const doLema = new Map();
  for (const g of grupos) b.cards.filter(c => doGrupo(c, g.grupo)).forEach(c => doLema.set(c.id, g.id));
  let n = 0;
  for (const c of b.cards) {
    if (c.tipo === 'flexao' && doLema.has(c.lema)) { c.grupoConceito = doLema.get(c.lema); n++; }
  }
  console.log('  la: ' + grupos.length + ' declinações e conjugações; ' + n + ' flexões as pedem');
}

/* ── os textos ──
   Desde 20/10/2026 (PLANO.md, seção 9) o texto vem da Biblioteca: fonte/textos/<idioma>/
   <autor>--<poema>.json, gravado por fonte/importar-texto.py, com os versos em «blocos» (cada
   um com as palavras em «p»: [pedaço, chave]) e, em «destinos», o que cada chave é — o card
   do lema, «gramatical» ou «nome». Aqui sai o «requer» de cada verso, na ordem de leitura,
   e o «requerTodas» do texto. Os textos de antes (com tradução, em fonte/textos/<idioma>/
   antigos/) ficam guardados como candidatos e não entram no app. */
const pastaTextos = path.join(__dirname, 'textos');
function cardsDoDestino(d) {
  if (!d) return [];
  if (Array.isArray(d.partes)) return d.partes.flatMap(cardsDoDestino);
  return d.card ? [d.card] : [];
}
for (const b of baralhos) {
  b.textos = [];
  const pasta = path.join(pastaTextos, b.idioma);
  if (!fs.existsSync(pasta)) continue;
  for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort()) {
    const texto = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8'));
    texto.arquivo = f;
    const destinos = texto.destinos || {};
    for (const l of (texto.blocos || []).flat()) {
      l.requer = [...new Set((l.p || []).filter(x => x[1]).flatMap(x => cardsDoDestino(destinos[x[1]])))];
      /* no latim o verso espera também as flexões (cards/LATIM.md §3.8): as das formas dele
         («flexoes», do textos.py), cada uma logo depois do lema, para estrearem na ordem de leitura */
      if (Array.isArray(l.flexoes)) {
        const lemaDe = id => (b.cards.find(c => c.id === id && c.tipo === 'flexao') || {}).lema;
        for (const f of l.flexoes.filter(lemaDe)) {
          if (l.requer.includes(f)) continue;
          let i = l.requer.indexOf(lemaDe(f));
          if (i < 0) { l.requer.push(f); continue; }
          while (i + 1 < l.requer.length && lemaDe(l.requer[i + 1]) === lemaDe(f)) i++;
          l.requer.splice(i + 1, 0, f);
        }
      }
    }
    texto.requerTodas = [...new Set((texto.blocos || []).flat().flatMap(l => l.requer))];
    b.textos.push(texto);
  }
  /* «ordem», quando há, é a ordem da lista na tela Textos (o latim: as orações primeiro); sem
     ela, a dos arquivos */
  b.textos.sort((x, y) => (typeof x.ordem === 'number' ? x.ordem : 1e9) - (typeof y.ordem === 'number' ? y.ordem : 1e9));
}

/* ── validação ──
   Duas passagens iguais: uma sobre a resposta portuguesa, outra sobre a
   inglesa. O inglês é opcional enquanto a tradução avança leva a leva —
   card sem nenhum campo inglês passa batido; card com alguns e não todos
   é erro, porque aí é tradução pela metade. */
const erros = [];
const avisos = [];
const ids = new Set();

/* Arquivo largado direto em fonte/cards/ não pertence a baralho nenhum, e
   passaria despercebido: o build não o leria e ninguém saberia por quê. */
for (const f of fs.readdirSync(pastaCards).filter(f => f.endsWith('.json'))) {
  erros.push('arquivo fora de baralho: fonte/cards/' + f + ' (tem de estar em cards/es, cards/en, cards/pt ou cards/fr)');
}
if (!baralhos.length) erros.push('nenhum baralho em fonte/cards/');

/* Os distratores precisam ter o MESMO FORMATO da resposta certa. Se só a
   resposta certa traz duas traduções separadas por "/", ou um parêntese,
   ou é bem mais longa que as outras, dá para acertar sem saber espanhol —
   basta escolher a diferente. */
function checarFormato(certa, distratores, onde, coletar) {
  if (!Array.isArray(distratores) || distratores.length !== 4) return;

  const barras = s => (s.match(/\//g) || []).length;
  const temParentese = s => s.includes('(');
  const palavras = s => s.trim().split(/\s+/).length;

  const bCerta = barras(certa);
  const iguais = distratores.filter(d => barras(d) === bCerta).length;
  if (iguais < 3) {
    coletar('formato entrega a resposta em ' + onde +
      ': a certa tem ' + bCerta + ' "/" e os distratores têm [' +
      distratores.map(barras) + ']');
  }

  const comParentese = distratores.filter(temParentese).length;
  if (temParentese(certa) && comParentese === 0) {
    coletar('só a resposta certa tem parêntese: ' + onde);
  }
  if (!temParentese(certa) && comParentese >= 3) {
    coletar('só os distratores têm parêntese: ' + onde);
  }

  const wCerta = palavras(certa);
  const wAlts = distratores.map(palavras);
  if (wCerta > Math.max(...wAlts) + 1) {
    coletar('a resposta certa é bem mais longa que os distratores: ' + onde +
      ' (' + wCerta + ' palavras contra no máximo ' + Math.max(...wAlts) + ')');
  }
  if (wCerta < Math.min(...wAlts) - 1) {
    coletar('a resposta certa é bem mais curta que os distratores: ' + onde +
      ' (' + wCerta + ' palavras contra no mínimo ' + Math.min(...wAlts) + ')');
  }
}

/* ── a categoria que só os distratores têm ──
   Um degrau acima do formato: ali é a forma que entrega a resposta, aqui é o
   assunto. Se as quatro alternativas erradas falam todas de gato e a certa
   não, dá para acertar escolhendo a diferente, sem saber espanhol. O Gere
   apontou isso em quatro cards antes de o build aprender a ver — «Nos
   pusimos morados», «No te andes por las ramas», «Aquí hay gato encerrado» e
   «Se le fue la olla».

   A conta é a palavra de conteúdo que aparece nos QUATRO distratores e não
   aparece na resposta certa, contando singular e plural como a mesma.

   Duas coisas ela NÃO pega, e é bom saber:
   — categoria por assunto sem palavra repetida (quatro frases sobre comida
     em que nenhuma palavra se repete). Isso continua sendo olho humano;
   — card de conjugação, que fica de fora de propósito: lá as cinco
     alternativas têm o mesmo verbo por construção e o que muda é o tempo,
     então a palavra comum não entrega nada.

   Sai como aviso, não como erro: a lista de palavras vazias nunca vai estar
   completa, e um falso positivo não deve barrar o baralho. */
const VAZIAS_CATEGORIA = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas ' +
  'por para pra com sem que se e ou mais menos muito pouco ele ela eles elas eu voce nao ja ao ' +
  'aos aqui ali la isso esse essa este esta seu sua meu minha ser estar ter foi era tudo nada ' +
  'algo alguem quem qual quando onde como porque ' +
  'the of to in on it is are do does did not you he she they we and or up out off his her my ' +
  'your that this an was were be been have has had with for from at by as so if but all any ' +
  'some one two what how who when where why too very much more less there here got get').split(' '));

function palavrasDeCategoria(s) {
  const saida = new Set();
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(p => p.length > 2 && !VAZIAS_CATEGORIA.has(p))
    .forEach(p => {
      saida.add(p);
      if (p.endsWith('s') && p.length > 3) saida.add(p.slice(0, -1));
    });
  return saida;
}

function checarCategoria(certa, distratores, onde, coletar) {
  if (!Array.isArray(distratores) || distratores.length !== 4) return;
  const naCerta = palavrasDeCategoria(certa);
  const conjuntos = distratores.map(palavrasDeCategoria);
  const comuns = [...conjuntos[0]].filter(p => conjuntos.every(c => c.has(p)) && !naCerta.has(p));
  if (comuns.length) {
    coletar('os quatro distratores falam de «' + comuns[0] + '» e a resposta certa não: ' +
      onde + ' — dá para acertar escolhendo a diferente');
  }
}

/* Nenhum distrator pode ser, para o motor, a resposta certa — nem repetir
   outro distrator. Vale nas duas pontas: na múltipla escolha apareceriam
   duas alternativas certas, e na escrita o texto do distrator seria aceito.
   Roda em toda direção que o card sustenta; o espanhol entra porque o
   baralho pode trazer distratoresEs, ainda que hoje nenhum card traga. */
function checarDistratores(c, direcao, campo, onde, coletar) {
  const lista = c[campo];
  if (!Array.isArray(lista) || !lista.length) return;

  const lingua = Motor.linguaDaResposta(direcao);
  const certas = new Set(Motor.respostasAceitas(c, direcao));
  const vistos = new Map();

  for (const d of lista) {
    const chave = Motor.normalizar(d, lingua);
    if (certas.has(chave)) {
      coletar('distrator que o motor lê como a resposta certa: ' + onde +
        ' → ' + d + '  (vira "' + chave + '")');
    }
    if (vistos.has(chave)) {
      coletar('dois distratores que o motor lê igual: ' + onde +
        ' → ' + vistos.get(chave) + ' / ' + d + '  (viram "' + chave + '")');
    }
    vistos.set(chave, d);

    /* E cada metade de um distrator com barra. «Me dê a mão. / Vamos
       atravessar.» passava inteiro e trazia dentro «me dê a mão», que o funil
       lê igual a «me dê uma mão» — a resposta certa do card. Quem lê a
       alternativa lê a metade, e a metade não pode estar certa. */
    if (d.includes('/')) {
      for (const parte of d.split('/')) {
        const chaveParte = Motor.normalizar(parte, lingua);
        if (chaveParte && certas.has(chaveParte)) {
          coletar('metade de distrator que o motor lê como a resposta certa: ' + onde +
            ' → ' + parte.trim() + '  (em «' + d + '»)');
        }
      }
    }
  }
}

/* ── o card que muda de gênero ──
   «Tu herman{o|a} es muy maj{o|a}» é um card só, que aparece ora no
   masculino ora no feminino (ver Motor.formaDoCard). Aqui se confere a
   marcação em si — chave fechada, dois lados, e os dois diferentes. As duas
   formas, depois, passam inteiras por todas as checagens do baralho, uma de
   cada vez: é assim que se descobre que o feminino repete outro card ou que
   um distrator virou a resposta certa de um dos lados. */
const VARIANTE = /\{([^{}|]*)\|([^{}|]*)\}/g;

function textosDoCard(v, saida) {
  if (typeof v === 'string') saida.push(v);
  else if (Array.isArray(v)) v.forEach(x => textosDoCard(x, saida));
  else if (v && typeof v === 'object') {
    Object.keys(v).forEach(k => { saida.push(k); textosDoCard(v[k], saida); });
  }
  return saida;
}

function checarVariantes(c, onde) {
  for (const t of textosDoCard(c, []).filter(t => /[{}|]/.test(t))) {
    if (/[{}|]/.test(t.replace(VARIANTE, ''))) {
      erros.push('marcação de gênero malformada: ' + onde + ' → «' + t +
        '» (a forma é {masculino|feminino})');
      continue;
    }
    let m;
    VARIANTE.lastIndex = 0;
    while ((m = VARIANTE.exec(t))) {
      if (m[1] === m[2]) {
        erros.push('marcação de gênero com os dois lados iguais: ' + onde + ' → «' + m[0] + '»');
      }
    }
  }
}

for (const { idioma, cards } of baralhos) {
  const L = CAMPOS_DA_LINGUA[idioma];
  /* o latim se confere no modo dele (só a ida, e o funil que não iguala plural nem tira o
     pronome: ver usarModo no motor); os outros, no de sempre */
  Motor.usarModo(idioma === 'la' ? 'trilhas' : 'livre');
  /* as línguas de quem estuda este baralho são as outras duas */
  const audiencias = audienciasDe(idioma);
  const textos = new Map();
  /* ── e o mesmo card pelo funil ──
     Dois textos diferentes podem ser o MESMO card para quem responde, porque
     o funil do app derruba artigo, pronome e plural: «It is not for me to
     say.» e «It's not for me to say.» viram os dois «is not for me to say»,
     e aí não há pergunta que distinga um do outro — qualquer resposta serve
     aos dois cards. O normalizar() daqui de cima não vê isso, porque para ele
     são textos diferentes. Esta segunda guarda usa a régua do motor, e as duas
     se completam: a de cima pega «él» contra «el», que o funil espanhol
     distingue de propósito. */
  const pelaRegua = new Map();

for (const bruto of cards) {
  if (ids.has(bruto.id)) erros.push('id repetido: ' + bruto.id + ' (' + bruto[L.texto] + ')');
  ids.add(bruto.id);
  checarVariantes(bruto, bruto.id + ' (' + bruto[L.texto] + ')');
  /* o campo que corrige a regra da transparência: públicos do baralho,
     graus que existem, só em palavra */
  Transp.errosDoCampo(bruto, audiencias, bruto.id + ' (' + bruto[L.texto] + ')').forEach(e => erros.push(e));
  /* o conceito fora do latim (a gramática do espanhol) tem a régua dele, mais abaixo */
  if (idioma !== 'la' && bruto.tipo === 'conceito') continue;

  /* Card comum devolve uma forma só, e o laço roda uma vez. */
  const formas = Motor.formasDoCard(bruto);
  for (let g = 0; g < formas.length; g++) {
  const c = formas[g];
  const onde = c.id + ' (' + c[L.texto] + ')' + (formas.length > 1 ? (g ? ' [feminino]' : ' [masculino]') : '');

  /* «May» (o mês) e «may» (o modal) só diferem na maiúscula: com «homografos»
     declarado, não é repetição */
  /* o card de forma do latim (LATIM.md §3.6) pergunta a mesma palavra em versos diferentes
     («nobis» no Pai-Nosso e na Ave-Maria): a frente dele é o verso, não a palavra */
  /* o contraste (PLANO.md §10) também: ele só se escolhe, e pode repetir a frase de outro card */
  /* a flexão do latim (LATIM.md §3.8) é a forma de um lema: «nostrum» de nos e de noster são
     dois cards, e «is» é o card do lema e o da flexão (a repetição se confere no bloco do latim) */
  /* a compreensão e a herança (LATIM.md §13) repetem a frase de outro card, ou o lema: a frente
     delas é a pergunta */
  /* a análise (LATIM.md §15) também: a frase de outro card, ou o verbo */
  const deForma = ['forma', 'contraste', 'flexao', 'compreensao', 'heranca', 'analise'].includes(c.tipo);
  const igual = !deForma && textos.get(normalizar(c[L.texto]));
  const homografo = igual && ((bruto.homografos || []).includes(igual) ||
    ((cards.find(x => x.id === igual) || {}).homografos || []).includes(c.id));
  if (igual && !homografo) {
    erros.push('card repetido: ' + onde + ' já existe em ' + igual);
  }
  if (!deForma) textos.set(normalizar(c[L.texto]), c.id);

  const pelaMesmaRegua = !deForma && Motor.normalizar(c[L.texto], idioma);
  /* homógrafo declarado: «the back» (as costas) e «back» (de volta) são palavras diferentes que o
     funil lê igual; o card diz em «homografos» que sabe disso, e a guarda deixa passar */
  const outro = pelaRegua.get(pelaMesmaRegua);
  const declarado = outro && ((bruto.homografos || []).includes(outro) ||
    ((cards.find(x => x.id === outro) || {}).homografos || []).includes(c.id));
  if (pelaMesmaRegua && pelaRegua.has(pelaMesmaRegua) && outro !== c.id && !declarado) {
    erros.push('o funil não distingue este card de ' + pelaRegua.get(pelaMesmaRegua) + ': ' + onde +
      ' — os dois viram «' + pelaMesmaRegua + '»');
  }
  if (pelaMesmaRegua) pelaRegua.set(pelaMesmaRegua, c.id);

  for (const campo of ['tipo', L.texto, 'nivel']) {
    if (typeof c[campo] !== 'string' || !c[campo].trim()) erros.push('falta "' + campo + '": ' + onde);
  }
  /* o card de conceito (cards/LATIM.md §3.5) só existe no latim */
  if (!(idioma === 'la' ? ['palavra', 'frase', 'conceito', 'forma', 'contraste', 'flexao', 'compreensao', 'heranca', 'analise'] : ['palavra', 'frase', 'contraste']).includes(c.tipo)) erros.push('tipo inválido: ' + onde);
  if (!NIVEIS.includes(c.nivel)) erros.push('nível inválido: ' + onde);
  if (!Array.isArray(c.tags) || !c.tags.length) erros.push('sem tags: ' + onde);

  /* Distrator escrito à mão na própria língua ensinada é raro — na volta as
     alternativas saem das formas verbais e de outros cards —, mas quando
     existe passa pela mesma régua. */
  if (c.tipo !== 'contraste') checarDistratores(c, audiencias[0] + '-' + idioma, L.distratores, onde, e => erros.push(e));

  /* Card de conjugação traz a mesma frase em quatro outros tempos. Elas têm
     dois serviços: reconhecer o tempo errado na resposta escrita, e ser as
     quatro alternativas erradas da múltipla escolha na volta (ver
     distratoresDaLingua, no motor). Com menos de quatro, a vaga que sobra é
     preenchida com frase de outro card, fora do assunto. */
  if ((c.tags || []).includes('conjugação')) {
    const n = c[L.formas] ? Object.keys(c[L.formas]).length : 0;
    if (n < 4) erros.push('card de conjugação precisa de 4 ' + L.formas + ' (tem ' + n + '): ' + onde);
  }

  /* uma forma verbal alternativa nunca pode coincidir com a resposta certa */
  if (c[L.formas]) {
    const certas = new Set(Motor.respostasAceitas(c, audiencias[0] + '-' + idioma));
    for (const f of Object.keys(c[L.formas])) {
      if (certas.has(Motor.normalizar(f, idioma))) {
        erros.push('forma verbal igual à resposta certa: ' + onde + ' → ' + f);
      }
    }
  }

  /* O espanhol certo que o card não ensina («trabajar» no card de «currar»)
     dá uma segunda chance com a primeira letra (ver Motor.sinonimoDoCard).
     Se o conferidor já o aceita, a segunda chance nunca chega — e a lista
     está dizendo que a palavra não vale enquanto o card diz que vale. */
  const campoSin = idioma === 'pt' ? 'sinonimos' : 'sinonimos' + idioma[0].toUpperCase() + idioma[1];
  if (c[campoSin] !== undefined) {
    if (!Array.isArray(c[campoSin]) || !c[campoSin].every(s => typeof s === 'string' && s.trim())) {
      erros.push(campoSin + ' tem de ser uma lista de textos: ' + onde);
    } else {
      for (const s of c[campoSin]) {
        if (Motor.conferir(c, s, audiencias[0] + '-' + idioma) === 'certo') {
          erros.push('sinônimo que o card já aceita como certo: ' + onde + ' → ' + s +
            ' (tire de "' + campoSin + '" ou das aceitas)');
        }
      }
    }
  }

  /* A palavra de outro lugar vale como certa e o app diz onde ela se usa
     (ver Motor.regionalDoCard). O lugar entra numa frase — «é como se diz
     na América Latina» —, então vem com a preposição. E não pode estar ao
     mesmo tempo entre os sinônimos, que dizem que ela não vale. */
  const campoReg = idioma === 'pt' ? 'regionais' : 'regionais' + idioma[0].toUpperCase() + idioma[1];
  if (c[campoReg] !== undefined) {
    const mapa = c[campoReg];
    if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) {
      erros.push(campoReg + ' tem de ser um objeto { variante: lugar }: ' + onde);
    } else {
      const sin = new Set((c[campoSin] || []).map(s => Motor.normalizar(s, idioma)));
      for (const [forma, lugar] of Object.entries(mapa)) {
        if (typeof lugar !== 'string' || !/^(na|no|nas|nos|em) \S/.test(lugar)) {
          erros.push('lugar sem preposição em ' + campoReg + ': ' + onde + ' → «' + forma + '»: ' + lugar +
            ' (escreva «na América Latina», «no México»…)');
        }
        if (sin.has(Motor.normalizar(forma, idioma))) {
          erros.push('a mesma palavra em ' + campoReg + ' e em ' + campoSin + ': ' + onde + ' → ' + forma);
        }
        /* com o artigo: «el sartén» da América Latina difere de «la sartén»
           só nele, e é justamente essa a diferença regional */
        const cru = t => String(t).trim().toLowerCase().replace(/[.,;:!?¿¡]/g, '');
        if (cru(forma) === cru(c[L.texto])) {
          erros.push('variante regional igual à própria resposta: ' + onde + ' → ' + forma);
        }
      }
    }
  }

  /* ── as duas línguas de quem estuda ──
     Cada uma tem de estar inteira: texto, aceitas, quatro distratores e nota.
     Card com metade de uma língua é tradução pela metade, e foi por isso que
     a regra nasceu no lado inglês do baralho espanhol.

     As checagens de formato saem como ERRO em português e como AVISO nas
     outras: o português é a língua em que o baralho é escrito e relido, e nas
     demais quem decide é a revisão, que barrar aqui travaria. */
  for (const a of audiencias) {
    /* o card só de alguns públicos («publicos») não precisa da língua dos outros */
    if (c.publicos && !c.publicos.includes(a)) continue;
    const A = CAMPOS_DA_LINGUA[a];
    const ondeA = onde + ' [' + a + ']';
    const err = e => erros.push(e);
    const reclamar = a === 'pt' ? err : (x => avisos.push(x));

    if (typeof c[A.texto] !== 'string' || !c[A.texto].trim()) {
      erros.push('falta "' + A.texto + '": ' + ondeA);
      continue;
    }
    if (typeof c[A.nota] !== 'string' || !c[A.nota].trim()) erros.push('falta "' + A.nota + '": ' + ondeA);
    /* o card de contraste (LATIM.md §3.7) pergunta em português e responde em latim, só na
       múltipla escolha: as alternativas são as do conjunto, conferidas mais abaixo */
    if (c.tipo === 'contraste') continue;
    /* a frase latina pode ter só o gabarito (cards/LATIM.md §4); a flexão de nome, que pergunta o
       caso só na múltipla escolha (§3.8), não tem aceitas */
    if (c.tipo === 'flexao' && c.familia === 'caso') { /* conferida no bloco do latim */ }
    /* a análise (LATIM.md §15) é só de escolher, com de 2 a 4 erradas: conferida no bloco do latim */
    else if (c.tipo === 'analise') continue;
    else if (!Array.isArray(c[A.aceitas]) || (!c[A.aceitas].length && !(idioma === 'la' && c.gabarito))) erros.push('sem ' + A.aceitas + ': ' + ondeA);
    /* o card de forma é só por escrito: sem distratores */
    /* o gênero (o neutro, LATIM.md §15, D38) só tem masculino e feminino para errar */
    const generos = c.tipo === 'conceito' && c.familia === 'genero';
    if (c.tipo !== 'forma' && !generos && (!Array.isArray(c[A.distratores]) || c[A.distratores].length !== 4)) {
      erros.push('precisa de exatamente 4 ' + A.distratores + ': ' + ondeA);
    }

    /* a flexão tem a régua dela, conferida no bloco do latim */
    if (c.tipo !== 'forma' && c.tipo !== 'flexao') checarDistratores(c, idioma + '-' + a, A.distratores, ondeA, err);

    /* O parêntese explica a resposta, e ninguém o escreve: «o peixe (para
       comer)» tem de aceitar «o peixe». O funil não tira o parêntese, então a
       forma nua precisa estar entre as aceitas. */
    if (c[A.texto].includes('(') && Array.isArray(c[A.aceitas])) {
      for (const parte of c[A.texto].split('/')) {
        if (!parte.includes('(')) continue;
        const nua = parte.replace(/\([^)]*\)/g, ' ').trim();
        if (nua && Motor.conferir(c, nua, idioma + '-' + a) !== 'certo') {
          erros.push('a resposta sem o parêntese não é aceita: ' + ondeA +
            ' → «' + nua + '» (ponha em "' + A.aceitas + '")');
        }
      }
    }

    checarFormato(c[A.texto], c[A.distratores], ondeA, reclamar);
    /* Conjugação fica de fora: lá as cinco alternativas têm o mesmo verbo por
       construção, e o que muda é o tempo. */
    if (!(c.tags || []).includes('conjugação') && c.tipo !== 'flexao') {
      checarCategoria(c[A.texto], c[A.distratores], ondeA, x => avisos.push(x));
    }

    /* Os rótulos das formas verbais saem na língua de quem lê a pergunta:
       formasEs traz o rótulo em português e formasEsEn o mesmo texto com o
       rótulo em inglês. O primeiro público não precisa de campo à parte. */
    if (c[L.formas] && a !== audiencias[0]) {
      const campoR = campoDasFormas(idioma, a);
      const x = Object.keys(c[L.formas]).sort().join('|');
      const y = Object.keys(c[campoR] || {}).sort().join('|');
      if (x !== y) erros.push(campoR + ' não cobre as mesmas formas de ' + L.formas + ': ' + ondeA);
      for (const [f, r] of Object.entries(c[campoR] || {})) {
        if (typeof r !== 'string' || !r.trim()) erros.push('rótulo vazio em ' + campoR + ': ' + ondeA + ' → ' + f);
      }
    }
  }

  }
}
}

Motor.usarModo('livre');

/* ── dicionário de temas ──
   Vira data/tags.js, e não um .json buscado por fetch, pela mesma razão do
   baralho: assim as páginas de revisão abrem direto do disco, sem servidor.
   A validação fica aqui, antes do process.exit dos erros. */
const arqTags = path.join(__dirname, 'tags.json');
const TAGS = fs.existsSync(arqTags) ? JSON.parse(fs.readFileSync(arqTags, 'utf8')) : null;
if (TAGS) {
  const emUso = new Set();
  baralhos.forEach(b => b.cards.forEach(c => (c.tags || []).forEach(t => emUso.add(t))));
  for (const t of emUso) if (!TAGS[t]) erros.push('tema sem tradução em fonte/tags.json: ' + t);
  for (const t of Object.keys(TAGS)) if (!emUso.has(t)) avisos.push('tema em tags.json que nenhum card usa: ' + t);
}

/* ── a frase presa a uma palavra ──
   «requer» aponta para o card da palavra que a frase põe em uso. A frase só
   entra no baralho quando aquela palavra estiver dominada, então um alvo
   errado deixaria o card preso para sempre, sem nada na tela denunciando.
   Palavra e frase são sempre do mesmo baralho. */
for (const { idioma, cards } of baralhos) {
  const L = CAMPOS_DA_LINGUA[idioma];
  const PORID = new Map(cards.map(c => [c.id, c]));

  for (const c of cards) {
    if (c.requer === undefined) continue;
    const onde = c.id + ' (' + c[L.texto] + ')';
    const alvo = PORID.get(c.requer);

    if (typeof c.requer !== 'string' || !alvo) {
      erros.push('"requer" aponta para card que não existe neste baralho: ' + onde + ' → ' + c.requer);
      continue;
    }
    if (c.tipo !== 'frase') erros.push('só frase pode ter "requer": ' + onde);
    if (alvo.tipo !== 'palavra') {
      erros.push('"requer" tem de apontar para uma palavra: ' + onde + ' → ' + c.requer +
        ' (' + alvo.tipo + ')');
    }
    /* Corrente de dois elos prenderia a segunda frase atrás de outra frase, e
       frase não chega a "dominado" por um caminho que o usuário veja como tal. */
    if (alvo.requer) erros.push('"requer" em cadeia: ' + onde + ' → ' + c.requer + ' que também requer');
    if (c.requer === c.id) erros.push('card que requer a si mesmo: ' + onde);

    /* A frase tem de usar mesmo a palavra. Aviso, e não erro: a língua
       flexiona (el vaso → los vasos, quitar → me quitó, bring → brought), e a
       comparação é por radical, então erra para menos de vez em quando. */
    if (alvo.tipo === 'palavra' && idioma !== 'la') {
      const limpar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const nucleo = limpar(Motor.formaDoCard(alvo, 0)[L.texto])
        .replace(ARTIGOS[idioma], '')
        /* «enterarse» conjugado vira «me enteré», e o radical tem de cortar
           antes da desinência para sobreviver a isso: enterarse → enter. O
           mesmo com o pronome a mais: «apañárselas» vira «me las apañaré». */
        .replace(/(ar|er|ir)se(l[oa]s?)?$/, '')
        .replace(/(ar|er|ir)$/, '');
      /* O espanhol muda o radical ao conjugar: «soler» vira «suelo»,
         «acordarse» vira «me acuerdo», «pedir» vira «pide». Sem prever isso o
         aviso dispara justamente nos verbos mais irregulares — que são os que
         mais precisam de uma frase mostrando o uso. */
      const variantes = new Set([nucleo]);
      /* o adjetivo concorda: «soso» aparece na frase como «sosa» */
      if (/[oa]$/.test(nucleo)) variantes.add(nucleo.slice(0, -1));
      if (idioma !== 'en') {
        [['o', 'ue'], ['e', 'ie'], ['e', 'i'], ['u', 'ue']].forEach(([de, para]) => {
          const i = nucleo.lastIndexOf(de);
          if (i >= 0) variantes.add(nucleo.slice(0, i) + para + nucleo.slice(i + 1));
        });
      }

      const frase = limpar(Motor.formaDoCard(c, 0)[L.texto]);
      const radicais = [...variantes]
        .map(v => v.slice(0, Math.max(4, v.length - 2)))
        .filter(Boolean);
      if (radicais.length && !radicais.some(r => frase.includes(r))) {
        avisos.push('a frase não parece usar a palavra que requer: ' + onde +
          ' → ' + alvo[L.texto] + ' (procurei ' + radicais.map(r => '"' + r + '"').join(' ou ') + ')');
      }
    }
  }

  /* ── a frase presa a TODAS as palavras dela ──
     «requerTodas» lista as palavras que a frase exige (ver o manual): a frase
     só entra no jogo quando todas estiverem dominadas ou arquivadas. Cada
     entrada é o id de um card de palavra deste baralho — ou, enquanto a
     palavra ainda não tem card, «+» seguido da forma de dicionário dela
     («+el agua»), que prende a frase até a leva que cria o card. */
  const porEs = new Map();
  cards.filter(c => c.tipo === 'palavra').forEach(c => porEs.set(normalizar(Motor.formaDoCard(c, 0)[L.texto]), c.id));
  const pendentes = new Map();
  let anotadas = 0;
  const frasesDoBaralho = cards.filter(c => c.tipo === 'frase' && !c.texto);
  for (const c of cards) {
    if (c.requerTodas === undefined) continue;
    const onde = c.id + ' (' + c[L.texto] + ')';
    /* o contraste do latim também espera conceitos, e a compreensão e a herança (LATIM.md §13)
       esperam o que a pergunta pede; os três se conferem no bloco do latim */
    if (['contraste', 'compreensao', 'heranca', 'analise'].includes(c.tipo)) continue;
    if (c.tipo !== 'frase') { erros.push('só frase pode ter "requerTodas": ' + onde); continue; }
    if (!Array.isArray(c.requerTodas)) { erros.push('"requerTodas" tem de ser uma lista: ' + onde); continue; }
    if (!c.texto) anotadas++;
    const vistos = new Set();
    for (const r of c.requerTodas) {
      if (typeof r !== 'string' || !r) { erros.push('entrada vazia em "requerTodas": ' + onde); continue; }
      if (vistos.has(r)) erros.push('palavra repetida em "requerTodas": ' + onde + ' → ' + r);
      vistos.add(r);
      if (r[0] === '+') {
        const forma = r.slice(1).trim();
        /* a palavra ganhou card e a frase ainda aponta para a forma: é para trocar pelo id */
        if (porEs.has(normalizar(forma))) {
          erros.push('"requerTodas" usa a forma de uma palavra que já tem card: ' + onde + ' → ' + r +
            ' (use ' + porEs.get(normalizar(forma)) + ')');
        }
        pendentes.set(forma, (pendentes.get(forma) || 0) + 1);
        continue;
      }
      const alvo = PORID.get(r);
      if (!alvo) erros.push('"requerTodas" aponta para card que não existe neste baralho: ' + onde + ' → ' + r);
      /* no latim a frase espera também as flexões das formas dela (LATIM.md §3.8) */
      else if (alvo.tipo !== 'palavra' && alvo.tipo !== 'flexao') erros.push('"requerTodas" tem de apontar para palavras: ' + onde + ' → ' + r);
    }
    if (c.requer && !c.requerTodas.includes(c.requer)) {
      erros.push('a palavra do «requer» tem de estar também em «requerTodas»: ' + onde + ' → ' + c.requer);
    }
  }
  if (frasesDoBaralho.length && anotadas < frasesDoBaralho.length) {
    avisos.push('[' + idioma + '] ' + (frasesDoBaralho.length - anotadas) + ' frase(s) ainda sem «requerTodas»');
  }
  if (pendentes.size) {
    avisos.push('[' + idioma + '] ' + pendentes.size + ' palavra(s) pedida(s) por frases e ainda sem card ' +
      '(as frases ficam presas até a leva que as cria)');
  }

  /* ── toda palavra tem a sua frase ──
     A palavra sozinha diz o que é; a frase diz como se usa — e é o uso que a
     definição não ensina. Toda palavra tem de aparecer em ao menos uma frase
     («requer» ou «requerTodas»). Aviso, e não erro: a palavra pode chegar
     numa leva e a frase na seguinte. */
  const comFrase = new Set(cards.filter(c => c.requer).map(c => c.requer));
  cards.forEach(c => (Array.isArray(c.requerTodas) ? c.requerTodas : []).forEach(r => comFrase.add(r)));
  /* no latim, a palavra das primeiras frases (que não prendem nada) também está em uso */
  if (idioma === 'la') cards.forEach(c => (c.palavras || []).forEach(p => { if (p.c) comFrase.add(p.c); }));
  /* o card de leitura (PLANO.md, 9.2) não tem frase de uso, de propósito */
  const soltas = cards.filter(c => c.tipo === 'palavra' && !c.leitura && !comFrase.has(c.id));
  if (soltas.length) {
    avisos.push('[' + idioma + '] ' + soltas.length + ' palavra(s) que nenhuma frase usa: ' +
      soltas.map(c => c.id + ' (' + c[L.texto] + ')').join(', '));
  }
}

/* ── o card de contraste (LATIM.md §3.7; nas línguas vivas, PLANO.md §10) ──
   A frase de quem estuda e, como alternativas, as do conjunto: a certa no campo da língua do
   baralho («la», «es»…), as outras em «distratoresLa», «distratoresEs»… Todo card do conjunto
   tem as mesmas alternativas, de 2 a 4 cards por conjunto, cada um com uma certa diferente.
   No latim são quatro, do mesmo tamanho (mudam só os casos); nas línguas vivas, 4 ou 5, e as
   erradas podem ser frases impossíveis (pedido do Gere, 23/10). «publicos» limita os cursos. */
for (const { idioma, cards } of baralhos) {
  const L = CAMPOS_DA_LINGUA[idioma];
  const PORID = new Map(cards.map(c => [c.id, c]));
  /* o contraste só se responde clicando, e o app compara o texto exato: o funil (que no espanhol
     iguala «habla» e «hablas») não conta aqui */
  const chave = t => String(t).trim();
  const opcoesDe = x => [x[L.texto]].concat(Array.isArray(x[L.distratores]) ? x[L.distratores] : []);
  for (const c of cards) {
    if (c.publicos !== undefined && (!Array.isArray(c.publicos) || !c.publicos.length ||
        c.publicos.some(a => !audienciasDe(idioma).includes(a)))) {
      erros.push('«publicos» tem de ser uma lista de públicos do baralho (' + audienciasDe(idioma).join(', ') + '): ' + c.id);
    }
    if (c.tipo !== 'contraste') continue;
    const onde = c.id + ' (' + c[L.texto] + ')';
    const opcoes = opcoesDe(c);
    const quantas = idioma === 'la' ? [4] : [4, 5];
    if (!quantas.includes(opcoes.length) || new Set(opcoes.map(chave)).size !== opcoes.length) {
      erros.push('contraste sem ' + quantas.join(' ou ') + ' alternativas diferentes: ' + onde);
    }
    if (idioma === 'la') {
      /* as mesmas palavras na mesma ordem: o mesmo número delas em todas */
      const n = o => (o.match(/[A-Za-zÀ-ÿĀ-ſ]+/g) || []).length;
      if (opcoes.some(o => n(o) !== n(c.la))) erros.push('contraste com alternativa de outro tamanho: ' + onde);
    }
    if (typeof c.conjunto !== 'string' || !c.conjunto) erros.push('contraste sem «conjunto»: ' + onde);
    const irmaos = cards.filter(x => x.tipo === 'contraste' && x.conjunto === c.conjunto);
    const chaveDas = x => opcoesDe(x).map(chave).sort().join('|');
    if (irmaos.some(x => chaveDas(x) !== chaveDas(c))) erros.push('contraste com alternativas diferentes das do conjunto ' + c.conjunto + ': ' + onde);
    if (irmaos.length < 2 || irmaos.length > 4) erros.push('conjunto de contraste com ' + irmaos.length + ' cards (2 a 4): ' + c.conjunto);
    if (new Set(irmaos.map(x => chave(x[L.texto]))).size !== irmaos.length) erros.push('dois cards do conjunto ' + c.conjunto + ' com a mesma resposta: ' + onde);
    if (new Set(irmaos.map(x => x.pt)).size !== irmaos.length) erros.push('duas perguntas iguais no conjunto ' + c.conjunto + ': ' + onde);
    const req = Array.isArray(c.requerTodas) ? c.requerTodas : [];
    if (!req.length) erros.push('contraste sem «requerTodas»: ' + onde);
    for (const r of req) {
      const alvo = PORID.get(r);
      if (!alvo || !['palavra', 'conceito'].includes(alvo.tipo)) erros.push('contraste preso a card que não é palavra nem conceito: ' + onde + ' → ' + r);
    }
    if (String(c.pt || '').length > Motor.LIMITES.resposta) erros.push('pergunta com mais de ' + Motor.LIMITES.resposta + ' letras: ' + onde);
  }
}

/* ── a gramática fora do latim (o espanhol, 03/11/2026) ──
   O card de conceito do espanhol mostra uma frase do curso («de», com o texto igual) com a
   palavra ou o trecho em destaque («w»), e as cinco alternativas são respostas da família. */
{
  const FAMILIAS_FORA = ['tempo', 'ser-estar', 'por-para', 'pronome', 'apocope'];
  const chave = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const palavras = s => String(s || '').match(/[A-Za-zÀ-ÿĀ-ſ]+/g) || [];
  const problemas = [];
  for (const b of baralhos) {
    if (b.idioma === 'la') continue;
    for (const c of b.cards.filter(x => x.tipo === 'conceito')) {
      const onde = b.idioma + '/' + c.id;
      if (!FAMILIAS_FORA.includes(c.familia)) problemas.push('conceito sem família (' + FAMILIAS_FORA.join(', ') + '): ' + onde);
      const ex = Array.isArray(c.exemplos) ? c.exemplos : [];
      if (ex.length < 4) problemas.push('conceito com menos de 4 exemplos: ' + onde);
      ex.forEach((e, i) => {
        const txt = e && e[b.idioma];
        const de = e && b.cards.find(x => x.id === e.de);
        if (!txt || !e.w || !e.exp || !de || de.tipo !== 'frase' || de[b.idioma] !== txt) {
          problemas.push('exemplo ' + (i + 1) + ' sem a frase do curso (' + b.idioma + ', w, exp, de): ' + onde); return;
        }
        const toks = palavras(txt.replace(/\{([^{}|]*)\|[^{}|]*\}/g, '$1')).map(chave), alvo = palavras(e.w).map(chave);
        if (!toks.some((t, k) => alvo.every((a, j) => toks[k + j] === a))) problemas.push('exemplo ' + (i + 1) + ' sem o destaque «' + e.w + '»: ' + onde);
        const d = e.distratores || [];
        if (d.length !== 4 || new Set(d).size !== 4 || d.includes(c.pt)) problemas.push('exemplo ' + (i + 1) + ' sem quatro erradas distintas: ' + onde);
        /* a forma de modelo entre parênteses («presente do indicativo (hablo)») não pode ser a
           própria palavra destacada: «Yo hablo español» trazia a resposta escrita (g001, 03/11/2026) */
        const modelos = [c.pt, ...d].flatMap(a => (String(a).match(/\(([^)]*)\)/g) || []).flatMap(palavras)).map(chave);
        if (c.familia === 'tempo' && alvo.some(a => a.length >= 4 && modelos.includes(a))) problemas.push('exemplo ' + (i + 1) + ': «' + e.w + '» está nos parênteses das alternativas: ' + onde);
      });
    }
  }
  if (problemas.length) { console.error('\n  ' + problemas.join('\n  ') + '\n'); process.exit(1); }
}

/* ── o latim (cards/LATIM.md) ──
   Toda frase latina traz a anotação palavra por palavra («palavras»: forma, card do lema,
   rótulo da forma, função), que faz a nota, prende a frase às palavras e ensina os casos. Aqui
   se confere que ela bate com o texto (a enclítica e o «cum» posposto vêm separados: virumque =
   virum + -que, vobiscum = vobis + cum), que o «requerTodas» é o das palavras (as primeiras
   frases, livres, têm a lista vazia), que os conceitos existem, que o gabarito abre, e o teto:
   até 10 palavras latinas e 120 letras de resposta. O card de conceito pede família e exemplos. */
const chaveLatina = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/^-/, '').replace(/j/g, 'i').replace(/v/g, 'u');
/* «construcao» (desde 24/10, o ablativo absoluto da Eneida): a pergunta é de que construção a
   palavra destacada faz parte, e não o caso dela, que seria só «ablativo» */
/* «genero» (desde 04/11, o neutro, LATIM.md §15, D38): a pergunta é o gênero da palavra destacada */
const FAMILIAS_DO_CONCEITO = ['caso', 'verbo', 'voz', 'construcao', 'declinacao', 'conjugacao', 'genero'];
/* o card de flexão (LATIM.md §3.8): a alternativa errada nunca é leitura certa; com o parêntese
   ela pode repetir a palavra da certa («ele (sujeito)» no card de eum, que aceita «ele») */
const chaveDaLeitura = t => String(t || '').toLowerCase().replace(/à/g, 'aa').replace(/(^|\s)ó(?=\s|$)/g, '$1oo').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();
for (const { idioma, cards } of baralhos) {
  if (idioma !== 'la') continue;
  const PORID = new Map(cards.map(c => [c.id, c]));
  const FLEXAO = new Map(cards.filter(c => c.tipo === 'flexao').map(c => [chaveLatina(c.la) + '|' + c.lema, c.id]));
  const semFlexao = new Map();
  for (const c of cards) {
    const onde = c.id + ' (' + c.la + ')';
    if (c.gabarito !== undefined) {
      const lista = Motor.expandirGabarito(c.gabarito);
      if (lista.erro) erros.push('gabarito malformado: ' + onde + ' → ' + lista.erro);
      else if (!lista.length) erros.push('gabarito vazio: ' + onde);
    }
    if (c.tipo === 'conceito') {
      if (!FAMILIAS_DO_CONCEITO.includes(c.familia)) erros.push('conceito sem família (' + FAMILIAS_DO_CONCEITO.join(', ') + '): ' + onde);
      const ex = Array.isArray(c.exemplos) ? c.exemplos : [];
      if (ex.length < 3) erros.push('conceito com menos de 3 exemplos: ' + onde);
      ex.forEach((e, i) => {
        if (!e || !e.la || !e.w || !e.exp || !e.fonte) { erros.push('exemplo ' + (i + 1) + ' incompleto (la, w, exp, fonte): ' + onde); return; }
        const palavrasDoEx = (e.la.match(/[A-Za-zÀ-ÿĀ-ſ]+/g) || []).map(chaveLatina);
        const w = chaveLatina(e.w);
        /* a palavra pode vir com a enclítica ou o «cum» colados: virum em «virumque» */
        if (!palavrasDoEx.some(x => x === w || ['que', 'ne', 've', 'cum'].some(s => x === w + s))) erros.push('exemplo ' + (i + 1) + ' sem a palavra destacada «' + e.w + '»: ' + onde);
      });
      continue;
    }
    if (c.tipo === 'analise') {
      /* os cards de análise (LATIM.md §15): saem de fonte/latim/analise.py. O do verbo e o da
         concordância perguntam pela frase de «de» e respondem com palavras dela; o da regência
         espera o card do verbo e responde em português */
      if (!['verbo', 'concordancia', 'regencia'].includes(c.familia)) erros.push('análise sem família (verbo, concordancia, regencia): ' + onde);
      if (typeof c.pergunta !== 'string' || !/\?$/.test(c.pergunta.trim())) erros.push('card sem «pergunta» terminada em «?»: ' + onde);
      const dis = Array.isArray(c.distratores) ? c.distratores : [];
      if (dis.length < 2 || dis.length > 4) erros.push('análise com ' + dis.length + ' erradas (de 2 a 4): ' + onde);
      if (new Set(dis.concat([c.pt]).map(chaveLatina)).size !== dis.length + 1) erros.push('análise com alternativas repetidas: ' + onde);
      if (c.familia === 'regencia') {
        const req = Array.isArray(c.requerTodas) ? c.requerTodas : [];
        const lema = PORID.get(req[0]);
        if (req.length !== 1 || !lema || lema.tipo !== 'palavra' || !(lema.tags || []).includes('verbo')) erros.push('regência que não espera o card do verbo: ' + onde);
        else if (c.la !== lema.enunciado) erros.push('regência com o verbo diferente do enunciado de ' + req[0] + ': ' + onde);
      } else {
        const de = PORID.get(c.de);
        if (!de || de.tipo !== 'frase') { erros.push('análise sem a frase de onde vem («de»): ' + onde); continue; }
        if (c.frase !== de.la) erros.push('análise com a frase diferente da de ' + c.de + ' (rode analise.py): ' + onde);
        const daFrase = new Set((de.palavras || []).map(x => chaveLatina(x.w)));
        for (const w of [c.pt].concat(dis)) if (!daFrase.has(chaveLatina(w))) erros.push('análise com alternativa que não é palavra da frase («' + w + '»): ' + onde);
        if (c.familia === 'concordancia' && !daFrase.has(chaveLatina(c.la))) erros.push('concordância com a palavra destacada fora da frase: ' + onde);
      }
      continue;
    }
    if (c.tipo === 'forma') {
      /* o card de forma (LATIM.md §3.6): sai de cards_de_forma.py; aqui se confere que ele
         ainda bate com o verso e com a anotação dele */
      const de = PORID.get(c.de);
      if (!de || de.tipo !== 'frase') { erros.push('card de forma sem o verso de onde vem («de»): ' + onde); continue; }
      if (c.frase !== de.la) erros.push('card de forma com o verso diferente do de ' + c.de + ' (rode cards_de_forma.py): ' + onde);
      const lema = PORID.get(c.lema);
      if (!lema || lema.tipo !== 'palavra') erros.push('card de forma sem o card do lema: ' + onde);
      const marcada = (de.palavras || []).filter(p => chaveLatina(p.w) === chaveLatina(c.la) && p.c === c.lema);
      if (!marcada.some(p => String(p.f || '').startsWith(c.pt) || String(p.f || '').startsWith(c.pt.replace(/ do (indicativo|subjuntivo)$/, '')))) {
        erros.push('card de forma com resposta que a anotação do verso não dá («' + c.pt + '»): ' + onde);
      }
      if (!['caso', 'verbo'].includes(c.familia)) erros.push('card de forma sem família (caso, verbo): ' + onde);
      if (Motor.conferirForma(c, c.pt) !== 'certo') erros.push('card de forma que não aceita a própria resposta: ' + onde);
      if (typeof c.sempre !== 'boolean' || typeof c.dificuldade !== 'number') erros.push('card de forma sem «sempre» e «dificuldade»: ' + onde);
      for (const g of c.conceitos || []) {
        const alvo = PORID.get(g);
        if (!alvo || alvo.tipo !== 'conceito') erros.push('conceito que não existe: ' + onde + ' → ' + g);
      }
      continue;
    }
    if (c.tipo === 'flexao') {
      const lema = PORID.get(c.lema);
      if (!lema || lema.tipo !== 'palavra') erros.push('flexão sem o card do lema: ' + onde);
      if (FLEXAO.get(chaveLatina(c.la) + '|' + c.lema) !== c.id) erros.push('flexão repetida (a mesma forma do mesmo lema): ' + onde);
      if (typeof c.analise !== 'string' || !c.analise.trim()) erros.push('flexão sem «analise»: ' + onde);
      /* a variante de uma forma que já tem card (LATIM.md §13, D29) não estreia: «rara» é true,
         e a nota da forma principal a cita */
      if (c.rara !== undefined && c.rara !== true) erros.push('flexão com «rara» que não é true: ' + onde);
      /* a flexão de nome pergunta o caso (§3.8, 26/10/2026): o sentido vai em «sentido», e nenhuma
         errada pode dividir um caso com a certa («genitivo singular» com «genitivo ou dativo
         singular» seria meia verdade) */
      if (c.familia !== undefined && c.familia !== 'caso') erros.push('flexão com família que não existe: ' + onde);
      if (c.familia === 'caso') {
        const pares = x => {
          const res = new Set();
          for (const parte of String(x).split(';')) {
            const numeros = (parte.match(/singular|plural/g) || []);
            const casos = parte.match(/nominativo|genitivo|dativo|acusativo|ablativo|vocativo|locativo/g) || [];
            if (!numeros.length || !casos.length) erros.push('flexão de caso com resposta malformada: ' + onde + ' → ' + x);
            casos.forEach(k => numeros.forEach(n => res.add(k + ' ' + n)));
          }
          return res;
        };
        if (typeof c.sentido !== 'string' || !c.sentido.trim()) erros.push('flexão de caso sem «sentido»: ' + onde);
        if (c.aceitas !== undefined || c.outras !== undefined) erros.push('flexão de caso com «aceitas» ou «outras»: ' + onde);
        const certa = pares(c.pt);
        for (const d of c.distratores || []) {
          if ([...pares(d)].some(x => certa.has(x))) erros.push('errada da flexão de caso que divide um caso com a certa: ' + onde + ' → ' + d);
        }
        if (new Set(c.distratores || []).size !== (c.distratores || []).length) erros.push('dois distratores iguais: ' + onde);
        continue;
      }
      if (c.outras !== undefined && (!Array.isArray(c.outras) || c.outras.some(x => typeof x !== 'string' || !x.trim()))) erros.push('flexão com «outras» malformado: ' + onde);
      const leituras = [c.pt].concat(c.outras || []).map(chaveDaLeitura);
      const aceitas = new Set(Motor.leiturasDaFlexao(c));
      const vistos = new Set();
      for (const d of c.distratores || []) {
        if (leituras.includes(chaveDaLeitura(d)) || (!d.includes('(') && aceitas.has(Motor.normalizarFlexao(d)))) {
          erros.push('distrator de flexão que é leitura certa: ' + onde + ' → ' + d);
        }
        if (vistos.has(chaveDaLeitura(d))) erros.push('dois distratores iguais: ' + onde + ' → ' + d);
        vistos.add(chaveDaLeitura(d));
      }
      if (Motor.conferirFlexao(c, c.pt) !== 'certo') erros.push('flexão que não aceita a própria resposta: ' + onde);
      for (const g of c.conceitos || []) {
        const alvo = PORID.get(g);
        if (!alvo || alvo.tipo !== 'conceito') erros.push('conceito que não existe: ' + onde + ' → ' + g);
      }
      continue;
    }
    /* a compreensão e a herança (LATIM.md §13, D31 e D32): a pergunta escrita no card, e o que
       elas esperam. A compreensão espera as palavras da frase (ou do conjunto de contraste); a
       palavra derivada, o lema; a expressão, nada */
    if (c.tipo === 'compreensao' || c.tipo === 'heranca') {
      if (typeof c.pergunta !== 'string' || !/\?$/.test(c.pergunta.trim())) erros.push('card sem «pergunta» terminada em «?»: ' + onde);
      const req = Array.isArray(c.requerTodas) ? c.requerTodas : null;
      if (!req) erros.push('card sem «requerTodas»: ' + onde);
      for (const r of req || []) {
        const alvo = PORID.get(r);
        if (!alvo || !['palavra', 'flexao', 'conceito'].includes(alvo.tipo)) erros.push('«requerTodas» aponta para card que não é palavra, flexão nem conceito: ' + onde + ' → ' + r);
      }
      if (c.tipo === 'compreensao') {
        if (!(req || []).length) erros.push('compreensão que não espera palavra nenhuma: ' + onde);
        if (c.de && !(PORID.get(c.de) && PORID.get(c.de).la === c.la)) erros.push('compreensão com a frase diferente da de «de»: ' + onde);
        /* o «conjunto» espaça as perguntas da mesma frase (nunca duas seguidas): o do contraste de
           onde a frase vem, ou, na frase com «de», um nome próprio */
        if (c.conjunto && !c.de && !cards.some(k => k.tipo === 'contraste' && k.conjunto === c.conjunto && [k.la].concat(k.distratoresLa || []).includes(c.la))) {
          erros.push('compreensão com frase que não é do conjunto de contraste: ' + onde);
        }
        if (!c.de && !c.conjunto) erros.push('compreensão sem «de» nem «conjunto» (de onde vem a frase conferida): ' + onde);
      } else {
        if (!['derivado', 'expressao'].includes(c.familia)) erros.push('herança sem família (derivado, expressao): ' + onde);
        if (c.familia === 'derivado' && !((req || []).length === 1 && (PORID.get(req[0]) || {}).tipo === 'palavra' && PORID.get(req[0]).la === c.la)) {
          erros.push('palavra derivada que não espera o card do lema: ' + onde);
        }
        if (c.familia === 'expressao' && (req || []).length) erros.push('expressão com «requerTodas» (tem de ser vazia): ' + onde);
      }
      continue;
    }
    if (c.tipo === 'contraste') {
      /* o latim confere aqui só a anotação; o resto é de todo baralho (mais abaixo) */
      for (const p of c.palavras || []) {
        if (p.c && !(c.requerTodas || []).includes(p.c)) erros.push('contraste com palavra fora do «requerTodas»: ' + onde + ' → ' + p.w);
      }
      for (const g of c.conceitos || []) {
        if (!(c.requerTodas || []).includes(g)) erros.push('contraste com conceito fora do «requerTodas»: ' + onde + ' → ' + g);
      }
    }
    if (c.tipo !== 'frase' && c.tipo !== 'contraste') continue;
    if (!c.fonte && c.tipo === 'frase') erros.push('frase latina sem «fonte» (a passagem de onde vem): ' + onde);
    if (String(c.pt || '').length > Motor.LIMITES.resposta) erros.push('resposta com mais de ' + Motor.LIMITES.resposta + ' letras: ' + onde);
    const pal = Array.isArray(c.palavras) ? c.palavras : null;
    if (!pal) { erros.push('frase latina sem «palavras» (a anotação): ' + onde); continue; }
    /* o trecho de texto vai até 12 quando é isso que fecha a frase (cortes.py, 04/11/2026) */
    const teto = c.texto ? 12 : 10;
    if (pal.filter(p => !String(p.w || '').startsWith('-')).length > teto) erros.push('frase latina com mais de ' + teto + ' palavras: ' + onde);
    /* o alinhamento: cada palavra do texto é uma entrada, ou duas coladas (enclítica, cum) */
    const doTexto = (c.la.match(/[A-Za-zÀ-ÿĀ-ſ]+/g) || []).map(chaveLatina);
    let j = 0, alinhou = true;
    for (const w of doTexto) {
      const um = pal[j] && chaveLatina(pal[j].w);
      const dois = pal[j + 1] && um + chaveLatina(pal[j + 1].w);
      if (um === w) j += 1;
      else if (dois === w) j += 2;
      else { alinhou = false; break; }
    }
    if (!alinhou || j !== pal.length) erros.push('as «palavras» não batem com o texto latino: ' + onde);
    for (const p of pal) {
      if (p.c === undefined) continue;
      const alvo = PORID.get(p.c);
      if (!alvo || alvo.tipo !== 'palavra') erros.push('«' + p.w + '» aponta para ' + p.c + ', que não é card de palavra: ' + onde);
    }
    /* a frase presa espera os lemas e, depois deles, as flexões das formas (LATIM.md §3.8), na
       ordem da frase; fonte/latim/flexoes.py «gravar» refaz a lista */
    const lemasDaFrase = pal.filter(p => p.c);
    const formas = lemasDaFrase.filter(p => !String(p.w).startsWith('-'));
    const flexoes = formas.map(p => FLEXAO.get(chaveLatina(p.w) + '|' + p.c)).filter(Boolean);
    const dasPalavras = [...new Set(lemasDaFrase.map(p => p.c))].concat([...new Set(flexoes)]);
    for (const p of formas) {
      const lema = PORID.get(p.c);
      if (c.tipo === 'frase' && lema && chaveLatina(p.w) !== chaveLatina(lema.la) && !FLEXAO.has(chaveLatina(p.w) + '|' + p.c)) {
        semFlexao.set(chaveLatina(p.w) + ' (' + lema.la + ')', true);
      }
    }
    const livre = (c.tags || []).includes('primeiros passos');
    const req = Array.isArray(c.requerTodas) ? c.requerTodas : [];
    if (c.tipo === 'contraste') { /* o «requerTodas» dele leva também os conceitos (acima) */ }
    else if (livre ? req.length : req.join(' ') !== dasPalavras.join(' ')) {
      erros.push((livre ? 'primeira frase com «requerTodas» (tem de ser vazia): '
        : '«requerTodas» diferente das palavras anotadas: ') + onde);
    }
    for (const g of c.conceitos || []) {
      const alvo = PORID.get(g);
      if (!alvo || alvo.tipo !== 'conceito') erros.push('conceito que não existe: ' + onde + ' → ' + g);
    }
    if (c.texto && !Number.isInteger(c.linha)) erros.push('trecho de texto sem «linha» (a ordem dele no texto): ' + onde);
    if (c.texto && !(Array.isArray(c.versos) && c.versos.length === 2 && c.versos[0] <= c.versos[1])) erros.push('trecho de texto sem «versos» (o primeiro e o último): ' + onde);
  }
  /* texto novo antes da leva das flexões dele: aviso, e não erro (rode flexoes.py «faltam») */
  if (semFlexao.size) {
    avisos.push(semFlexao.size + ' forma(s) do latim sem card de flexão (python -I fonte/latim/flexoes.py faltam): ' +
      [...semFlexao.keys()].slice(0, 12).join(', ') + (semFlexao.size > 12 ? '…' : ''));
  }
}

/* ── os textos: cobertura ──
   Toda palavra do texto tem destino (PLANO.md, 9.1): o card do lema, «gramatical» ou «nome».
   O texto só vai ao app «pronto»: sem card por fazer («+lema»), sem «conferir» e com a
   definição das palavras sem card em cada público («def» em português, «defEs», «defEn»). */
const idsDeTexto = new Set();
const CAMPO_DA_DEF = { pt: 'def', es: 'defEs', en: 'defEn' };
for (const b of baralhos) {
  const palavrasDoBaralho = new Map(b.cards.filter(c => c.tipo === 'palavra').map(c => [c.id, c]));
  b.pendentesDeTexto = 0;
  for (const txt of b.textos || []) {
    const onde = 'texto ' + (txt.id || txt.arquivo);
    const falta = [];
    if (!txt.id) erros.push(onde + ': falta o id');
    else if (idsDeTexto.has(txt.id)) erros.push(onde + ': id de texto repetido');
    idsDeTexto.add(txt.id);
    for (const campo of ['idioma', 'tipo', 'titulo', 'autor', 'biblioteca', 'blocos', 'destinos']) {
      if (!txt[campo]) erros.push(onde + ': falta «' + campo + '»');
    }
    if (txt.tipo && txt.tipo !== 'poema' && txt.tipo !== 'prosa') erros.push(onde + ': o tipo é «poema» ou «prosa», não «' + txt.tipo + '»');
    if (txt.idioma && txt.idioma !== b.idioma) erros.push(onde + ': diz idioma «' + txt.idioma + '» e está na pasta de ' + b.idioma);
    const destinos = txt.destinos || {};
    const usadas = new Set((txt.blocos || []).flat().flatMap(l => (l.p || []).filter(x => x[1]).map(x => x[1])));
    for (const ch of usadas) if (!destinos[ch]) erros.push(onde + ': a chave «' + ch + '» não tem destino');
    for (const ch of usadas) {
      const d = destinos[ch];
      if (!d) continue;
      const partes = Array.isArray(d.partes) ? d.partes : [d];
      for (const x of partes) {
        const tem = ['card', 'g'].filter(k => x[k]);
        if (tem.length !== 1) { erros.push(onde + ': «' + ch + '» precisa de um destino só (card ou g)'); continue; }
        if (x.g && x.g !== 'gramatical' && x.g !== 'nome') erros.push(onde + ': «' + ch + '» com g «' + x.g + '» (é «gramatical» ou «nome»)');
        if (x.card && x.card[0] === '+') { falta.push(x.card + (x.leitura ? ' (leitura)' : '')); continue; }
        if (x.card && !palavrasDoBaralho.has(x.card)) erros.push(onde + ': «' + ch + '» aponta para «' + x.card + '», que não é card de palavra do baralho');
        if (x.g) {
          for (const a of audienciasDe(b.idioma)) {
            const campo = CAMPO_DA_DEF[a] || ('def' + a[0].toUpperCase() + a[1]);
            const v = campo === 'def' ? (x.def || d.def) : (x[campo] || d[campo]);
            if (!v || (Array.isArray(v) && !v.length)) falta.push(campo + ' de «' + ch + '»');
          }
        }
      }
      if (d.conferir) falta.push('conferir «' + ch + '»: ' + d.conferir);
    }
    /* no latim o card é o trecho, a frase, que pode atravessar o verso (cards/LATIM.md §3.3,
       cortes.py): todo verso está em algum trecho, e cada palavra do trecho está nos versos dele */
    if (b.idioma === 'la') {
      const linhas = (txt.blocos || []).flat();
      const doTexto = b.cards.filter(c => c.tipo === 'frase' && c.texto === txt.id);
      const cobertos = new Set();
      for (const c of doTexto) {
        const [a, z] = c.versos || [0, 0];
        if (a < 1 || z > linhas.length) { erros.push(onde + ': o trecho ' + c.id + ' aponta para versos que não existem'); continue; }
        for (let k = a; k <= z; k++) cobertos.add(k);
        const req = new Set(linhas.slice(a - 1, z).flatMap(l => l.requer || []));
        for (const p of c.palavras || []) if (p.c && !req.has(p.c)) erros.push(onde + ': «' + p.w + '» do trecho ' + c.id + ' não está nos versos ' + a + '–' + z);
      }
      linhas.forEach((l, i) => { if (!cobertos.has(i + 1)) erros.push(onde + ': o verso ' + (i + 1) + ' não está em trecho nenhum'); });
    }
    if (txt.obra !== undefined && (typeof txt.obra !== 'string' || !Number.isInteger(txt.parte) || txt.parte < 1 || !txt.trecho)) {
      erros.push(onde + ': a parte de uma obra precisa de «obra», «parte» (1, 2…) e «trecho» (I, 1–7)');
    }
    txt.pronto = !falta.length;
    if (falta.length) {
      b.pendentesDeTexto++;
      const unicos = [...new Set(falta)];
      avisos.push(onde + ': ainda não vai ao app — ' + unicos.length + ' pendência(s): ' +
        unicos.slice(0, 10).join(', ') + (unicos.length > 10 ? ', …' : ''));
    }
  }
}

/* ── as partes de um texto longo (PLANO.md §9.6) ──
   Cada parte é um texto com a mesma «obra»; as partes vão de 1 a n, sem buraco, com o mesmo
   título, autor e endereço na Biblioteca, e a pessoa as aprende uma por vez, em sequência. */
for (const b of baralhos) {
  const obras = new Map();
  for (const txt of b.textos || []) if (typeof txt.obra === 'string') (obras.get(txt.obra) || obras.set(txt.obra, []).get(txt.obra)).push(txt);
  for (const [obra, partes] of obras) {
    const ns = partes.map(x => x.parte).sort((x, y) => x - y);
    if (ns.some((n, i) => n !== i + 1)) erros.push('obra ' + obra + ': as partes não vão de 1 a ' + ns.length + ' (' + ns.join(', ') + ')');
    for (const campo of ['titulo', 'autor', 'biblioteca']) {
      if (new Set(partes.map(x => x[campo])).size > 1) erros.push('obra ' + obra + ': as partes têm «' + campo + '» diferente');
    }
    if (partes.some(x => !x.pronto) && partes.some(x => x.pronto)) {
      avisos.push('obra ' + obra + ': nem todas as partes estão prontas; a que vem depois de uma pendente não aparece');
    }
  }
}

/* ── as transparentes, curso a curso (PLANO.md, 7.1 e 7.3) ──
   O grau é do curso (língua ensinada × público): «la pared» é transparente
   para quem fala português e não para quem fala inglês. Sai aqui, antes das
   estatísticas, para elas contarem, e vai para o pacote de cada curso lá
   embaixo. Junto, os dois avisos que o começo do app pede de quem escreve:
   a palavra sem tema (o nivelamento não a acha) e o banco do teste curto
   (menos de 6 temas com 3 palavras em algum nível de A1 a B2). Um aviso por
   baralho ou por curso, não um por card. */
const TRANSPARENTES = {};   // curso → Map(id → 'total' | 'parecida')
const TEMAS_DO_BANCO = 6, PALAVRAS_POR_TEMA = 3;
for (const { idioma, cards } of baralhos) {
  const L = CAMPOS_DA_LINGUA[idioma];
  const palavras = cards.filter(c => c.tipo === 'palavra');
  const semTema = idioma === 'la' ? [] : palavras.filter(c => !Motor.temaDe(c));
  if (semTema.length) {
    const mostra = 12;
    avisos.push('[' + idioma + '] ' + semTema.length + ' palavra(s) sem tema (só classe ou comportamento; ' +
      'o nivelamento não as acha): ' + semTema.slice(0, mostra).map(c => c.id + ' (' + c[L.texto] + ')').join(', ') +
      (semTema.length > mostra ? ', …' : ''));
  }
  const niveisDoBaralho = ['A1', 'A2', 'B1', 'B2'].filter(n => palavras.some(c => c.nivel === n));
  for (const a of audienciasDe(idioma)) {
    const curso = idioma + '-' + a;
    const m = new Map();
    cards.forEach(c => { const g = Transp.grau(c, idioma, a); if (g) m.set(c.id, g); });
    TRANSPARENTES[curso] = m;
    const banco = Motor.nivelamento.banco(palavras.map(c =>
      ({ id: c.id, tipo: c.tipo, nivel: c.nivel, tags: c.tags, transp: m.get(c.id) })));
    const curtos = niveisDoBaralho.map(n => {
      const temas = Object.values(banco[n] || {}).filter(ids => ids.length >= PALAVRAS_POR_TEMA).length;
      return temas < TEMAS_DO_BANCO ? n + ' tem ' + temas : null;
    }).filter(Boolean);
    if (curtos.length && idioma !== 'la') {
      avisos.push('[' + curso + '] banco do nivelamento curto — pede ' + TEMAS_DO_BANCO + ' temas com ' +
        PALAVRAS_POR_TEMA + '+ palavras por nível: ' + curtos.join(', '));
    }
  }
}
/* Os verbos que dão nome às etiquetas da conjugação mapeiam para si mesmos
   em tags.json, e não são tema; o motor os lista em TAGS_DE_CLASSE. Etiqueta
   nova desse jeito fora da lista viraria tema sem ninguém ver. */
if (TAGS_JSON_PARA_TEMA()) {
  const fora = Object.keys(TAGS_JSON_PARA_TEMA()).filter(k => {
    const x = TAGS_JSON_PARA_TEMA()[k];
    return x && x.en === k && x.es === k && !Motor.TAGS_DE_CLASSE.has(k);
  });
  if (fora.length) {
    avisos.push('etiqueta(s) que parecem nome de verbo (iguais a si mesmas em tags.json) e não estão em ' +
      'TAGS_DE_CLASSE do motor — viram tema: ' + fora.join(', '));
  }
}
function TAGS_JSON_PARA_TEMA() {
  const arq = path.join(__dirname, 'tags.json');
  return fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : null;
}

/* ── estatísticas, um bloco por baralho ── */
for (const { idioma, cards } of baralhos) {
  const L = CAMPOS_DA_LINGUA[idioma];
  const conta = (f) => cards.reduce((a, c) => { const k = f(c); a[k] = (a[k] || 0) + 1; return a; }, {});
  console.log('\n  ' + NOME_DO_IDIOMA[idioma] + ', para quem fala ' +
    audienciasDe(idioma).map(a => NOME_DO_IDIOMA[a]).join(' e '));
  console.log('  total ............ ' + cards.length);
  console.log('  por tipo ......... ' + JSON.stringify(conta(c => c.tipo)));
  console.log('  por nível ........ ' + NIVEIS.map(n => n + ':' + (conta(c => c.nivel)[n] || 0)).join('  '));

  const presas = cards.filter(c => c.requer);
  if (presas.length) {
    const palavras = new Set(presas.map(c => c.requer));
    console.log('  presas à palavra . ' + presas.length + ' frases, sobre ' + palavras.size + ' palavras');
  }

  const bar = baralhos.find(b => b.idioma === idioma);
  if ((bar.textos || []).length) {
    const prontos = bar.textos.filter(t => t.pronto).length;
    console.log('  textos .......... ' + bar.textos.length + ' da Biblioteca, ' + prontos + ' pronto(s) para o app');
  }

  for (const a of audienciasDe(idioma)) {
    const campo = CAMPOS_DA_LINGUA[a].texto;
    const feitos = cards.filter(c => typeof c[campo] === 'string' && c[campo].trim()).length;
    console.log('  em ' + NOME_DO_IDIOMA[a].padEnd(12) + ' ' + feitos + ' de ' + cards.length +
      (feitos === cards.length ? '  ✓' : '  (faltam ' + (cards.length - feitos) + ')'));
  }

  /* as transparentes de cada curso (relatório: node fonte/transparentes.js <curso>) */
  const nPalavras = cards.filter(c => c.tipo === 'palavra').length;
  const pct = n => nPalavras ? Math.round(100 * n / nPalavras) + '%' : '—';
  for (const a of audienciasDe(idioma)) {
    const m = TRANSPARENTES[idioma + '-' + a] || new Map();
    const tot = [...m.values()].filter(g => g === 'total').length;
    const par = [...m.values()].filter(g => g === 'parecida').length;
    console.log('  transparentes ' + (idioma + '-' + a) + ' ' + tot + ' total (' + pct(tot) + '), ' +
      par + ' parecida(s) (' + pct(par) + ') de ' + nPalavras + ' palavras');
  }
}

if (avisos.length) {
  console.warn('\n  ' + avisos.length + ' aviso(s) — não barram o build:');
  avisos.forEach(a => console.warn('   ~ ' + a));
}

if (erros.length) {
  console.error('\n  ' + erros.length + ' problema(s):');
  erros.forEach(e => console.error('   - ' + e));
  process.exit(1);
}

/* ── saída ──
   Um arquivo por baralho, todos no mesmo formato: data/cards-<idioma>.js, que
   põe o baralho em window.BARALHOS[idioma]. O app da Taioé carrega os
   baralhos de public/cards/data/ (ver mais abaixo).

   A data só muda quando o baralho muda. Carimbada a cada build, ela fazia todo
   build em dia novo reescrever o baralho e trocar o ?v= dele, mesmo sem card
   nenhum mexido — e o navegador baixava 860 KB de novo por nada. */
fs.mkdirSync(path.join(raiz, 'data'), { recursive: true });

const comoJs = (dados, globais) => '/* GERADO POR fonte/build.js — não edite à mão. */\n' +
  'window.BARALHOS = window.BARALHOS || {};\n' +
  globais.map(g => g + ' = ').join('') + JSON.stringify(dados) + ';\n';

const CAMPOS_SO_DA_REVISAO = ['en', 'aceitasEn', 'distratoresEn', 'notaEn', 'formasEsEn'];

for (const { idioma, cards } of baralhos) {
  const arqJson = path.join(raiz, 'data', 'cards-' + idioma + '.json');
  const legado = idioma === 'es';
  const jsonDoEspanhol = path.join(raiz, 'data', 'cards.json');

  let geradoEm = new Date().toISOString().slice(0, 10);
  try {
    const anterior = JSON.parse(fs.readFileSync(legado ? jsonDoEspanhol : arqJson, 'utf8'));
    if (JSON.stringify(anterior.cards) === JSON.stringify(cards)) geradoEm = anterior.gerado_em;
  } catch (e) { /* primeiro build, ou arquivo ilegível: vale a data de hoje */ }

  const baralho = { versao: 1, idioma: idioma, gerado_em: geradoEm, total: cards.length, cards };

  fs.writeFileSync(legado ? jsonDoEspanhol : arqJson, JSON.stringify(baralho, null, 1), 'utf8');
  if (!legado) {
    fs.writeFileSync(path.join(raiz, 'data', 'cards-' + idioma + '.js'),
      comoJs(baralho, ["window.BARALHOS['" + idioma + "']"]), 'utf8');
  }

}

/* ── o app da Taioé: public/cards/ ──
   Cada curso é um baralho respondido em português (es-pt, en-pt). O app só
   carrega o que o curso usa: do baralho de espanhol sai o lado inglês, do de
   inglês sai o lado espanhol — um terço do arquivo cada.

   Cada card ganha «v», a versão DELE: o hash do conteúdo do card na fonte
   (correção 18 do anexo do banco). Muda só quando o card muda, e é ela que
   vai em cada resposta, para a calibragem saber de que texto se fala. */
const pastaPublica = path.join(raiz, 'public', 'cards');
const dataPublica = path.join(pastaPublica, 'data');
fs.mkdirSync(dataPublica, { recursive: true });
fs.mkdirSync(path.join(pastaPublica, 'js'), { recursive: true });

const crypto = require('crypto');
const hash8 = texto => crypto.createHash('sha1').update(texto).digest('hex').slice(0, 8);

/* ── o latim com æ e œ ──
   Pedido do Gere (29/10/2026): o latim na tela com as ligaduras, como nas edições da Igreja
   (fonte/latim/ligaduras.js, com os hiatos: Israël, poëta). Só no que vai ao ar: o fonte, o
   data/ e o catálogo continuam com «ae», e a versão («v») de cada card não muda.
   Os campos que são todo latim (o «la», a frase, as palavras, o verso) mudam inteiros. Nas notas
   e nos outros campos o latim vem no meio do português («Lupus: nominativo singular…»): ali muda
   a palavra que aparece nos campos de latim e a que tem «ae» sem ser do português (o português
   quase não tem «ae», e tem muito «oe»: poema, joelho, goela). Os campos de id, de chave e de
   resposta digitada ficam como estão. */
const Ligaduras = require('./latim/ligaduras');
const NAO_LIGAR = new Set(['id', 'v', 'texto', 'tags', 'conjunto', 'de', 'requer', 'requerTodas', 'conceitos', 'c', 'card',
  'homografos', 'idioma', 'tipo', 'nivel', 'familia', 'transp', 'aceitas', 'variantes', 'publicos', 'gabarito', 'biblioteca',
  'wiki', 'g', 'obra', 'curso', 'audiencia', 'leva']);
/* o «lema» é o enunciado latino no texto e o id do card de palavra na flexão (la-p001): os dois
   podem passar pela troca */
const SO_LATIM = new Set(['la', 'frase', 'distratoresLa', 'w', 't', 'titulo', 'lema', 'dicionario', 'distratoresDicionario']);
const PT_COM_AE = ['israel', 'rafael', 'ismael', 'michael', 'maestro', 'maestros', 'aeroporto', 'aeroportos'];
function palavrasDoLatim(cards, textos) {
  const latim = new Set(), pt = new Set(PT_COM_AE);
  const junta = (t, onde) => { if (typeof t === 'string') (t.toLowerCase().match(/[a-z]+/g) || []).forEach(w => onde.add(w)); };
  cards.forEach(c => {
    if (c.tipo !== 'conceito') junta(c.la, latim);
    junta(c.frase, latim);
    (c.distratoresLa || []).forEach(t => junta(t, latim));
    (c.palavras || []).forEach(x => junta(x.w, latim));
    (c.exemplos || []).forEach(x => { junta(x.la, latim); junta(x.w, latim); });
    /* só os campos que são todo português (as explicações, como «fn» e «funcao», citam latim) */
    /* a análise do verbo e da concordância (LATIM.md §15) responde com palavras latinas */
    const respondeEmLatim = c.tipo === 'analise' && c.familia !== 'regencia';
    if (respondeEmLatim) [c.pt, ...(c.distratores || [])].forEach(t => junta(t, latim));
    [respondeEmLatim ? '' : c.pt, ...(c.aceitas || []), ...(c.tags || []), ...(c.outras || []),
      ...(c.tipo === 'palavra' || c.tipo === 'frase' || c.tipo === 'conceito' ? c.distratores || [] : [])].forEach(t => junta(t, pt));
    if (c.tipo === 'conceito') junta(c.la, pt);
  });
  (textos || []).forEach(t => {
    junta(t.titulo, latim);
    t.blocos.forEach(bl => bl.forEach(l => junta(l.t, latim)));
    Object.values(t.destinos || {}).forEach(d => [d, ...(d.partes || [])].forEach(x => {
      junta(x.lema, latim); junta(x.classe, pt);
    }));
  });
  /* a palavra dos campos de latim que também é do português não muda no meio do português */
  return { latim: new Set([...latim].filter(w => !pt.has(w))), pt };
}
/* «tipo» só chega ao campo do próprio card: o «la» do conceito é português («nominativo»), e o
   dos exemplos dele é latim */
function comLigaduras(v, lx, chave, tipo) {
  if (typeof v === 'string') {
    if (chave && NAO_LIGAR.has(chave)) return v;
    if (SO_LATIM.has(chave) && !(chave === 'la' && tipo === 'conceito')) return Ligaduras.ligar(v);
    /* o enunciado é latim com uma ou outra palavra portuguesa: «sequor, sequi, secutus sum (depoente)» */
    if (chave === 'enunciado') return v.replace(/[A-Za-z]+/g, w => (lx.pt.has(w.toLowerCase()) ? w : Ligaduras.ligarPalavra(w)));
    return v.replace(/[A-Za-z]+/g, w => {
      const k = w.toLowerCase();
      return lx.latim.has(k) || (/ae/.test(k) && !lx.pt.has(k)) ? Ligaduras.ligarPalavra(w) : w;
    });
  }
  if (Array.isArray(v)) {
    /* o verso: [[texto, chave do destino], …], e só o texto muda */
    if (chave === 'p') return v.map(x => (Array.isArray(x) ? [Ligaduras.ligar(x[0])].concat(x.slice(1)) : x));
    return v.map(x => comLigaduras(x, lx, chave, tipo));
  }
  if (v && typeof v === 'object') {
    const saida = {};
    for (const k in v) saida[k] = chave === 'destinos' ? comLigaduras(v[k], lx)
      : NAO_LIGAR.has(k) ? v[k] : comLigaduras(v[k], lx, k, typeof v.tipo === 'string' ? v.tipo : undefined);
    return saida;
  }
  return v;
}
const LIGADAS = {};
for (const b of baralhos) if (b.idioma === 'la') LIGADAS.la = palavrasDoLatim(b.cards, b.textos);
/* ── um pacote por curso ──
   Desde 07/10/2026 cada baralho serve aos dois públicos dele como cursos
   próprios: o de espanhol vira es-pt e es-en, o de inglês en-pt e en-es, o de
   português pt-es e pt-en. O pacote de cada curso leva os campos da língua
   ensinada e os do público, e deixa de fora os da terceira língua; as formas
   verbais vão com o rótulo na língua do público (formasEsEn → formasEs no
   curso es-en). Os nomes antigos, cards-es.js e cards-en.js (es-pt e en-pt),
   continuam saindo, para a aba que ainda estiver aberta na versão anterior. */
const sufixo = l => l[0].toUpperCase() + l[1];
const camposDe = l => {
  const c = CAMPOS_DA_LINGUA[l];
  return [c.texto, c.aceitas, c.distratores, c.nota,
    l === 'pt' ? 'sinonimos' : 'sinonimos' + sufixo(l), l === 'pt' ? 'regionais' : 'regionais' + sufixo(l)];
};
const ID_DO_CATALOGO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* ── a lista de frequência (PLANO.md, 7.9) ──
   fonte/frequencia/<idioma>.tsv, quando existe: a posição de cada palavra, da mais básica à
   mais rara, e a tradução curta nas línguas dos públicos. O card de palavra ganha a «pos» no
   pacote (depois do «v»: é do baralho, não muda a versão do card), e cada curso ganha
   data/lista-<curso>.js, que o nivelamento percorre. Toda palavra com card tem de estar
   na lista. */
const LISTAS = {};
const FONTES_DA_LISTA = {
  fr: 'FLELex (UCLouvain) e Lexique 4', es: 'ELELex (UCLouvain) e OpenSubtitles 2018 (FrequencyWords)',
  en: 'EFLLex (UCLouvain) e OpenSubtitles 2018 (FrequencyWords)', pt: 'OpenSubtitles 2018 (FrequencyWords)' };
for (const { idioma, cards } of baralhos) {
  const arq = path.join(raiz, 'fonte', 'frequencia', idioma + '.tsv');
  if (!fs.existsSync(arq)) continue;
  const linhas = fs.readFileSync(arq, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
  const cab = linhas[0].split('\t');
  const col = k => cab.indexOf(k);
  // a coluna da forma tem o nome da língua (fr, es, en, pt); as das traduções, o dos públicos
  const itens = linhas.slice(1).map(l => l.split('\t')).map(c => {
    const trad = {};
    audienciasDe(idioma).forEach(a => { trad[a] = col(a) >= 0 ? c[col(a)] : ''; });
    return { pos: Number(c[col('pos')]), fr: c[col(idioma)], classe: c[col('classe')], nivel: c[col('nivel')],
      trad, cards: c[col('cards')] ? c[col('cards')].split(',') : [] };
  });
  const posDe = new Map();
  itens.forEach((x, i) => {
    if (x.pos !== i + 1) { console.error('\n  ' + path.relative(raiz, arq) + ': a posição da linha ' + (i + 2) + ' devia ser ' + (i + 1) + '\n'); process.exit(1); }
    x.cards.forEach(id => posDe.set(id, x.pos));
  });
  const ids = new Set(cards.map(c => c.id));
  const fora = cards.filter(c => c.tipo === 'palavra' && !c.leitura && !posDe.has(c.id)).map(c => c.id);
  /* o card de leitura (PLANO.md, 9.2) é justamente a palavra fora da lista */
  const naLista = cards.filter(c => c.leitura && posDe.has(c.id)).map(c => c.id);
  if (naLista.length) { console.error('\n  ' + idioma + ': card de leitura que está na lista de frequência (tire o «leitura»): ' + naLista.join(', ') + '\n'); process.exit(1); }
  const sobra = [...posDe.keys()].filter(id => !ids.has(id));
  if (fora.length) console.warn('  ' + idioma + ': palavra com card fora da lista de frequência: ' + fora.join(', '));
  if (sobra.length) console.warn('  ' + idioma + ': a lista de frequência cita card que não existe: ' + sobra.join(', '));
  LISTAS[idioma] = { itens, posDe };
}

for (const { idioma, cards } of baralhos) {
  for (const audiencia of audienciasDe(idioma)) {
    const curso = idioma + '-' + audiencia;
    /* as línguas que não são nem a ensinada nem a do público: uma nos
       baralhos de três línguas, duas no de francês */
    const terceiras = IDIOMAS.filter(l => l !== idioma && l !== audiencia);
    const doApp = cards.filter(c => !c.publicos || c.publicos.includes(audiencia)).map(c => {
      if (!ID_DO_CATALOGO.test(c.id) || c.id.length > 24) {
        console.error('\n  id fora do formato do catálogo (minúsculas, números e hífens, até 24): ' + c.id + '\n');
        process.exit(1);
      }
      const limpo = Object.assign({}, c);
      terceiras.forEach(t => camposDe(t).forEach(k => { if (k !== CAMPOS_DA_LINGUA[idioma].texto) delete limpo[k]; }));
      // as formas verbais com o rótulo na língua do público
      const formas = CAMPOS_DA_LINGUA[idioma].formas, daAudiencia = campoDasFormas(idioma, audiencia);
      if (c[daAudiencia]) limpo[formas] = c[daAudiencia];
      IDIOMAS.forEach(l => { if (l !== idioma) delete limpo[formas + sufixo(l)]; });
      /* A versão do card não vê o campo «transparencia»: corrigir a regra
         da transparência não muda o que o card pergunta nem o que ele aceita,
         e não deve mudar a versão que vai em cada resposta. */
      const semCampo = Object.assign({}, c);
      delete semCampo.transparencia;
      delete semCampo.terminacao;
      delete semCampo.grupoConceito;
      limpo.v = hash8(JSON.stringify(semCampo));
      /* O grau da transparência neste curso (PLANO.md, 7.1), depois do «v»:
         ele é do curso, não do card, e não muda a versão. Só quando há grau. */
      delete limpo.transparencia;
      const grau = (TRANSPARENTES[curso] || new Map()).get(c.id);
      if (grau) limpo.transp = grau;
      const pos = LISTAS[idioma] && c.tipo === 'palavra' && LISTAS[idioma].posDe.get(c.id);
      if (pos) limpo.pos = pos;
      return limpo;
    });
    const leva = hash8(doApp.map(c => c.id + ':' + c.v).join('\n'));
    const pacote = { versao: 1, idioma: idioma, curso: curso, audiencia: audiencia, leva: leva, total: doApp.length, cards: doApp };
    const naTela = LIGADAS[idioma] ? Object.assign({}, pacote, { cards: comLigaduras(doApp, LIGADAS[idioma]) }) : pacote;
    const js = comoJs(naTela, ["window.BARALHOS['" + idioma + "']"]);
    fs.writeFileSync(path.join(dataPublica, 'cards-' + curso + '.js'), js, 'utf8');
    if (audiencia === 'pt') fs.writeFileSync(path.join(dataPublica, 'cards-' + idioma + '.js'), js, 'utf8');
    escreverCatalogo(curso, leva, doApp, audiencia);
    if (LISTAS[idioma]) {
      /* compacta: [pos, forma, classe, nível, tradução, cards] — só a tradução deste público */
      const itens = LISTAS[idioma].itens.map(x => {
        const l = [x.pos, x.fr, x.classe, x.nivel, x.trad[audiencia] || ''];
        if (x.cards.length) l.push(x.cards.join(','));
        return l;
      });
      const lista = { versao: hash8(JSON.stringify(itens)), curso: curso, itens: itens };
      fs.writeFileSync(path.join(dataPublica, 'lista-' + curso + '.js'),
        '/* GERADO POR fonte/build.js a partir de fonte/frequencia/' + idioma + '.tsv — não edite à mão.\n' +
        '   ' + FONTES_DA_LISTA[idioma] + '; CC BY-NC-SA 4.0 (ver fonte/frequencia/README.md). */\n' +
        'window.TAIOE_LISTA = ' + JSON.stringify(lista) + ';\n', 'utf8');
    }
  }
}

/* ── os temas, traduzidos ──
   A lista de cards e o filtro de tema mostram o nome do tema na língua da
   interface (07/10/2026): data/tags.js leva, de cada tema, só o «es» e o
   «en» (o nome em português é a própria chave). O de data/ na raiz, com a
   contagem, é o das páginas de revisão. */
if (TAGS) {
  const doApp = {};
  Object.keys(TAGS).sort().forEach(k => { doApp[k] = { es: TAGS[k].es || k, en: TAGS[k].en || k }; });
  const cabeca = '/* GERADO POR fonte/build.js — não edite à mão. */\n';
  fs.writeFileSync(path.join(dataPublica, 'tags.js'),
    cabeca + 'window.TAGS_RAW = ' + JSON.stringify(doApp) + ';\n', 'utf8');
  fs.writeFileSync(path.join(raiz, 'data', 'tags.js'),
    cabeca + 'window.TAGS_RAW = ' + JSON.stringify(TAGS, null, 1) + ';\n', 'utf8');
}

/* O motor do app é o mesmo das ferramentas: uma cópia byte a byte, conferida no
   CI (workflow Cópias). */
fs.copyFileSync(arqMotor, path.join(pastaPublica, 'js', 'motor.js'));

/* ── o catálogo de cada curso (anexo do banco, §3.2) ──
   fonte/sql/catalogo-<curso>.sql: a lista de cards da leva, aplicada pelo
   workflow Catálogo do taioe-infra no teste e na produção ANTES de a leva ir
   para a main. Card que saiu do baralho não é apagado: ganha arquivado_em, e o
   estado de quem o estudou continua válido. «alternativas» são os textos que a
   múltipla mostra na ida (a resposta e os distratores, nos dois gêneros): só
   eles entram no agregado de distratores (correção 16). */
function escreverCatalogo(curso, leva, doApp, audiencia) {
  const casa = CAMPOS_DA_LINGUA[audiencia || 'pt'];
  const q = t => "'" + String(t).replace(/'/g, "''") + "'";
  const lista = xs => xs.length ? 'array[' + xs.map(q).join(', ') + ']::text[]' : "'{}'::text[]";
  const linhas = doApp.map(c => {
    const alternativas = new Set();
    /* o contraste do latim mostra as quatro frases latinas do conjunto (LATIM.md §3.7) */
    const ensinada = CAMPOS_DA_LINGUA[curso.split('-')[0]];
    if (c.tipo === 'contraste') [c[ensinada.texto]].concat(c[ensinada.distratores] || []).forEach(t => alternativas.add(String(t)));
    else [0, 1].forEach(g => {
      const f = Motor.formaDoCard(c, g);
      [f[casa.texto]].concat(f[casa.distratores] || []).forEach(t => { if (t) alternativas.add(String(t)); });
    });
    const requer = typeof c.requer === 'string' ? q(c.requer) : 'null';
    return '  (' + [q(curso), q(c.id), q(c.tipo), q(c.nivel), lista(c.tags || []), requer, q(c.v),
      lista([...alternativas].sort())].join(', ') + ')';
  });
  const sql = [
    '-- GERADO POR fonte/build.js — não edite à mão.',
    '-- Catálogo do curso ' + curso + ', leva ' + leva + ', ' + doApp.length + ' cards.',
    '-- Aplicar pelo workflow Catálogo do taioe-infra (teste, depois produção), antes do push da leva.',
    '',
    'insert into cards.versoes (curso, versao, notas)',
    'values (' + q(curso) + ', ' + q(leva) + ', ' + q(doApp.length + ' cards') + ')',
    'on conflict (curso, versao) do nothing;',
    '',
    'insert into cards.catalogo (curso, card_id, tipo, nivel, tags, requer, versao, alternativas) values',
    linhas.join(',\n'),
    'on conflict (curso, card_id) do update set',
    '  tipo = excluded.tipo, nivel = excluded.nivel, tags = excluded.tags, requer = excluded.requer,',
    '  versao = excluded.versao, alternativas = excluded.alternativas, arquivado_em = null;',
    '',
    'update cards.catalogo set arquivado_em = now()',
    ' where curso = ' + q(curso) + ' and arquivado_em is null',
    '   and card_id <> all (' + lista(doApp.map(c => c.id)) + ');',
    ''
  ].join('\n');
  fs.mkdirSync(path.join(__dirname, 'sql'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'sql', 'catalogo-' + curso + '.sql'), sql, 'utf8');
}

/* ── os textos, à parte do baralho ──
   data/textos-<idioma>.js põe os textos prontos em window.TEXTOS[idioma] (o app), e
   data/textos.json lista os de todas as línguas para a Biblioteca saber em que texto pôr o
   botão «Aprender as palavras deste poema» (PLANO.md, 9.1). */
const PARA_O_APP = ['lema', 'classe', 'forma', 'funcao', 'def', 'defEs', 'defEn', 'wiki', 'card', 'g', 'leitura'];
const prontos = [];
for (const b of baralhos) {
  const textos = (b.textos || []).filter(t => t.pronto).map(t => {
    const destinos = {};
    Object.keys(t.destinos).forEach(ch => {
      const d = t.destinos[ch], x = {};
      PARA_O_APP.forEach(k => { if (d[k] !== undefined) x[k] = d[k]; });
      if (Array.isArray(d.partes)) x.partes = d.partes.map(p => { const y = {}; PARA_O_APP.forEach(k => { if (p[k] !== undefined) y[k] = p[k]; }); return y; });
      destinos[ch] = x;
    });
    const saida = { id: t.id, idioma: t.idioma, tipo: t.tipo, titulo: t.titulo, autor: t.autor, ano: t.ano,
      biblioteca: t.biblioteca, blocos: t.blocos.map(bl => bl.map(l => ({ t: l.t, p: l.p, requer: l.requer }))),
      requerTodas: t.requerTodas, destinos };
    if (typeof t.fila === 'number') saida.fila = t.fila;
    if (t.obra) Object.assign(saida, { obra: t.obra, parte: t.parte, trecho: t.trecho });
    prontos.push(Object.assign({ id: t.id, idioma: t.idioma, tipo: t.tipo, titulo: t.titulo, autor: t.autor, biblioteca: t.biblioteca },
      t.obra ? { obra: t.obra, parte: t.parte, trecho: t.trecho } : {}));
    return saida;
  });
  const pacote = { versao: 3, idioma: b.idioma, total: textos.length, textos };
  fs.writeFileSync(path.join(raiz, 'data', 'textos-' + b.idioma + '.json'),
    JSON.stringify(pacote, null, 1), 'utf8');
  const js = '/* GERADO POR fonte/build.js — não edite à mão. */\n' +
    'window.TEXTOS = window.TEXTOS || {};\n' +
    "window.TEXTOS['" + b.idioma + "'] = " + JSON.stringify(pacote) + ';\n';
  fs.writeFileSync(path.join(raiz, 'data', 'textos-' + b.idioma + '.js'), js, 'utf8');
  const naTela = LIGADAS[b.idioma] ? Object.assign({}, pacote, { textos: comLigaduras(textos, LIGADAS[b.idioma]) }) : pacote;
  fs.writeFileSync(path.join(dataPublica, 'textos-' + b.idioma + '.js'), '/* GERADO POR fonte/build.js — não edite à mão. */\n' +
    'window.TEXTOS = window.TEXTOS || {};\n' +
    "window.TEXTOS['" + b.idioma + "'] = " + JSON.stringify(naTela) + ';\n', 'utf8');
}
fs.writeFileSync(path.join(dataPublica, 'textos.json'), JSON.stringify({ versao: 1, textos: prontos }) + '\n', 'utf8');

/* ── os candidatos a texto ──
   Nada disso é card nem trilha: é a lista do que PODE virar trilha, para o
   Gere ler e aprovar em escolher-textos.html. Sai em data/candidatos-<idioma>.js
   e não toca no baralho. O texto aprovado vira um arquivo em fonte/textos/,
   escrito à mão, com os cards de verso — a aprovação é o começo do trabalho,
   e não o fim. */
const pastaCandidatos = path.join(__dirname, 'candidatos');
if (fs.existsSync(pastaCandidatos)) {
  for (const f of fs.readdirSync(pastaCandidatos).filter(f => f.endsWith('.json')).sort()) {
    const idioma = f.replace(/.json$/, '');
    const lista = JSON.parse(fs.readFileSync(path.join(pastaCandidatos, f), 'utf8'));
    const pacote = { versao: 1, idioma: idioma, total: lista.length, candidatos: lista };
    fs.writeFileSync(path.join(raiz, 'data', 'candidatos-' + idioma + '.json'),
      JSON.stringify(pacote, null, 1), 'utf8');
    fs.writeFileSync(path.join(raiz, 'data', 'candidatos-' + idioma + '.js'),
      '/* GERADO POR fonte/build.js — não edite à mão. */\n' +
      'window.CANDIDATOS = window.CANDIDATOS || {};\n' +
      "window.CANDIDATOS['" + idioma + "'] = " + JSON.stringify(pacote) + ';\n', 'utf8');
    console.log('  ' + ('candidatos/' + f).padEnd(36) + lista.length + ' textos para aprovar');
  }
}

/* ── carimbo de versão nos assets ──
   Sem isso o navegador pode servir um data/cards.js velho junto de um
   index.html novo, misturando baralho antigo com código novo.

   O carimbo é de CADA arquivo, tirado do conteúdo dele. Antes era um só para
   todos, e mexer numa linha do CSS obrigava o navegador a baixar de novo o
   baralho inteiro. Agora só muda o ?v= de quem mudou — e a página só é
   regravada se algum carimbo dela mudou. */
const assets = [
  'style.css', 'style-revisao.css', 'style-professor.css',
  'js/motor.js', 'js/github.js', 'js/app.js',
  'js/revisao.js',
  'data/tags.js', 'data/historico.js',
  'data/cards-es.js', 'data/cards-en.js', 'data/cards-pt.js', 'data/cards-fr.js',
  'data/textos-es.js', 'data/textos-en.js', 'data/textos-pt.js',
  'data/candidatos-es.js', 'js/revisao.js', 'js/escolher-textos.js'
].filter(a => fs.existsSync(path.join(raiz, a)));   // as páginas de revisão podem ainda não existir

const versaoDe = {};
for (const a of assets) {
  versaoDe[a] = crypto.createHash('sha1')
    .update(fs.readFileSync(path.join(raiz, a))).digest('hex').slice(0, 8);
}

let trocadas = 0;
for (const pagina of fs.readdirSync(raiz).filter(f => f.endsWith('.html'))) {
  const caminho = path.join(raiz, pagina);
  const antes = fs.readFileSync(caminho, 'utf8');
  let html = antes;
  for (const a of assets) {
    const escapado = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp('(href|src)="' + escapado + '(\\?v=[^"]*)?"', 'g'),
      '$1="' + a + '?v=' + versaoDe[a] + '"'
    );
  }
  if (html !== antes) { fs.writeFileSync(caminho, html, 'utf8'); trocadas++; }
}

/* As páginas do app carimbam os arquivos de public/cards/, com o caminho
   relativo a elas (js/app.js, data/cards-es.js…). O baralho é carregado por
   script, e o carimbo dele vai para o js/versoes.js. */
const assetsDoApp = [];
(function listar(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) listar(p);
    else if (/\.(js|css|woff2)$/.test(f.name) && f.name !== 'versoes.js') assetsDoApp.push(path.relative(pastaPublica, p).split(path.sep).join('/'));
  }
})(pastaPublica);
const versaoDoApp = {};
for (const a of assetsDoApp) versaoDoApp[a] = hash8(fs.readFileSync(path.join(pastaPublica, a)));
const versoesJs = '/* GERADO POR fonte/build.js — não edite à mão. */\nwindow.CARDS_VERSOES = ' +
  JSON.stringify(Object.fromEntries(Object.entries(versaoDoApp).filter(([a]) => a.startsWith('data/')))) + ';\n';
const arqVersoes = path.join(pastaPublica, 'js', 'versoes.js');
if (!fs.existsSync(arqVersoes) || fs.readFileSync(arqVersoes, 'utf8') !== versoesJs) fs.writeFileSync(arqVersoes, versoesJs, 'utf8');
versaoDoApp['js/versoes.js'] = hash8(versoesJs);
/* as páginas de public/cards/ e das subpastas (a curadoria), com o caminho relativo a cada uma */
const paginasDoApp = fs.readdirSync(pastaPublica).filter(f => f.endsWith('.html')).map(f => [f, ''])
  .concat(fs.readdirSync(pastaPublica, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(pastaPublica, d.name, 'index.html')))
    .map(d => [path.join(d.name, 'index.html'), '../']));
for (const [pagina, prefixo] of paginasDoApp) {
  const caminho = path.join(pastaPublica, pagina);
  const antes = fs.readFileSync(caminho, 'utf8');
  let html = antes;
  for (const a of Object.keys(versaoDoApp)) {
    const escapado = (prefixo + a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp('(href|src)="' + escapado + '(\\?v=[^"]*)?"', 'g'),
      '$1="' + prefixo + a + '?v=' + versaoDoApp[a] + '"');
  }
  if (html !== antes) { fs.writeFileSync(caminho, html, 'utf8'); trocadas++; }
}

console.log('\n  ok → ' + baralhos.map(b => b.idioma === 'es'
  ? 'data/cards.json'
  : 'data/cards-' + b.idioma + '.js').join(', ') +
  '; app em public/cards/data/; catálogo em fonte/sql/');
console.log('  carimbo ?v= por arquivo; ' + trocadas + ' página(s) regravada(s)\n');
