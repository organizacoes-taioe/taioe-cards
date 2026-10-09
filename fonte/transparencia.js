/* ────────────────────────────────────────────────────────────────
   fonte/transparencia.js — a regra das palavras transparentes (PLANO.md,
   seção 7.1; manual, seção 19). Quem usa: o build, que põe «transp» em
   cada card do pacote de cada curso, e o relatório
   `node fonte/transparentes.js <curso>`, que lista os dois grupos para a
   leitura do Gere. A regra mora só aqui, para os dois nunca discordarem.

   Transparente é a palavra que quem estuda já entende sem estudar, porque
   é a mesma na língua dele. É propriedade do CURSO (língua ensinada ×
   público), não do card: «la pared» é transparente para quem fala
   português e não para quem fala inglês. Dois graus, só em `tipo: palavra`:

     total     a forma sem acento e sem o artigo da frente é igual nas duas
               línguas («la madrugada» / «a madrugada»). Sai do jogo e conta
               como dominada para sempre;
     parecida  uma letra de diferença (palavra de 5+ letras) ou duas (8+), na
               mesma comparação («la pared» / «a parede»). Estreia na volta.

   Ficam de fora das duas: o gênero diferente quando as duas línguas têm
   artigo («la leche» / «o leite» — o gênero é a lição); `falso-amigo`;
   resposta com «/» (dois sentidos) ou com parêntese; `conjugação`. O inglês
   não tem gênero, e aí só a grafia conta.

   A regra erra, e a curadoria corrige: o campo opcional
   `transparencia: { "<público>": "nenhuma" | "parecida" | "total" }` manda
   sobre ela naquele público.
   ──────────────────────────────────────────────────────────────── */

const GRAUS = ['nenhuma', 'parecida', 'total'];

/* ── artigo e gênero, por língua ──
   O artigo da frente sai da comparação e diz o gênero. «les» e o «l'»
   elidido do francês são artigo sem gênero visível: saem da comparação e
   não entram na conferência de gênero. O inglês não tem gênero: o «the», o
   «a» e o «to» do infinitivo só saem da frente. Língua nova entra aqui. */
const ARTIGOS = {
  es: { el: 'm', los: 'm', un: 'm', unos: 'm', la: 'f', las: 'f', una: 'f', unas: 'f' },
  pt: { o: 'm', os: 'm', um: 'm', uns: 'm', a: 'f', as: 'f', uma: 'f', umas: 'f' },
  fr: { le: 'm', un: 'm', la: 'f', une: 'f', les: null, des: null, "l'": null },
  en: { the: null, a: null, an: null, to: null }
};
const COM_GENERO = new Set(['es', 'pt', 'fr']);

/* O card que muda de gênero traz «{o|a}»: a regra olha a forma masculina,
   que é a canônica (a mesma que a lista e o painel mostram). */
const masculino = t => String(t || '').replace(/\{([^{}|]*)\|([^{}|]*)\}/g, '$1');

