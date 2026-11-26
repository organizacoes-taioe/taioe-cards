/* Confere as variantes de cada lugar (manual §5.4, pedido do Gere de 26/11/2026), com os cards
   de verdade (data/cards.json, depois do build):
     - a forma do card e as aceitas valem;
     - a irmã de outro lugar, com card próprio, é o «deu quase», e Motor.irmaDoCard diz onde ela
       se usa e onde se usa a forma do card;
     - a forma de outro lugar sem card próprio continua valendo, com o aviso de sempre;
     - no card de forma de todo lugar (sem «paises»), as formas regionais valem;
     - todo card com países tem a região e a região com a preposição; toda irmã cita de volta.

   uso: node fonte/testar-variantes.js */
const fs = require('fs');
const path = require('path');

const janela = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', 'motor.js'), 'utf8'))(janela);
const M = janela.Motor;
const bruto = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cards.json'), 'utf8'));
const cards = (Array.isArray(bruto) ? bruto : bruto.cards).filter(c => !c.idioma || c.idioma === 'es');
const porEs = new Map(cards.map(c => [c.es, c]));
M.usarBaralho('es', 'pt');

let falhas = 0, feitos = 0;
function ok(cond, nome) {
  feitos++;
  if (!cond) { falhas++; console.log('  ✗ ' + nome); }
}
const card = es => { const c = porEs.get(es); if (!c) throw new Error('sem card: ' + es); return c; };
const volta = (es, t) => M.conferir(card(es), t, 'pt-es');
const ida = (es, t) => M.conferir(card(es), t, 'es-pt');

/* a forma do card e a irmã */
ok(volta('el móvil', 'el móvil') === 'certo', 'móvil: a própria forma');
ok(volta('el móvil', 'el celular') === 'quase', 'móvil: a irmã é quase');
ok(volta('el celular', 'el móvil') === 'quase', 'celular: a irmã é quase');
ok(volta('el celular', 'el celular') === 'certo', 'celular: a própria forma');
ok(volta('el celular', 'celular') === 'certo', 'celular: sem artigo');
ok(ida('el celular', 'o celular') === 'certo', 'celular: a ida');
const i = M.irmaDoCard(card('el móvil'), 'el celular', 'pt-es');
ok(i && i.forma === 'el celular' && i.onde === 'na América Latina' && i.aqui === 'na Espanha', 'irmaDoCard diz os dois lugares');
ok(M.irmaDoCard(card('el móvil'), 'el celuar', 'pt-es'), 'irmã com erro de digitação');
ok(volta('el móvil', 'el celuar') === 'quase', 'irmã com erro de digitação é quase');
ok(!M.irmaDoCard(card('el móvil'), 'el movil', 'pt-es'), 'a própria forma sem acento não é irmã');
ok(!M.irmaDoCard(card('el móvil'), 'el celular', 'es-pt'), 'na ida não há irmã');

/* três irmãs: el coche, el carro, el auto */
ok(volta('el coche', 'el auto') === 'quase', 'coche: auto é quase');
ok(volta('el carro', 'el coche') === 'quase', 'carro: coche é quase');
ok(volta('el auto', 'el carro') === 'quase', 'auto: carro é quase');

/* a forma regional sem card continua valendo, com aviso */
ok(volta('la computadora', 'el computador') === 'certo', 'computadora: el computador (Colômbia e Chile) vale');
ok(M.regionalDoCard(card('la computadora'), 'el computador', 'pt-es'), 'computadora: aviso de el computador');
ok(volta('la computadora', 'el ordenador') === 'quase', 'computadora: el ordenador é quase');

/* o card de forma de todo lugar aceita as regionais, como antes */
ok(volta('el bolígrafo', 'la lapicera') === 'certo', 'bolígrafo: la lapicera vale');
ok(volta('el bolígrafo', 'la pluma') === 'certo', 'bolígrafo: la pluma vale');
ok(volta('la lapicera', 'el bolígrafo') !== 'certo', 'lapicera: el bolígrafo não é a forma pedida');
ok(M.sinonimoDoCard(card('la lapicera'), 'el bolígrafo', 'pt-es'), 'lapicera: el bolígrafo é sinônimo, com dica');
ok(volta('la lapicera', 'la pluma') === 'quase', 'lapicera: la pluma é quase');

/* as frases não mudaram: aceitam a variante como antes */
const frase = cards.find(c => c.tipo === 'frase' && (c.requerTodas || []).includes(card('el coche').id) && c.regionaisEs);
ok(!frase || Object.keys(frase.regionaisEs).some(f => M.conferir(frase, f, 'pt-es') === 'certo'), 'frase com coche aceita a variante');

/* a ficha */
const comPaises = cards.filter(c => Array.isArray(c.paises));
for (const c of comPaises) {
  ok(typeof c.regiao === 'string' && c.regiao, c.id + ' sem região');
  ok(/^(na|no|em) /.test(c.ondeRegiao || ''), c.id + ' sem a região com preposição');
  for (const f of c.irmaos || []) {
    const o = porEs.get(f);
    ok(o && (o.irmaos || []).includes(c.es), c.id + ': a irmã ' + f + ' não cita de volta');
    ok(o && o.pt.split(' / ').some(x => c.pt.split(' / ').includes(x)), c.id + ': a irmã ' + f + ' não divide uma tradução');
  }
}
ok(comPaises.length >= 120, 'cards com países: ' + comPaises.length);

console.log((falhas ? '✗ ' + falhas + ' de ' : 'ok: ') + feitos + ' conferências das variantes de cada lugar');
process.exit(falhas ? 1 : 0);
