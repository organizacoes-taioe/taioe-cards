/* Confere a régua do «deu quase» (Motor.conferir e Motor.parecido), a de 12/11/2026:
     1. um erro só: pergunta (letra trocada, a mais, a menos, duas letras vizinhas invertidas ou
        duas palavras vizinhas invertidas);
     2. mais de um: pergunta se os erros não passam de 20% das letras da resposta certa.
   Sem piso de tamanho e sem erro seco por tipo de erro (gênero, forma do verbo, ñ).

   uso: node fonte/testar-quase.js */
const fs = require('fs');
const path = require('path');

const janela = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', 'motor.js'), 'utf8'))(janela);
const M = janela.Motor;

let falhas = 0, feitos = 0;
function ok(cond, nome) {
  feitos++;
  if (!cond) { falhas++; console.log('  ✗ ' + nome); }
}
const palavra = (es, pt, mais) => Object.assign({ id: 'x', tipo: 'palavra', es: es, pt: pt }, mais);
const frase = (es, pt, mais) => Object.assign({ id: 'y', tipo: 'frase', es: es, pt: pt }, mais);
const ida = (c, t) => M.conferir(c, t, 'es-pt');      // responde em português
const volta = (c, t) => M.conferir(c, t, 'pt-es');    // responde em espanhol

/* ── regra 1: um erro ── */
const carta = palavra('la carta', 'a carta');
ok(volta(carta, 'la carta') === 'certo', 'igual: certo');
ok(volta(carta, 'la cata') === 'quase', 'uma letra a menos');
ok(volta(carta, 'la cartas') !== 'errado', 'uma letra a mais');
ok(volta(carta, 'la corta') === 'quase', 'uma letra trocada');
ok(volta(carta, 'la crata') === 'quase', 'duas letras vizinhas invertidas');
ok(volta(carta, 'la corte') === 'errado', 'dois erros em cinco letras: erro');

const sol = palavra('el sol', 'o sol');
ok(volta(sol, 'sal') === 'quase' && ida(sol, 'sal') === 'quase', 'sem piso: um erro em palavra de três letras');
const ya = palavra('ya', 'já');
ok(volta(ya, 'ys') === 'quase', 'sem piso: um erro em palavra de duas letras');
ok(volta(ya, 'no') === 'errado', 'duas letras erradas de duas: erro');

const sitio = frase('No hay sitio.', 'Não há lugar.');
ok(volta(sitio, 'hay no sitio') === 'quase', 'duas palavras vizinhas invertidas: um erro');
ok(volta(sitio, 'no hoy sitio') === 'quase', 'o erro que cai num advérbio de tempo (sem o funil)');
ok(ida(sitio, 'há não lugar') === 'quase', 'palavras invertidas, em português');

/* ── regra 2: até 20% das letras ── */
const mariposa = palavra('la mariposa', 'a borboleta');       // 9 letras em português: 1 erro só
ok(ida(mariposa, 'borbolwta') === 'quase', '1 erro em 9 letras');
ok(ida(mariposa, 'borbolwtq') === 'errado', '2 erros em 9 letras (22%): erro');
const desayuno = palavra('el desayuno', 'o café da manhã');      // «cafe da manha»: 11 letras
ok(ida(desayuno, 'cafw da manhq') === 'quase', '2 erros em 11 letras (18%)');
ok(ida(desayuno, 'cafw de manhq') === 'errado', '3 erros em 11 letras: erro');
const agua = frase('Necesito un poco de agua.', 'Preciso de um pouco de água.');   // 20 letras em espanhol
ok(volta(agua, 'necesito um poco de agua') === 'quase', '1 erro numa frase');
ok(volta(agua, 'necesto um pco de agua') === 'quase', '3 erros em 20 letras (15%)');
ok(volta(agua, 'necesto um pco de agwa') === 'quase', '4 erros em 20 letras (20%)');
ok(volta(agua, 'necesto um pco da agwa') === 'errado', '5 erros em 20 letras: erro');
ok(M.parecido('ab cd ef gh ij kl', 'cd ab ef gh ij kx', 'pt'), 'palavras invertidas e mais uma letra: 2 erros em 12 letras');

/* ── o que era erro seco agora passa pela régua ── */
const servilleta = palavra('la servilleta', 'o guardanapo');
ok(volta(servilleta, 'el servilleta') === 'quase', 'o artigo do outro gênero: pergunta, e não acerto');
ok(volta(servilleta, 'el servilleto') === 'quase', 'a palavra inteira no outro gênero: pergunta');
ok(volta(servilleta, 'servilleta') === 'certo', 'sem artigo continua certo');
const ano = palavra('el año', 'o ano');
ok(volta(ano, 'el ano') === 'quase', '«n» por «ñ»: um erro, pergunta');
const facil = palavra('fácil', 'fácil');
ok(volta(facil, 'facil') === 'certo', 'só o acento: continua certo, com aviso');
const apetece = frase('¿Te apetece un café?', 'Você está a fim de um café?');
ok(volta(apetece, 'te apeteces un cafe') === 'quase', 'o «-s» a mais no verbo: pergunta, e não acerto');
const dijo = frase('Él dijo la verdad.', 'Ele disse a verdade.',
  { formasEs: { 'Él dice la verdad': 'presente', 'Él dijo la verdad': 'pretérito' } });
ok(volta(dijo, 'el dice la verdad') === 'quase', 'outra forma do verbo, 2 erros em 12 letras (17%): pergunta');
const dijoSo = palavra('dijo', 'disse', { formasEs: { dice: 'presente', dijo: 'pretérito' } });
ok(volta(dijoSo, 'dice') === 'errado', 'outra forma do verbo, 2 erros em 4 letras: erro');
const hablan = frase('Ellos hablan mucho.', 'Eles falam muito.');
ok(volta(hablan, 'ellos hablamos mucho') === 'errado', 'outra pessoa do verbo, três letras em 16: erro');
ok(volta(hablan, 'ellos habla mucho') === 'quase', 'outra pessoa do verbo, uma letra: pergunta');

/* ── o latim: as mesmas palavras em outra ordem ── */
ok(M.parecidoDeFrase('a b c', 'c b a'), 'as mesmas palavras em qualquer ordem');
ok(!M.parecidoDeFrase('a b c', 'a b d'), 'uma palavra trocada não vale mais');

console.log(falhas ? falhas + ' de ' + feitos + ' falharam' : 'testar-quase: ' + feitos + ' conferências, tudo certo');
process.exit(falhas ? 1 : 0);