/* Separa o artigo da frente do resto. O «l'» elidido vem colado. */
function partes(texto, lingua) {
  let t = masculino(texto).trim().toLowerCase().normalize('NFC').replace(/[’´`]/g, "'");
  const tabela = ARTIGOS[lingua] || {};
  if (lingua === 'fr' && /^l'/.test(t)) return { artigo: "l'", genero: null, nucleo: t.slice(2) };
  const m = t.match(/^(\S+)\s+(.+)$/);
  if (m && Object.prototype.hasOwnProperty.call(tabela, m[1])) {
    return { artigo: m[1], genero: tabela[m[1]], nucleo: m[2] };
  }
  return { artigo: null, genero: null, nucleo: t };
}

/* Sem acento, sem cedilha, sem pontuação. O «ñ» fica: ele é OUTRA LETRA
   (o motor cobra a diferença entre «año» e «ano»), e escrevê-lo é a lição
   que a palavra «parecida» vai dar na volta. */
function semAcento(t) {
  return String(t || '')
    .replace(/ñ/g, '\u0001')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function distancia(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let ant = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    ant = atual;
  }
  return ant[n];
}

/* O texto da resposta em cada língua: «pt» é o campo do português, as
   outras levam o próprio código («es», «en», «fr»). */
const campoDe = l => l;

/* O que a REGRA diz, sem olhar o campo «transparencia». Devolve
   { grau: 'total' | 'parecida' | null, motivo } — o motivo é para o
   relatório («falso-amigo», «gênero», «barra»…). */
function pelaRegra(card, ensinada, publico) {
  if (!card || card.tipo !== 'palavra') return { grau: null, motivo: 'não é palavra' };
  const tags = card.tags || [];
  if (tags.includes('falso-amigo')) return { grau: null, motivo: 'falso-amigo' };
  if (tags.includes('conjugação')) return { grau: null, motivo: 'conjugação' };
  const daL = card[campoDe(ensinada)], daA = card[campoDe(publico)];
  if (typeof daL !== 'string' || typeof daA !== 'string' || !daL.trim() || !daA.trim()) {
    return { grau: null, motivo: 'sem texto' };
  }
  if (/[\/(]/.test(daA)) return { grau: null, motivo: 'barra ou parêntese' };

  const x = partes(daL, ensinada), y = partes(daA, publico);
  if (COM_GENERO.has(ensinada) && COM_GENERO.has(publico)) {
    /* substantivo de um lado, sem artigo do outro: não é a mesma palavra */
    if (!!x.artigo !== !!y.artigo) return { grau: null, motivo: 'artigo de um lado só' };
    if (x.genero && y.genero && x.genero !== y.genero) return { grau: null, motivo: 'gênero' };
  }
  const a = semAcento(x.nucleo), b = semAcento(y.nucleo);
  if (!a || !b) return { grau: null, motivo: 'vazio' };
  if (a === b) return { grau: 'total', motivo: 'igual' };
  const letras = Math.min(a.replace(/ /g, '').length, b.replace(/ /g, '').length);
  const d = distancia(a, b);
  if ((d <= 1 && letras >= 5) || (d <= 2 && letras >= 8)) return { grau: 'parecida', motivo: d + ' letra(s)' };
  return { grau: null, motivo: 'diferente' };
}

/* O grau no curso: o campo «transparencia» do card, quando diz algo sobre
   este público, manda sobre a regra. Devolve
   { grau: 'total' | 'parecida' | null, regra, manual } — «regra» é o que a
   regra sozinha diria, «manual» o valor do campo (ou undefined). */
function avaliar(card, ensinada, publico) {
  const regra = pelaRegra(card, ensinada, publico);
  const manual = card && card.transparencia && typeof card.transparencia === 'object'
    ? card.transparencia[publico] : undefined;
  if (manual !== undefined && GRAUS.includes(manual)) {
    return { grau: manual === 'nenhuma' ? null : manual, regra: regra, manual: manual };
  }
  return { grau: regra.grau, regra: regra, manual: undefined };
}

function grau(card, ensinada, publico) {
  return avaliar(card, ensinada, publico).grau;
}

/* A conferência do campo, para o build: objeto, chaves entre os públicos
   do baralho, valores entre os três graus, só em palavra. */
function errosDoCampo(card, publicos, onde) {
  const v = card.transparencia;
  if (v === undefined) return [];
  const saida = [];
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return ['«transparencia» tem de ser um objeto { público: grau }: ' + onde];
  }
  if (card.tipo !== 'palavra') saida.push('«transparencia» só vale em palavra: ' + onde);
  for (const [k, g] of Object.entries(v)) {
    if (!publicos.includes(k)) {
      saida.push('«transparencia» com público que o baralho não tem: ' + onde + ' → «' + k +
        '» (os públicos são ' + publicos.join(', ') + ')');
    }
    if (!GRAUS.includes(g)) {
      saida.push('«transparencia» com grau inválido: ' + onde + ' → ' + k + ': «' + g +
        '» (vale ' + GRAUS.join(', ') + ')');
    }
  }
  return saida;
}

module.exports = { GRAUS, ARTIGOS, pelaRegra, avaliar, grau, errosDoCampo, semAcento, distancia };
