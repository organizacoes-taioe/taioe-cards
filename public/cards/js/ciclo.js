/* ciclo.js — todas as línguas num fluxo só (pedido do Gere, 23/11/2026).

   A referência é uma rodada de 25 respostas: cada 4% valem 1 card. Uma língua por vez, na ordem
   dos cursos, e o ciclo recomeça. Em 0% a língua fica pausada.

   Divisão por igual: em vez de revezar o card que sobraria, o ciclo cresce até o múltiplo do
   número de línguas (2 → 26, 3 → 27, 4 → 28, 5 → 25, 6 → 30).

   Só contas, sem tela nem rede: o app guarda o resultado, e fonte/testar-ciclo.js confere.
     proporção: { igual: bool, cotas: { curso: cards por ciclo } }
     posição:   { curso, feitos } */
(function (raiz) {
  'use strict';
  var BASE = 25;

  function ativos(p, ordem) {
    return ordem.filter(function (k) { return ((p && p.cotas) || {})[k] > 0; });
  }
  function total(p, ordem) {
    return ordem.reduce(function (s, k) { return s + (((p && p.cotas) || {})[k] || 0); }, 0);
  }

  /* por igual: o menor múltiplo do número de línguas que alcança a base */
  function iguais(cursos) {
    var cotas = {};
    if (!cursos.length) return { igual: true, cotas: cotas };
    var cada = Math.ceil(BASE / cursos.length);
    cursos.forEach(function (k) { cotas[k] = cada; });
    return { igual: true, cotas: cotas };
  }

  /* leva as cotas a somar 25, pelos maiores restos, sem zerar quem está ligado */
  function escalar(cotas, ordem) {
    var ligados = ordem.filter(function (k) { return cotas[k] > 0; });
    var soma = ligados.reduce(function (s, k) { return s + cotas[k]; }, 0);
    var novas = {};
    if (!soma) return novas;
    var partes = ligados.map(function (k, i) {
      var exata = cotas[k] * BASE / soma;
      novas[k] = Math.max(1, Math.floor(exata));
      return { k: k, resto: exata - Math.floor(exata), i: i };
    });
    var falta = BASE - ligados.reduce(function (s, k) { return s + novas[k]; }, 0);
    partes.sort(function (a, b) { return b.resto - a.resto || a.i - b.i; });
    for (var n = 0; falta > 0; n++, falta--) novas[partes[n % partes.length].k]++;
    /* o piso de 1 pode ter passado da soma: tira de quem tem mais */
    while (falta < 0) {
      var maior = ligados.reduce(function (a, k) { return novas[k] > novas[a] ? k : a; }, ligados[0]);
      novas[maior]--;
      falta++;
    }
    return novas;
  }

  /* o que veio guardado, conferido contra os cursos que existem; sem nada ligado, null */
  function limpar(p, ordem) {
    if (!p || typeof p.cotas !== 'object' || !p.cotas) return null;
    var cotas = {};
    ordem.forEach(function (k) {
      var n = p.cotas[k];
      if (Number.isInteger(n) && n > 0) cotas[k] = n;
    });
    var ligados = ordem.filter(function (k) { return cotas[k] > 0; });
    if (!ligados.length) return null;
    if (p.igual) return iguais(ligados);
    if (total({ cotas: cotas }, ordem) === BASE) return { igual: false, cotas: cotas };
    return { igual: false, cotas: escalar(cotas, ordem) };
  }

  /* a mesma proporção somando 25, para mexer de card em card */
  function naBase(p, ordem) {
    var ligados = ativos(p, ordem), cotas = {};
    if (!p.igual) { ligados.forEach(function (k) { cotas[k] = p.cotas[k]; }); return cotas; }
    var cada = Math.floor(BASE / ligados.length), sobra = BASE - cada * ligados.length;
    ligados.forEach(function (k, i) { cotas[k] = cada + (i < sobra ? 1 : 0); });
    return cotas;
  }

  /* a outra língua que paga ou recebe o card: a de maior cota */
  function maiorOutra(cotas, ordem, curso) {
    var achada = null;
    ordem.forEach(function (k) {
      if (k !== curso && cotas[k] > 0 && (achada === null || cotas[k] >= cotas[achada])) achada = k;
    });
    return achada;
  }

  /* +1 ou -1 card (4%) nesta língua, sempre somando 25 */
  function ajustar(p, ordem, curso, delta) {
    var cotas = naBase(p, ordem), outra = maiorOutra(cotas, ordem, curso);
    if (outra === null) return p;
    if (delta < 0 && !(cotas[curso] > 0)) return p;
    cotas[curso] = (cotas[curso] || 0) + (delta > 0 ? 1 : -1);
    cotas[outra] += delta > 0 ? -1 : 1;
    if (!cotas[curso]) delete cotas[curso];
    if (!cotas[outra]) delete cotas[outra];
    return { igual: false, cotas: cotas };
  }

  /* 0%: a parte dela se divide entre as outras; a última ligada não pausa */
  function pausar(p, ordem, curso) {
    var resto = ativos(p, ordem).filter(function (k) { return k !== curso; });
    if (!resto.length) return p;
    if (p.igual) return iguais(resto);
    var cotas = {};
    resto.forEach(function (k) { cotas[k] = p.cotas[k]; });
    return { igual: false, cotas: escalar(cotas, ordem) };
  }

  function percentual(p, ordem, curso) {
    var t = total(p, ordem);
    return t ? Math.round(100 * ((p.cotas[curso] || 0) / t)) : 0;
  }

  function seguinte(lig, curso, ordem) {
    var i = ordem.indexOf(curso);
    for (var n = 1; n <= ordem.length; n++) {
      var k = ordem[(i + n + ordem.length) % ordem.length];
      if (lig.indexOf(k) >= 0) return k;
    }
    return lig[0];
  }

  /* onde o ciclo está: bloco terminado ou língua pausada passam à próxima ligada */
  function resolver(p, ordem, pos) {
    var lig = ativos(p, ordem);
    if (!lig.length) return null;
    if (!pos || ordem.indexOf(pos.curso) < 0) return { curso: lig[0], feitos: 0 };
    if (lig.indexOf(pos.curso) < 0) return { curso: seguinte(lig, pos.curso, ordem), feitos: 0 };
    var feitos = Number.isInteger(pos.feitos) && pos.feitos > 0 ? pos.feitos : 0;
    if (feitos >= p.cotas[pos.curso]) return { curso: seguinte(lig, pos.curso, ordem), feitos: 0 };
    return { curso: pos.curso, feitos: feitos };
  }

  /* uma resposta dada nesta língua. Fora do bloco da vez (não deveria acontecer), não conta */
  function contar(p, ordem, pos, curso) {
    var r = resolver(p, ordem, pos);
    if (!r || r.curso !== curso) return r;
    return resolver(p, ordem, { curso: r.curso, feitos: r.feitos + 1 });
  }

  /* pula o bloco desta língua (ela não tem card nenhum para dar agora) */
  function pular(p, ordem, curso) {
    var lig = ativos(p, ordem);
    return lig.length ? { curso: seguinte(lig, curso, ordem), feitos: 0 } : null;
  }

  /* entre dois aparelhos, cada metade vale pela data dela */
  function maisNovo(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return String(b.em || '') > String(a.em || '') ? b : a;
  }
  function mesclar(a, b) {
    a = a || {}; b = b || {};
    return { proporcao: maisNovo(a.proporcao, b.proporcao), posicao: maisNovo(a.posicao, b.posicao) };
  }

  var api = {
    BASE: BASE, ativos: ativos, total: total, iguais: iguais, limpar: limpar, ajustar: ajustar,
    pausar: pausar, percentual: percentual, resolver: resolver, contar: contar, pular: pular,
    mesclar: mesclar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.TaioeCiclo = api;
})(typeof window !== 'undefined' ? window : this);
