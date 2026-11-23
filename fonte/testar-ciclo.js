#!/usr/bin/env node
/* testar-ciclo.js — confere o fluxo único das línguas (public/cards/js/ciclo.js). */
'use strict';
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'public', 'cards', 'js', 'ciclo.js'));

const ORDEM = ['es-pt', 'en-pt', 'fr-pt', 'it-pt', 'la-pt', 'pc-pt'];
const percorrer = (p, n) => {
  let pos = null;
  const saida = [];
  for (let i = 0; i < n; i++) {
    const r = C.resolver(p, ORDEM, pos);
    saida.push(r.curso);
    pos = C.contar(p, ORDEM, r, r.curso);
  }
  return saida;
};

/* por igual: o múltiplo do número de línguas */
[[1, 25], [2, 26], [3, 27], [4, 28], [5, 25], [6, 30]].forEach(([n, ciclo]) => {
  const p = C.iguais(ORDEM.slice(0, n));
  assert.strictEqual(C.total(p, ORDEM), ciclo, n + ' línguas');
  assert.strictEqual(new Set(Object.values(p.cotas)).size, 1, n + ' línguas, cotas iguais');
});

/* o exemplo do pedido: 60/20/20 = 15, 5 e 5, uma língua por vez, e recomeça */
const ex = { igual: false, cotas: { 'es-pt': 15, 'la-pt': 5, 'pc-pt': 5 } };
const esperado = [...Array(15).fill('es-pt'), ...Array(5).fill('la-pt'), ...Array(5).fill('pc-pt')];
assert.deepStrictEqual(percorrer(ex, 50), [...esperado, ...esperado]);
assert.strictEqual(C.percentual(ex, ORDEM, 'es-pt'), 60);

/* regular: de 1 em 1 card, sempre somando 25, e a língua em zero fica de fora */
let p = C.iguais(['es-pt', 'la-pt', 'pc-pt']);
p = C.ajustar(p, ORDEM, 'es-pt', 1);
assert.strictEqual(C.total(p, ORDEM), 25);
assert.strictEqual(p.igual, false);
for (let i = 0; i < 60; i++) {
  p = C.ajustar(p, ORDEM, 'es-pt', 1);
  assert.strictEqual(C.total(p, ORDEM), 25);
}
assert.strictEqual(p.cotas['es-pt'], 25, 'chega a 100%');
assert.strictEqual(C.ajustar(p, ORDEM, 'es-pt', 1), p, 'sem outra língua, não muda');
assert.strictEqual(C.ajustar(p, ORDEM, 'es-pt', -1), p, 'a única ligada não baixa');
p = C.ajustar(p, ORDEM, 'fr-pt', 1);
assert.deepStrictEqual(p.cotas, { 'es-pt': 24, 'fr-pt': 1 }, 'a pausada volta com 4%');

/* pausar */
const tres = C.iguais(['es-pt', 'la-pt', 'pc-pt']);
assert.deepStrictEqual(C.pausar(tres, ORDEM, 'la-pt').cotas, { 'es-pt': 13, 'pc-pt': 13 }, 'por igual continua');
const pausada = C.pausar(ex, ORDEM, 'es-pt');
assert.strictEqual(C.total(pausada, ORDEM), 25);
assert.ok(!pausada.cotas['es-pt']);
const so = C.iguais(['es-pt']);
assert.strictEqual(C.pausar(so, ORDEM, 'es-pt'), so, 'a última não pausa');

/* a posição sobrevive a mudanças da proporção */
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'fr-pt', feitos: 3 }), { curso: 'la-pt', feitos: 0 }, 'pausada passa à próxima');
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'la-pt', feitos: 9 }), { curso: 'pc-pt', feitos: 0 }, 'cota menor fecha o bloco');
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'pc-pt', feitos: 5 }), { curso: 'es-pt', feitos: 0 }, 'o último volta ao primeiro');
assert.deepStrictEqual(C.contar(ex, ORDEM, { curso: 'es-pt', feitos: 2 }, 'la-pt'), { curso: 'es-pt', feitos: 2 }, 'fora do bloco não conta');
assert.deepStrictEqual(C.pular(ex, ORDEM, 'la-pt'), { curso: 'pc-pt', feitos: 0 });

/* o que vem guardado */
assert.strictEqual(C.limpar(null, ORDEM), null);
assert.strictEqual(C.limpar({ cotas: { xx: 5 } }, ORDEM), null);
assert.strictEqual(C.total(C.limpar({ igual: false, cotas: { 'es-pt': 10, 'la-pt': 5 } }, ORDEM), ORDEM), 25);
assert.strictEqual(C.total(C.limpar({ igual: true, cotas: { 'es-pt': 1, 'la-pt': 1, 'fr-pt': 1 } }, ORDEM), ORDEM), 27);

/* dois aparelhos: cada metade pela data dela */
const m = C.mesclar(
  { proporcao: { em: '2026-11-23T10:00:00.000Z', v: 'a' }, posicao: { em: '2026-11-23T12:00:00.000Z', v: 'a' } },
  { proporcao: { em: '2026-11-23T11:00:00.000Z', v: 'b' }, posicao: { em: '2026-11-23T09:00:00.000Z', v: 'b' } });
assert.strictEqual(m.proporcao.v, 'b');
assert.strictEqual(m.posicao.v, 'a');

console.log('ciclo: tudo certo');
