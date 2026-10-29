/* ────────────────────────────────────────────────────────────────
   fonte/latim/terminacoes.js — os grupos de «uma terminação, um card»
   (cards/LATIM.md §13, D26 e D27, pedido do Gere, 29/10/2026).

   Duas flexões ficam no mesmo grupo quando a pessoa que aprendeu uma já sabe
   ler a outra:
   - nomes e adjetivos (a flexão que pergunta o caso): a mesma declinação (o
     neutro à parte), o mesmo final depois do radical e a mesma resposta —
     «aquae» e «rosae» (-ae, 1ª: genitivo ou dativo singular; nominativo
     plural). O radical sai do enunciado do lema: o genitivo sem a terminação
     da declinação («deus, dei» → de-); no adjetivo, o feminino sem o -a
     («bonus, bona» → bon-) ou, no de 3ª, o lema sem o -is;
   - verbos regulares (os que o lema marca com a conjugação): a mesma
     conjugação, a mesma análise inteira (tempo, modo, pessoa, voz e as outras
     leituras) e as duas últimas letras — «amat» e «laudat».
   Ficam fora os pronomes, os irregulares (sum, possum, volo…), o que o
   radical não explica (di, dii) e o grupo de um card só.

   O build grava a chave em cada card do grupo («terminacao», no pacote do
   app), e o motor faz o resto (Motor.ativoDaTerminacao). O testar-latim.js
   confere os grupos.
   ──────────────────────────────────────────────────────────────── */
'use strict';

const chave = w => String(w || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/j/g, 'i').replace(/v/g, 'u');
const FIM_DO_GENITIVO = { 1: 'ae', 2: 'i', 3: 'is', 4: 'us', 5: 'ei' };

function deNome(c, lema) {
  const tags = (lema.tags || []).join(' ');
  if (/pronome/.test(tags)) return null;
  const enunciado = String(lema.enunciado || '');
  const partes = enunciado.split(',').map(s => s.trim());
  const forma = chave(c.la), la = chave(lema.la);
  const segunda = chave((partes[1] || '').split(' ')[0]);
  let radical = null, classe = null;
  const decl = tags.match(/([1-5])ª declinação/);
  if (/adjetivo/.test(tags)) {
    if (partes.length >= 3 && segunda.endsWith('a')) { classe = 'adjetivo de 1ª e 2ª'; radical = segunda.slice(0, -1); }
    else if (segunda.endsWith('e') && la.endsWith('is')) { classe = 'adjetivo de 3ª'; radical = la.slice(0, -2); }
    else if (segunda.endsWith('is')) { classe = 'adjetivo de 3ª'; radical = segunda.slice(0, -2); }
  } else if (decl && partes[1] && !partes[1].startsWith('-')) {
    const fim = FIM_DO_GENITIVO[decl[1]];
    if (segunda.endsWith(fim)) radical = segunda.slice(0, -fim.length);
    else if (decl[1] === '5' && segunda.endsWith('i')) radical = segunda.slice(0, -1);
    classe = decl[1] + 'ª declinação' + ((enunciado.match(/\b(m|f|n)\.$/) || [])[1] === 'n' ? ', neutro' : '');
  }
  if (!radical || !forma.startsWith(radical)) return null;
  return classe + ': -' + forma.slice(radical.length) + ' → ' + c.pt;
}

/* No perfeito e no particípio perfeito, só o radical que a conjugação prevê (laudavi, laudatum;
   timui; audivi, auditum): dixit, vicit, stetit e passus pedem o card próprio. */
const PERFEITO_REGULAR = { 1: ['aui', 'atum'], 2: ['ui', 'itum'], 4: ['iui', 'itum'] };

function deVerbo(c, lema) {
  const conj = (lema.tags || []).join(' ').match(/([1-4])ª conjugação/);
  if (!conj || /irregular/.test((lema.tags || []).join(' '))) return null;
  const analise = String(c.analise || '').trim();
  if (!analise) return null;
  if (/perfeito/.test(analise)) {
    const partes = String(lema.enunciado || '').split(',').map(s => chave(s.trim().split(' ')[0]));
    const participio = /particípio/.test(analise);
    const parte = participio ? partes[3] : partes[2];
    const fim = (PERFEITO_REGULAR[conj[1]] || [])[participio ? 1 : 0];
    if (!fim || !parte || !parte.endsWith(fim)) return null;
  }
  return conj[1] + 'ª conjugação: ' + analise + ' (-' + chave(c.la).slice(-2) + ')';
}

/* id → chave, só dos grupos de dois cards ou mais. */
function terminacoes(cards) {
  const porId = new Map(cards.map(c => [c.id, c]));
  const grupos = new Map();
  for (const c of cards) {
    if (c.tipo !== 'flexao' || c.rara) continue;
    const lema = porId.get(c.lema);
    if (!lema) continue;
    const k = c.familia === 'caso' ? deNome(c, lema) : deVerbo(c, lema);
    if (!k) continue;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(c.id);
  }
  const saida = new Map();
  for (const [k, ids] of grupos) if (ids.length > 1) ids.forEach(id => saida.set(id, k));
  return saida;
}

module.exports = { terminacoes, deNome, deVerbo };
