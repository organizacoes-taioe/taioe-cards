/* Confere o aviso da pergunta lida como espanhol (Motor.leituraEspanhola), na volta pt→es: a
   pergunta é «a cola», pede «el pegamento», e quem lê «cola» como espanhol responde «a fila», a
   tradução dela. Certo, na língua errada: o app avisa e devolve a vez.

   Para cada card do baralho es, cada pergunta e cada card cujo espanhol é essa pergunta lida como
   espanhol (sem o parêntese e sem o artigo português), cada tradução desse outro card, dada como
   resposta, tem de disparar o aviso — a não ser que o motor a conte como certa ou «quase», porque
   aí o app nem pergunta. Até 25/10/2026 a pergunta com artigo («a cola», «o rato», «a pasta»)
   nunca disparava: a chave ficava com o artigo, e o índice não tem artigo.

   uso: node fonte/testar-leitura.js */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const janela = {};
new Function('window', fs.readFileSync(path.join(raiz, 'js', 'motor.js'), 'utf8'))(janela);
const Motor = janela.Motor;
const cards = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'cards.json'), 'utf8')).cards;
const indice = Motor.indiceEspanhol(cards);

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const ARTIGO_PT = /^\s*(o|a|os|as|um|uma|uns|umas)\s+/i;
const lidaComoEspanhol = (t) => semAcento(Motor.normalizar(t.replace(/\([^)]*\)/g, ' ').replace(ARTIGO_PT, ''), 'es'));
const porEspanhol = new Map();
cards.forEach((c) => {
  if (!c.es || /[{]/.test(c.es)) return;           // o card de gênero entra pelo índice, não aqui
  const k = lidaComoEspanhol(c.es);
  porEspanhol.set(k, (porEspanhol.get(k) || []).concat([c]));
});

let casos = 0, comArtigo = 0;
const falhas = [], cardsComArtigo = new Set();
cards.forEach((c) => {
  if (!c.pt || /[{]/.test(c.pt)) return;
  String(c.pt).split('/').forEach((pergunta) => {
    const outros = (porEspanhol.get(lidaComoEspanhol(pergunta)) || [])
      .filter((d) => d.id !== c.id && lidaComoEspanhol(d.es) !== lidaComoEspanhol(c.es));
    const propria = Motor.normalizar(pergunta.replace(/\([^)]*\)/g, ' '), 'pt');
    outros.forEach((d) => {
      String(d.pt).split('/').concat(d.aceitas || []).forEach((resposta) => {
        resposta = resposta.replace(/\([^)]*\)/g, ' ').trim();
        if (!resposta || Motor.normalizar(resposta, 'pt') === propria) return;
        if (Motor.conferir(c, resposta, 'pt-es') !== 'errado') return;
        casos++;
        if (ARTIGO_PT.test(pergunta)) { comArtigo++; cardsComArtigo.add(c.id); }
        if (!Motor.leituraEspanhola(c, resposta, 'pt-es', indice)) {
          falhas.push(`${c.id} «${pergunta.trim()}» → «${resposta}» (lido como ${d.id} «${d.es}»)`);
        }
      });
    });
  });
});

// O caso do comentário que achou o defeito (p102, 22/10/2026).
const p102 = cards.find((c) => c.id === 'p102');
if (!p102 || !Motor.leituraEspanhola(p102, 'a fila', 'pt-es', indice)) falhas.push('p102 «a cola» → «a fila»');

if (falhas.length) {
  console.log(`\n  ${falhas.length} de ${casos} leitura(s) espanhola(s) sem aviso:`);
  falhas.slice(0, 40).forEach((f) => console.log('   ' + f));
  process.exit(1);
}
console.log(`\n  ${casos} leituras espanholas avisadas, ${comArtigo} delas de pergunta com artigo (${cardsComArtigo.size} cards)\n`);
