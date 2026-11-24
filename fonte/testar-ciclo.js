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

/* a primeira vez: as línguas já começadas dividem 25 por igual, e as outras ficam em 0 */
[[1, 25], [2, 26], [3, 27], [4, 28], [5, 25], [6, 30]].forEach(([n, ciclo]) => {
  const p = C.inicial(ORDEM.slice(0, n));
  assert.strictEqual(C.total(p, ORDEM), ciclo, n + ' línguas');
  assert.strictEqual(C.ativos(p, ORDEM).length, n, n + ' línguas, as outras em 0');
});

/* o ciclo é a soma, uma língua por vez, e recomeça */
const ex = { cotas: { 'es-pt': 15, 'la-pt': 5, 'pc-pt': 5 }, antes: {} };
const esperado = [...Array(15).fill('es-pt'), ...Array(5).fill('la-pt'), ...Array(5).fill('pc-pt')];
assert.deepStrictEqual(percorrer(ex, 50), [...esperado, ...esperado]);
assert.strictEqual(C.percentual(ex, ORDEM, 'es-pt'), 60);

/* mexer numa língua não mexe nas outras; o total é a soma */
let p = C.ajustar(ex, ORDEM, 'es-pt', 1);
assert.deepStrictEqual(p.cotas, { 'es-pt': 16, 'la-pt': 5, 'pc-pt': 5 });
assert.strictEqual(C.total(p, ORDEM), 26);
assert.strictEqual(C.percentual(p, ORDEM, 'la-pt'), 19);
p = C.definir(p, ORDEM, 'la-pt', 30);
assert.strictEqual(C.total(p, ORDEM), 51);
assert.strictEqual(C.definir(p, ORDEM, 'la-pt', 500).cotas['la-pt'], C.MAX, 'teto de 99');
assert.strictEqual(C.definir(p, ORDEM, 'la-pt', 2.6).cotas['la-pt'], 3, 'número digitado arredonda');
assert.strictEqual(C.definir(p, ORDEM, 'xx-pt', 3), p, 'curso que não existe não entra');

/* a ordem da página: maior quantidade primeiro, e muda com o clique */
assert.deepStrictEqual(C.ordenada(ex, ORDEM), ['es-pt', 'la-pt', 'pc-pt', 'en-pt', 'fr-pt', 'it-pt']);
let q = C.definir(ex, ORDEM, 'pc-pt', 6);
assert.deepStrictEqual(C.ordenada(q, ORDEM).slice(0, 3), ['es-pt', 'pc-pt', 'la-pt'], 'o clique troca a ordem');

/* pausar e retomar: 0 guarda o que tinha; a que nunca entrou volta com 1 */
q = C.pausar(ex, ORDEM, 'la-pt');
assert.deepStrictEqual(q.cotas, { 'es-pt': 15, 'pc-pt': 5 }, 'as outras não mudam');
assert.strictEqual(q.antes['la-pt'], 5);
assert.deepStrictEqual(C.retomar(q, ORDEM, 'la-pt').cotas, ex.cotas, 'volta com 5');
assert.strictEqual(C.retomar(q, ORDEM, 'fr-pt').cotas['fr-pt'], 1, 'nunca usada volta com 1');
assert.strictEqual(C.ajustar(q, ORDEM, 'fr-pt', 1).cotas['fr-pt'], 1, 'o + numa língua em 0 dá 1');
assert.strictEqual(C.ajustar(ex, ORDEM, 'fr-pt', -1), ex, 'abaixo de 0 não vai');
const so = C.inicial(['es-pt']);
assert.strictEqual(C.pausar(so, ORDEM, 'es-pt'), so, 'a última ligada não pausa');
assert.strictEqual(C.definir(so, ORDEM, 'es-pt', 0), so, 'nem digitando 0');
assert.strictEqual(C.ajustar(C.definir(so, ORDEM, 'es-pt', 1), ORDEM, 'es-pt', -1).cotas['es-pt'], 1);

/* a posição sobrevive a mudanças da proporção */
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'fr-pt', feitos: 3 }), { curso: 'la-pt', feitos: 0 }, 'pausada passa à próxima');
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'la-pt', feitos: 9 }), { curso: 'pc-pt', feitos: 0 }, 'cota menor fecha o bloco');
assert.deepStrictEqual(C.resolver(ex, ORDEM, { curso: 'pc-pt', feitos: 5 }), { curso: 'es-pt', feitos: 0 }, 'o último volta ao primeiro');
assert.deepStrictEqual(C.contar(ex, ORDEM, { curso: 'es-pt', feitos: 2 }, 'la-pt'), { curso: 'es-pt', feitos: 2 }, 'fora do bloco não conta');
assert.deepStrictEqual(C.pular(ex, ORDEM, 'la-pt'), { curso: 'pc-pt', feitos: 0 });

/* o que vem guardado, também no formato de 23/11 */
assert.strictEqual(C.limpar(null, ORDEM), null);
assert.strictEqual(C.limpar({ cotas: { xx: 5 } }, ORDEM), null);
assert.deepStrictEqual(C.limpar({ igual: false, cotas: { 'es-pt': 15, 'la-pt': 5, 'pc-pt': 5 } }, ORDEM).cotas, ex.cotas, 'os números de antes ficam');
assert.deepStrictEqual(C.limpar({ igual: true, cotas: { 'es-pt': 9, 'la-pt': 9, 'fr-pt': 9 } }, ORDEM).cotas, { 'es-pt': 9, 'fr-pt': 9, 'la-pt': 9 });
assert.deepStrictEqual(C.limpar({ cotas: { 'es-pt': 4 }, antes: { 'la-pt': 7, 'es-pt': 3, xx: 2 } }, ORDEM).antes, { 'la-pt': 7 }, 'antes só de pausada');
assert.strictEqual(C.limpar({ cotas: { 'es-pt': 140 } }, ORDEM).cotas['es-pt'], C.MAX);

/* dois aparelhos: cada metade pela data dela */
const m = C.mesclar(
  { proporcao: { em: '2026-11-23T10:00:00.000Z', v: 'a' }, posicao: { em: '2026-11-23T12:00:00.000Z', v: 'a' } },
  { proporcao: { em: '2026-11-23T11:00:00.000Z', v: 'b' }, posicao: { em: '2026-11-23T09:00:00.000Z', v: 'b' } });
assert.strictEqual(m.proporcao.v, 'b');
assert.strictEqual(m.posicao.v, 'a');

console.log('ciclo: tudo certo');
